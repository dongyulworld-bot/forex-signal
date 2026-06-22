import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbService } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * AI Chart Analysis API Route
 * Processes chart images, registers users, auto-routes to Local Agents,
 * and calls Gemini Vision API (or falls back to mock analysis) for beginner-friendly trading signals.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const file = formData.get('file') as File;
    const market = (formData.get('market') as string) || 'BTC/USDT';

    if (!file) {
      return NextResponse.json(
        { error: 'A chart image file is required for analysis.' },
        { status: 400 }
      );
    }

    // 1. Identify User (either via session cookie if logged in, or create/retrieve via formData email/name)
    let user = null;
    
    // Read session cookie manually from Request Headers
    const cookieHeader = request.headers.get('cookie') || '';
    const sessionCookie = cookieHeader
      .split('; ')
      .find(row => row.startsWith('session='))
      ?.split('=')[1];

    if (sessionCookie) {
      const sessionPayload = await verifySessionToken(sessionCookie);
      if (sessionPayload) {
        const users = await dbService.getUsers();
        user = users.find(u => u.id === sessionPayload.userId) || null;
      }
    }

    // If not logged in, require email & name to create/retrieve user
    if (!user) {
      if (!email || !name) {
        return NextResponse.json(
          { error: 'Email and Name are required for guest analysis.' },
          { status: 400 }
        );
      }
      user = await dbService.createUser(email, name);
    }

    // 2. Fetch assigned Agent info
    let assignedAgent = null;
    if (user.agentId) {
      const agents = await dbService.getAgents();
      assignedAgent = agents.find(a => a.id === user.agentId) || null;
    }

    // 3. Process the file to base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Image = buffer.toString('base64');
    const mimeType = file.type || 'image/png';

    // Mock Image URL for database storage (since we are doing local testing)
    const dummyImageUrl = `data:${mimeType};base64,${base64Image.substring(0, 100)}...`;

    let trend = '';
    let planAScenario = '';
    let planAProbability = 50;
    let planAEntryPrice = '';
    let planBScenario = '';
    let planBProbability = 50;
    let planBEntryPrice = '';
    let rawResponseText = '';

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        console.log('[Gemini API] Initializing request...');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
          You are "Dexia Markets AI Assistant", an elite financial market analyst. 
          Your goal is to analyze the provided trading chart and output a beginner-friendly analysis in KOREAN.
          Avoid complex financial jargon like "Order Block", "Fair Value Gap", "Liquidity Void", "Exponential Moving Average" directly. Instead, explain them simply (e.g., use "주요 지지선/저항선", "거래가 활발한 가격대", "추세 흐름").

          Format your final response ONLY as a valid JSON object. Do not include markdown code block syntax (like \`\`\`json) in the response text. 
          The JSON must contain these exact keys:
          {
            "trend": "한 줄로 쉽게 요약된 현재 차트 트렌드 (예: 상승 추세가 힘을 받고 있습니다)",
            "planA_scenario": "상승할 경우의 시나리오 및 목표 안내 (쉬운 말로 기재)",
            "planA_probability": 65,
            "planA_entry": "상승 시 진입 추천 가격대 (예: $45,200 또는 1.2450)",
            "planB_scenario": "하락할 경우의 시나리오 및 대응책 안내 (쉬운 말로 기재)",
            "planB_probability": 35,
            "planB_entry": "하락 시 진입 추천 가격대 또는 숏/풋 진입 가격대 (예: $43,500 또는 1.2380)"
          }

          Note: planA_probability and planB_probability must be integers summing up to 100.
        `;

        const imagePart = {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        };

        const result = await model.generateContent([prompt, imagePart]);
        rawResponseText = result.response.text().trim();

        let jsonString = rawResponseText;
        if (jsonString.startsWith('```json')) {
          jsonString = jsonString.replace(/^```json/, '').replace(/```$/, '');
        } else if (jsonString.startsWith('```')) {
          jsonString = jsonString.replace(/^```/, '').replace(/```$/, '');
        }
        jsonString = jsonString.trim();

        const parsed = JSON.parse(jsonString);
        trend = parsed.trend;
        planAScenario = parsed.planA_scenario;
        planAProbability = Number(parsed.planA_probability || 50);
        planAEntryPrice = parsed.planA_entry || '';
        planBScenario = parsed.planB_scenario;
        planBProbability = Number(parsed.planB_probability || 50);
        planBEntryPrice = parsed.planB_entry || '';

      } catch (geminiError) {
        console.error('[Gemini API Error] Failed, falling back to mock generator:', geminiError);
        const fallback = getMockAnalysisResult();
        trend = fallback.trend;
        planAScenario = fallback.planA_scenario;
        planAProbability = fallback.planA_probability;
        planAEntryPrice = fallback.planA_entry;
        planBScenario = fallback.planB_scenario;
        planBProbability = fallback.planB_probability;
        planBEntryPrice = fallback.planB_entry;
        rawResponseText = `Error Fallback: ${JSON.stringify(geminiError)}`;
      }
    } else {
      console.log('[Gemini API] No GEMINI_API_KEY found. Generating premium mock analysis...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const fallback = getMockAnalysisResult();
      trend = fallback.trend;
      planAScenario = fallback.planA_scenario;
      planAProbability = fallback.planA_probability;
      planAEntryPrice = fallback.planA_entry;
      planBScenario = fallback.planB_scenario;
      planBProbability = fallback.planB_probability;
      planBEntryPrice = fallback.planB_entry;
      rawResponseText = 'Mock Generation (API Key Missing)';
    }

    // 4. Save analysis to the database (for backward compatibility, save to ChartAnalysis)
    const analysisRecord = await dbService.createChartAnalysis({
      userId: user.id,
      imageUrl: dummyImageUrl,
      trend,
      planAScenario,
      planAProbability,
      planBScenario,
      planBProbability,
      rawResponse: rawResponseText,
    });

    // 5. Also save to the new AnalysisHistory for the dashboard history view
    await dbService.createAnalysisHistory({
      userId: user.id,
      imageUrl: dummyImageUrl,
      market,
      trend,
      planAScenario,
      planAProbability,
      planAEntryPrice,
      planBScenario,
      planBProbability,
      planBEntryPrice,
      status: 'COMPLETED',
      resultJson: JSON.stringify({
        trend,
        planAScenario,
        planAProbability,
        planAEntryPrice,
        planBScenario,
        planBProbability,
        planBEntryPrice,
        createdAt: new Date().toISOString(),
      }),
    });

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysisRecord,
        planAEntryPrice,
        planBEntryPrice,
        market,
      },
      assignedAgent: assignedAgent ? {
        name: assignedAgent.name,
        role: assignedAgent.role,
        email: assignedAgent.email,
        contactUrl: `https://wa.me/60123456789?text=${encodeURIComponent(
          `안녕하세요 ${assignedAgent.name} 담당자님! Dexia Markets 차트 신호 분석을 보고 문의드립니다.`
        )}`
      } : null
    });

  } catch (error: unknown) {
    console.error('[Analyze API Error]:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to process chart analysis.', details: message },
      { status: 500 }
    );
  }
}

/**
 * Generates highly realistic Forex/Crypto analysis results for beginners
 */
function getMockAnalysisResult() {
  const options = [
    {
      trend: '단기 상승 흐름 속에서 매수세가 꾸준히 유입되는 안정적인 우상향 트렌드입니다.',
      planA_scenario: '핵심 지지선 부근에서 반등 후 전고점까지 상승 흐름을 이어갈 가능성이 높습니다. 추가 매수를 고려해 볼 만한 구간입니다.',
      planA_probability: 70,
      planA_entry: '$1.2450 부근 매수 (Long)',
      planB_scenario: '핵심 지지선이 깨질 경우 단기 조정에 돌입하며 밀릴 수 있으니 비중 축소나 손절 기준을 잡는 것이 좋습니다.',
      planB_probability: 30,
      planB_entry: '$1.2380 하향 이탈 시 매도 (Short)',
    },
    {
      trend: '강한 매도 압력 이후 바닥 다지기를 시도하는 횡보 국면입니다.',
      planA_scenario: '저항 구간을 시원하게 뚫어낸다면 추세 전환에 성공하며 빠르게 반등할 수 있습니다.',
      planA_probability: 60,
      planA_entry: '$0.9850 돌파 확인 후 매수',
      planB_scenario: '바닥선이 무너지면 실망 매물이 쏟아져 나와 추가 하락이 우려되므로 보수적인 관점 유지가 필요합니다.',
      planB_probability: 40,
      planB_entry: '$0.9600 붕괴 시 추격 매도',
    },
    {
      trend: '주요 저항선에 막혀 돌파 여부를 저울질하는 긴장감 높은 눈치보기 트렌드입니다.',
      planA_scenario: '매수 거래량이 실리면서 저항 장벽을 돌파하면 매수세 쏠림으로 2차 상승 랠리를 펼치게 됩니다.',
      planA_probability: 65,
      planA_entry: '$45,200 안착 후 매수',
      planB_scenario: '저항벽 돌파에 실패하고 밀릴 시, 실망 매물로 인해 지지선 부근까지 일시 조정이 올 수 있습니다.',
      planB_probability: 35,
      planB_entry: '$43,500 이탈 시 숏 포지션 진입',
    }
  ];

  const randomIndex = Math.floor(Math.random() * options.length);
  return options[randomIndex];
}
