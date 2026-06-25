'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';

const USDT_WALLET_ADDRESS = 'Txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'; // Replace with actual TRC20 address

type Plan = {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
};

const plans: Plan[] = [
  {
    id: 'standard',
    name: 'Standard Plan',
    price: 10,
    description: 'Get 10 daily precision AI scans at a reasonable cost.',
    features: [
      '10 Daily AI Chart Precision Scans',
      'Real-time OANDA Price Feed Integration',
      'Unlimited Web Dashboard Access',
      'Standard Support',
      'Valid for 1 Month'
    ]
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    price: 20,
    description: '50 daily precision AI scans and VIP benefits.',
    features: [
      '50 Daily High-Precision AI Scans',
      '1:1 VIP Dedicated Mentor Support',
      'Real-time Market Risk Alerts',
      'Highest Priority AI Scan Queue',
      'Valid for 1 Month'
    ]
  }
];

export default function BillingPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txId, setTxId] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
    setTxId('');
    setIsCopied(false);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setSelectedPlan(null);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(USDT_WALLET_ADDRESS);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleSubmit = async () => {
    if (!txId.trim() || !selectedPlan) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          txId: txId.trim()
        })
      });

      if (!res.ok) {
        throw new Error('Payment submission failed');
      }

      setToast({ message: '입금 확인 중입니다. 최대 10분이 소요될 수 있습니다.', type: 'success' });
      setIsModalOpen(false);
      setTxId('');
    } catch (error) {
      console.error(error);
      setToast({ message: '오류가 발생했습니다. 다시 시도해주세요.', type: 'error' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-12 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-900/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-900/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-4">
            Upgrade Your Plan
          </h1>
          <p className="text-slate-400 text-lg">Choose the best plan that fits your trading journey.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-8 flex flex-col hover:border-cyan-500/50 transition-colors duration-300"
            >
              <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-slate-400 mb-6">{plan.description}</p>
              <div className="text-4xl font-extrabold text-cyan-400 mb-6">
                ${plan.price} <span className="text-sm text-slate-500 font-normal">USDT</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mr-3 shrink-0" />
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSelectPlan(plan)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-900/20 transition-all duration-300"
              >
                Select {plan.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {isModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={closeModal}
              disabled={isSubmitting}
              className="absolute top-4 right-4 text-slate-400 hover:text-white disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">USDT (TRC20) Payment</h2>
              <p className="text-slate-400">
                Please send exactly <span className="text-cyan-400 font-bold">${selectedPlan.price}</span> to the address below.
              </p>
            </div>

            <div className="flex justify-center mb-6 bg-white p-4 rounded-xl mx-auto w-max">
              <QRCodeSVG 
                value={USDT_WALLET_ADDRESS} 
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-400 mb-2">Wallet Address (TRC20)</label>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-3">
                <code className="text-cyan-300 text-sm truncate flex-1 mr-3">{USDT_WALLET_ADDRESS}</code>
                <button 
                  onClick={handleCopy}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-300 transition-colors"
                  title="Copy Address"
                >
                  {isCopied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-400 mb-2">Transaction ID (TxID)</label>
              <input
                type="text"
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                placeholder="Enter your transaction hash"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                disabled={isSubmitting}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!txId.trim() || isSubmitting}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold flex items-center justify-center transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                '결제 확인 요청 (Submit)'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center p-4 rounded-xl shadow-lg border ${
            toast.type === 'success' 
              ? 'bg-slate-900 border-cyan-500/50 text-cyan-50' 
              : 'bg-red-950/90 border-red-900 text-red-100'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-cyan-400 mr-3" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
            )}
            <p className="font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
