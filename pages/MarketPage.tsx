
import React, { useEffect, useState } from 'react';
import { getMarketStats } from '../services/backend';
import { getMarketInsights } from '../services/geminiService';
import { Users, DollarSign, Award, Activity, Sparkles, Loader2 } from 'lucide-react';

export default function MarketPage() {
  const [stats, setStats] = useState<any>(null);
  const [aiInsight, setAiInsight] = useState<string>('Analyzing market data...');

  useEffect(() => {
    const loadData = async () => {
      const data = await getMarketStats();
      setStats(data);
      
      // Call Gemini AI
      getMarketInsights(data.totalActive, data.totalCirculation, data.chartData)
        .then(text => setAiInsight(text));
    };
    loadData();
  }, []);

  if (!stats) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-neonBlue" /></div>;

  const maxVal = stats.chartData.length > 0 
    ? Math.max(...stats.chartData.map((d: any) => d.count)) 
    : 100;

  return (
    <div className="p-4 pt-8 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Market View</h1>
        <div className="flex items-center space-x-2 text-xs bg-slate-800 px-3 py-1 rounded-full text-neonBlue border border-neonBlue/30">
          <div className="w-2 h-2 bg-neonBlue rounded-full animate-pulse"></div>
          <span>LIVE</span>
        </div>
      </div>

      {/* AI Insight Card */}
      <div className="relative p-5 rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-500/30 overflow-hidden shadow-[0_0_20px_rgba(99,102,241,0.15)]">
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <Sparkles className="text-indigo-400" size={64} />
        </div>
        <div className="flex items-center mb-2 text-indigo-400 text-xs font-bold tracking-widest uppercase">
          <Sparkles size={14} className="mr-2" /> Gemini AI Analysis
        </div>
        <p className="text-white text-sm leading-relaxed font-medium relative z-10">
          "{aiInsight}"
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface p-4 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex items-center text-slate-400 mb-2">
            <Users size={16} className="mr-2" /> Active Users
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalActive.toLocaleString()}</p>
        </div>
        <div className="bg-surface p-4 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex items-center text-slate-400 mb-2">
            <DollarSign size={16} className="mr-2" /> Volume
          </div>
          <p className="text-2xl font-bold text-neonGreen truncate">Rs.{(stats.totalCirculation / 1000000).toFixed(1)}M</p>
        </div>
      </div>

      {/* Leaderboard / Top Plan */}
      <div className="bg-surface rounded-2xl p-5 border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-24 h-24 bg-neonPurple/20 blur-2xl rounded-full"></div>
        <h3 className="text-slate-400 text-sm font-bold uppercase mb-4 flex items-center">
          <Award className="text-yellow-500 mr-2" size={18} /> Top Performing Plan
        </h3>
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-xl font-bold text-white">{stats.chartData[0]?.name || 'GoldCard'}</p>
            <p className="text-xs text-slate-500 mt-1">Highest purchase volume today</p>
          </div>
          <div className="text-3xl font-bold text-neonPurple opacity-50">#1</div>
        </div>
      </div>

      {/* Simple Bar Chart */}
      <div className="bg-surface rounded-2xl p-5 border border-slate-800">
        <h3 className="text-slate-400 text-sm font-bold uppercase mb-6 flex items-center">
          <Activity className="text-neonBlue mr-2" size={18} /> Purchase Trends
        </h3>
        
        <div className="flex items-end justify-between h-40 space-x-2">
          {stats.chartData.map((d: any, i: number) => {
            const heightPct = (d.count / maxVal) * 100;
            return (
              <div key={i} className="flex flex-col items-center flex-1 group">
                <div className="relative w-full flex items-end justify-center h-full">
                  <div 
                    className="w-full max-w-[24px] bg-slate-700 rounded-t-sm hover:bg-neonBlue transition-all duration-300 relative group-hover:shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                    style={{ height: `${heightPct}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.count}
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 mt-2 truncate w-full text-center">{d.name.substring(0,6)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
