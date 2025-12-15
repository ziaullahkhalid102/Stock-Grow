import React, { useEffect, useState } from 'react';
import { getCurrentUser, subscribeToAuth } from '../services/backend';
import { User, Transaction } from '../types';
import { Share2, Users, DollarSign, Copy, Check, Gift, BarChart3, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ReferralPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [copied, setCopied] = useState(false);
  const [chartData, setChartData] = useState<{label: string, value: number, monthIdx: number, year: number}[]>([]);

  useEffect(() => {
    setUser(getCurrentUser());
    const unsub = subscribeToAuth((u) => {
      setUser(u);
      if (u) processChartData(u.transactions);
    });
    return () => unsub();
  }, []);

  const processChartData = (transactions: Transaction[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    const data = [];

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      // Handle month wraparound correctly by using date constructor
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      data.push({
        monthIdx: d.getMonth(),
        year: d.getFullYear(),
        label: months[d.getMonth()],
        value: 0
      });
    }

    // Aggregate Referral Earnings
    transactions.forEach(tx => {
      if (tx.type === 'REFERRAL') {
        const d = new Date(tx.date);
        const item = data.find(m => m.monthIdx === d.getMonth() && m.year === d.getFullYear());
        if (item) {
          item.value += tx.amount;
        }
      }
    });

    setChartData(data);
  };

  const copyCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share && user) {
      try {
        await navigator.share({
          title: 'Join StockGrow!',
          text: `Use my referral code ${user.referralCode} to join StockGrow and start earning smart returns!`,
          url: window.location.origin
        });
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      copyCode();
    }
  };

  if (!user) return null;

  // Calculate scaling for chart
  const maxChartValue = Math.max(...chartData.map(d => d.value), 100); 

  return (
    <div className="p-4 pt-8 pb-24">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center text-slate-400 text-sm mb-6 hover:text-white transition-colors"
      >
        <ChevronLeft size={16} className="mr-1" /> Back
      </button>

      <div className="flex flex-col items-center justify-center text-center mb-8">
        <div className="w-16 h-16 bg-neonPurple/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(168,85,247,0.3)] border border-neonPurple/50">
          <Gift className="text-neonPurple" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Refer & Earn</h1>
        <p className="text-slate-400 text-sm max-w-[280px]">
          Invite friends to StockGrow and earn <span className="text-neonBlue font-bold">5% commission</span> on their plan purchases instantly!
        </p>
      </div>

      {/* Code Card */}
      <div className="bg-surface border border-slate-800 rounded-2xl p-6 mb-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-neonBlue/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <p className="text-center text-xs text-slate-500 uppercase tracking-widest mb-3">Your Referral Code</p>
        
        <div 
          onClick={copyCode}
          className="bg-slate-950 border border-slate-700 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-neonBlue transition-colors group mb-4"
        >
          <span className="text-2xl font-mono font-bold text-white tracking-widest">{user.referralCode}</span>
          <div className={`p-2 rounded-lg transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-white'}`}>
            {copied ? <Check size={20} /> : <Copy size={20} />}
          </div>
        </div>

        <button 
          onClick={handleShare}
          className="w-full py-3 bg-neonPurple text-white font-bold rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.3)] flex items-center justify-center hover:scale-[1.02] transition-transform"
        >
          <Share2 className="mr-2" size={18} /> Share Code
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center text-slate-400 mb-2 text-xs uppercase font-bold">
            <Users size={14} className="mr-2" /> Total Referrals
          </div>
          <p className="text-3xl font-bold text-white">{user.referralCount}</p>
        </div>
        <div className="bg-surface p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center text-slate-400 mb-2 text-xs uppercase font-bold">
            <DollarSign size={14} className="mr-2" /> Total Earnings
          </div>
          <p className="text-3xl font-bold text-neonGreen">Rs.{user.referralEarnings.toLocaleString()}</p>
        </div>
      </div>

      {/* Growth Chart */}
      <div className="bg-surface border border-slate-800 rounded-2xl p-5 mb-8">
        <h3 className="text-slate-400 text-xs font-bold uppercase mb-6 flex items-center">
          <BarChart3 className="text-neonBlue mr-2" size={16} /> Monthly Earnings
        </h3>
        
        <div className="flex items-end justify-between h-32 space-x-3">
          {chartData.length > 0 ? chartData.map((d, i) => {
            const heightPct = Math.max((d.value / maxChartValue) * 100, 4); // Minimum height for visibility
            return (
              <div key={i} className="flex flex-col items-center flex-1 group">
                <div className="relative w-full flex items-end justify-center h-full">
                  <div 
                    className="w-full bg-slate-700 rounded-t-sm hover:bg-neonPurple transition-all duration-300 relative group-hover:shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                    style={{ height: `${heightPct}%` }}
                  >
                    {d.value > 0 && (
                       <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] bg-slate-900 text-white px-2 py-1 rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-xl">
                         Rs.{d.value}
                       </div>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">{d.label}</p>
              </div>
            );
          }) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm">Loading Chart...</div>
          )}
        </div>
      </div>

      {/* How it works */}
      <div>
        <h3 className="text-white font-bold mb-4">How it works</h3>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-neonBlue font-bold mr-3 flex-shrink-0">1</div>
            <p className="text-sm text-slate-400 leading-relaxed">Share your unique code with friends and family.</p>
          </div>
          <div className="flex items-start">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-neonBlue font-bold mr-3 flex-shrink-0">2</div>
            <p className="text-sm text-slate-400 leading-relaxed">They sign up using your code.</p>
          </div>
          <div className="flex items-start">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-neonBlue font-bold mr-3 flex-shrink-0">3</div>
            <p className="text-sm text-slate-400 leading-relaxed">You get <span className="text-white font-bold">5% cash bonus</span> instantly when they purchase any plan.</p>
          </div>
        </div>
      </div>
    </div>
  );
}