import { createClient } from '@supabase/supabase-js';
import path from 'path';

// Types matching the Prisma Schema
export interface Agent {
  id: string;
  email: string;
  name: string;
  role: 'GLOBAL_SALES_HEAD' | 'REGIONAL_MANAGER' | 'BRANCH_MANAGER' | 'TEAM_LEADER' | 'LOCAL_AGENT';
  parentId: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  password?: string | null;
  agentId: string | null;
  tier: string;
  dailyScanCount: number;
  lastScanDate: string | null;
  createdAt: string;
}

export interface ChartAnalysis {
  id: string;
  userId: string;
  imageUrl: string;
  trend: string;
  planAScenario: string;
  planAProbability: number;
  planBScenario: string;
  planBProbability: number;
  rawResponse: string | null;
  createdAt: string;
}

export interface AnalysisHistory {
  id: string;
  userId: string;
  imageUrl: string;
  market: string;
  trend: string;
  planAScenario: string;
  planAProbability: number;
  planAEntryPrice: string;
  planBScenario: string;
  planBProbability: number;
  planBEntryPrice: string;
  status: string;
  resultJson: string | null;
  createdAt: string;
}



export interface PaymentTransaction {
  id: string;
  userId: string;
  planName: string;
  amount: number;
  txId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

// ── In-Memory DB (always available as fallback) ──────────────────────────────

type MockDb = {
  agents: Agent[];
  users: User[];
  analyses: ChartAnalysis[];
  analysisHistories: AnalysisHistory[];
  paymentTransactions: PaymentTransaction[];
  superAdminEmail?: string;
};

const mockDb: MockDb = {
  agents: [],
  users: [],
  analyses: [],
  analysisHistories: [],
  paymentTransactions: [],
  superAdminEmail: 'dongyulworld@gmail.com',
};

let mockDbInitialized = false;

const DB_FILE = path.join(process.cwd(), 'db_fallback.json');

function seedAgents(): Agent[] {
  return [
    { id: 'agent-global',   email: 'global@dexia.com',   name: '김동현 (Global Head)',       role: 'GLOBAL_SALES_HEAD', parentId: null,            createdAt: new Date().toISOString() },
    { id: 'agent-regional', email: 'regional@dexia.com', name: '박준서 (Regional Manager)',   role: 'REGIONAL_MANAGER',  parentId: 'agent-global',  createdAt: new Date().toISOString() },
    { id: 'agent-branch',   email: 'branch@dexia.com',   name: '이민아 (Branch Manager)',     role: 'BRANCH_MANAGER',    parentId: 'agent-regional', createdAt: new Date().toISOString() },
    { id: 'agent-leader',   email: 'leader@dexia.com',   name: '최재영 (Team Leader)',        role: 'TEAM_LEADER',       parentId: 'agent-branch',  createdAt: new Date().toISOString() },
    { id: 'agent-local-1',  email: 'agent1@dexia.com',   name: '정지원 (Local Agent A)',      role: 'LOCAL_AGENT',       parentId: 'agent-leader',  createdAt: new Date().toISOString() },
    { id: 'agent-local-2',  email: 'agent2@dexia.com',   name: '한소희 (Local Agent B)',      role: 'LOCAL_AGENT',       parentId: 'agent-leader',  createdAt: new Date().toISOString() },
  ];
}

/**
 * Load the local JSON file-based DB into mockDb. Only runs once per process.
 */
function initMockDb() {
  if (mockDbInitialized) return;
  mockDbInitialized = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const data = JSON.parse(raw) as MockDb;
      mockDb.agents           = data.agents           || [];
      mockDb.users            = data.users            || [];
      mockDb.analyses         = data.analyses         || [];
      mockDb.analysisHistories = data.analysisHistories || [];
      mockDb.paymentTransactions = data.paymentTransactions || [];
      mockDb.superAdminEmail  = data.superAdminEmail  || 'dongyulworld@gmail.com';
    }
  } catch (e) {
    console.warn('[MockDB] Could not read db_fallback.json, starting fresh.', e);
  }

  // Seed agents if missing
  if (mockDb.agents.length === 0) {
    mockDb.agents = seedAgents();
    saveMockDb();
  }
}

function saveMockDb() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    fs.writeFileSync(DB_FILE, JSON.stringify(mockDb, null, 2), 'utf8');
  } catch (e) {
    console.warn('[MockDB] Could not write db_fallback.json:', e);
  }
}

// ── Supabase (optional, used only when reachable) ─────────────────────────────

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// We create the Supabase client only when creds are present.
// Actual connectivity is checked lazily per-request.
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(4000) }) },
    })
  : null;

/**
 * Generic wrapper: try Supabase, fall back to mockDb on any error.
 * We use PromiseLike to accept Supabase's PostgrestFilterBuilder.
 */
async function trySupabase<T>(
  supabaseFn: () => PromiseLike<{ data: T | null; error: unknown }>,
  fallback: () => T,
): Promise<T> {
  initMockDb();
  if (!supabase) return fallback();
  try {
    const { data, error } = await supabaseFn();
    if (error || data === null) {
      return fallback();
    }
    return data;
  } catch {
    // Network errors (ENOTFOUND, timeout, etc.) – fall through silently
    return fallback();
  }
}

// ── Public DB Service ─────────────────────────────────────────────────────────

export const dbService = {
  /** Expose init for external callers that want to pre-warm. */
  async init() {
    initMockDb();
  },

  // ── Agents ──────────────────────────────────────────────────────────────────

  async getAgents(): Promise<Agent[]> {
    return trySupabase(
      () => supabase!.from('Agent').select('*'),
      () => mockDb.agents,
    );
  },

  async createAgent(agent: Omit<Agent, 'id' | 'createdAt'>): Promise<Agent> {
    const newAgent: Agent = {
      ...agent,
      id: `agent-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('Agent').insert([agent]).select().single();
        if (!error && data) return data as Agent;
      } catch { /* fall through */ }
    }

    initMockDb();
    mockDb.agents.push(newAgent);
    saveMockDb();
    return newAgent;
  },

  // ── Users ────────────────────────────────────────────────────────────────────

  async getUsers(): Promise<User[]> {
    return trySupabase(
      () => supabase!.from('User').select('*'),
      () => mockDb.users,
    );
  },

  async getUserByEmail(email: string): Promise<User | null> {
    initMockDb();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('User').select('*').eq('email', email).maybeSingle();
        if (!error && data) return data as User;
        if (!error && data === null) return null; // definitively not found
      } catch { /* fall through to mockDb */ }
    }
    return mockDb.users.find(u => u.email === email) || null;
  },

  async createUser(email: string, name: string, password?: string): Promise<User> {
    // Check for existing first
    const existing = await this.getUserByEmail(email);
    if (existing) return existing;

    // Assign to LOCAL_AGENT with fewest clients
    const agents = await this.getAgents();
    const localAgents = agents.filter(a => a.role === 'LOCAL_AGENT');
    let assignedAgentId: string | null = null;

    if (localAgents.length > 0) {
      const users = await this.getUsers();
      const agentCounts = localAgents.map(agent => ({
        id: agent.id,
        count: users.filter(u => u.agentId === agent.id).length,
      }));
      agentCounts.sort((a, b) => a.count - b.count);
      assignedAgentId = agentCounts[0].id;
    }

    const newUser: User = {
      id: `user-${Math.random().toString(36).substr(2, 9)}`,
      email,
      name,
      password: password || null,
      agentId: assignedAgentId,
      tier: 'FREE',
      dailyScanCount: 0,
      lastScanDate: null,
      createdAt: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('User')
          .insert([{ email, name, password: password || null, agentId: assignedAgentId }])
          .select()
          .single();
        if (!error && data) return data as User;
      } catch { /* fall through */ }
    }

    initMockDb();
    mockDb.users.push(newUser);
    saveMockDb();
    return newUser;
  },

  // ── Chart Analyses ───────────────────────────────────────────────────────────

  async getChartAnalyses(): Promise<ChartAnalysis[]> {
    return trySupabase(
      () => supabase!.from('ChartAnalysis').select('*').order('createdAt', { ascending: false }),
      () => [...mockDb.analyses].reverse(),
    );
  },

  async getChartAnalysesByAgent(agentId: string): Promise<ChartAnalysis[]> {
    const allAgents = await this.getAgents();

    const getSubordinateIds = (id: string): string[] => {
      const subs = allAgents.filter(a => a.parentId === id);
      return [id, ...subs.flatMap(sub => getSubordinateIds(sub.id))];
    };

    const agent = allAgents.find(a => a.id === agentId);
    if (!agent) return [];

    const targetAgentIds =
      agent.role === 'GLOBAL_SALES_HEAD'
        ? allAgents.map(a => a.id)
        : getSubordinateIds(agentId);

    const users = await this.getUsers();
    const assignedUserIds = users
      .filter(u => u.agentId && targetAgentIds.includes(u.agentId))
      .map(u => u.id);

    const analyses = await this.getChartAnalyses();
    return analyses.filter(a => assignedUserIds.includes(a.userId));
  },

  async createChartAnalysis(
    analysis: Omit<ChartAnalysis, 'id' | 'createdAt'>,
  ): Promise<ChartAnalysis> {
    const newAnalysis: ChartAnalysis = {
      ...analysis,
      id: `analysis-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('ChartAnalysis')
          .insert([analysis])
          .select()
          .single();
        if (!error && data) return data as ChartAnalysis;
      } catch { /* fall through */ }
    }

    initMockDb();
    mockDb.analyses.push(newAnalysis);
    saveMockDb();
    return newAnalysis;
  },

  // ── Analysis History ─────────────────────────────────────────────────────────

  async getAnalysisHistoriesByUser(userId: string): Promise<AnalysisHistory[]> {
    initMockDb();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('AnalysisHistory')
          .select('*')
          .eq('userId', userId)
          .order('createdAt', { ascending: false });
        if (!error && data) return data as AnalysisHistory[];
      } catch { /* fall through */ }
    }

    return mockDb.analysisHistories
      .filter(a => a.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createAnalysisHistory(
    analysis: Omit<AnalysisHistory, 'id' | 'createdAt'>,
  ): Promise<AnalysisHistory> {
    const newAnalysis: AnalysisHistory = {
      ...analysis,
      id: `history-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('AnalysisHistory')
          .insert([analysis])
          .select()
          .single();
        if (!error && data) return data as AnalysisHistory;
      } catch { /* fall through */ }
    }

    initMockDb();
    mockDb.analysisHistories.push(newAnalysis);
    saveMockDb();
    return newAnalysis;
  },

  // ── User Tier & Limit ────────────────────────────────────────────────────────

  async updateUserTier(userId: string, tier: string): Promise<User | null> {
    initMockDb();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('User')
          .update({ tier })
          .eq('id', userId)
          .select()
          .single();
        if (!error && data) return data as User;
      } catch { /* fall through */ }
    }

    const idx = mockDb.users.findIndex(u => u.id === userId);
    if (idx > -1) {
      mockDb.users[idx].tier = tier;
      saveMockDb();
      return mockDb.users[idx];
    }
    return null;
  },

  async incrementUserScanCount(userId: string): Promise<User | null> {
    initMockDb();
    const today = new Date().toISOString().split('T')[0];

    if (supabase) {
      try {
        // First get user
        const { data: user } = await supabase.from('User').select('*').eq('id', userId).single();
        if (user) {
          const isSameDay = user.lastScanDate && user.lastScanDate.startsWith(today);
          const newCount = isSameDay ? user.dailyScanCount + 1 : 1;
          const { data, error } = await supabase
            .from('User')
            .update({ dailyScanCount: newCount, lastScanDate: new Date().toISOString() })
            .eq('id', userId)
            .select()
            .single();
          if (!error && data) return data as User;
        }
      } catch { /* fall through */ }
    }

    const idx = mockDb.users.findIndex(u => u.id === userId);
    if (idx > -1) {
      const user = mockDb.users[idx];
      const isSameDay = user.lastScanDate && user.lastScanDate.startsWith(today);
      mockDb.users[idx].dailyScanCount = isSameDay ? user.dailyScanCount + 1 : 1;
      mockDb.users[idx].lastScanDate = new Date().toISOString();
      saveMockDb();
      return mockDb.users[idx];
    }
    return null;
  },

  async getSuperAdminEmail(): Promise<string> {
    initMockDb();
    return mockDb.superAdminEmail || 'dongyulworld@gmail.com';
  },

  async setSuperAdminEmail(email: string): Promise<string> {
    initMockDb();
    mockDb.superAdminEmail = email;
    saveMockDb();
    return email;
  },

  // ── Payment Transactions ──────────────────────────────────────────────────

  async createPaymentTransaction(data: { userId: string; planName: string; amount: number; txId: string }): Promise<PaymentTransaction> {
    const now = new Date().toISOString();
    const newTx: PaymentTransaction = {
      ...data,
      id: `pay-${Math.random().toString(36).substr(2, 9)}`,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };

    if (supabase) {
      try {
        const { data: result, error } = await supabase.from('PaymentTransaction').insert([newTx]).select().single();
        if (!error && result) return result as PaymentTransaction;
      } catch { /* fall through to mock db */ }
    }

    initMockDb();
    mockDb.paymentTransactions.push(newTx);
    saveMockDb();
    return newTx;
  },
};
