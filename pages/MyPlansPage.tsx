import React, { useEffect, useState } from 'react';
import { getCurrentUser, subscribeToAuth } from '../services/backend';
import { User, PlanStatus } from '../types';
import { CheckCircle, Clock, PlayCircle, Loader2 } from 'lucide-react';

export default function MyPlansPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Initial load
    setUser(getCurrentUser());
    
    // Subscribe to live updates (useful if plans update in background)
    const unsubscribe = subscribeToAuth((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  if (!user) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-neonBlue"/></div>;

  const activePlans = user.plans.filter(p => p.status !== PlanStatus.COMPLETED);

  return (
    <div className="p-4 pt-8 pb-24">
      <h1 className="text-2xl font-bold text-white mb-6">My Portfolio</h1>

      {activePlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
          <PlayCircle size={48} className="mb-4 opacity-50" />
          <p>No active plans.</p>
          <button onClick={() => window.location.hash = '#/'} className="mt-4 text-neonBlue hover:underline">Start Investing</button>
        </div>
      ) : (
        <div className="space-y-4">
          {activePlans.map((plan, idx) => {
             // Calculate percentage for progress bar
             const percent = Math.min(100, Math.round((plan.progressDays / plan.duration) * 100));
             
             return (
              <div key={idx} className="bg-surface border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${plan.color}`}></div>
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">Purchased: {new Date(plan.purchaseDate).toLocaleDateString()}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    plan.status === PlanStatus.MATURED ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {plan.status}
                  </div>
                </div>

                {/* Progress Section */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-white font-mono">{plan.progressDays} / {plan.duration} Days</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${plan.color} transition-all duration-1000 ease-out`} 
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase">Earned Profit</p>
                    <p className="text-neonGreen text-xl font-bold font-mono">
                      +Rs.{Math.floor(plan.earnedSoFar).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase">Total Return</p>
                    <p className="text-white text-xl font-bold font-mono">
                      Rs.{plan.totalReturn.toLocaleString()}
                    </p>
                  </div>
                </div>

                {plan.status === PlanStatus.MATURED && (
                  <div className="mt-4 p-2 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center justify-center text-green-400 text-xs font-bold">
                    <CheckCircle size={14} className="mr-2" />
                    Funds added to Wallet
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}