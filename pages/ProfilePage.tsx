
import React, { useEffect, useState } from 'react';
import { getCurrentUser, logout, subscribeToAuth } from '../services/backend';
import { User } from '../types';
import { LogOut, ShieldCheck, Mail, Smartphone, User as UserIcon, ChevronRight, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
    const unsub = subscribeToAuth((u) => setUser(u));
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  if (!user) return null;

  return (
    <div className="p-4 pt-8 pb-24">
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-neonBlue to-neonPurple p-[2px] mb-4 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-3xl font-bold text-white">
            {user.name.charAt(0)}
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white">{user.name}</h2>
        <div className="flex items-center text-green-500 text-xs font-bold mt-1 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
          <ShieldCheck size={12} className="mr-1" /> KYC Verified
        </div>
      </div>

      <div className="space-y-4">
        
        {/* Referral Banner */}
        <div 
          onClick={() => navigate('/referral')}
          className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-2xl p-5 border border-indigo-500/30 flex items-center justify-between cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mr-3">
              <Gift className="text-white" size={20} />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Refer & Earn</p>
              <p className="text-indigo-200 text-xs">Get 5% commission instantly</p>
            </div>
          </div>
          <ChevronRight className="text-indigo-300" size={20} />
        </div>

        {/* Info Card */}
        <div className="bg-surface border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h3 className="text-slate-400 text-xs font-bold uppercase mb-4 tracking-widest">Personal Details</h3>
          
          <div className="space-y-4">
            {/* Mobile Number is now the primary ID */}
            <div className="flex items-center border-b border-slate-800 pb-3 last:border-0 last:pb-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center mr-4 text-slate-400">
                <Smartphone size={16} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">Mobile Number (Account ID)</p>
                <p className="text-white text-sm tracking-wider font-mono">{user.mobile}</p>
              </div>
            </div>
            
            {/* Removed Email field */}
            <div className="flex items-center border-b border-slate-800 pb-3 last:border-0 last:pb-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center mr-4 text-slate-400">
                <UserIcon size={16} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">Account Name</p>
                <p className="text-white text-sm">{user.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-surface border border-slate-800 rounded-2xl overflow-hidden">
          {['Bank Details', 'Security Settings', 'Support Ticket', 'Terms & Privacy'].map((item) => (
             <div key={item} className="flex items-center justify-between p-4 border-b border-slate-800 active:bg-slate-800 cursor-pointer transition-colors">
                <span className="text-sm font-medium text-slate-300">{item}</span>
                <ChevronRight size={16} className="text-slate-600" />
             </div>
          ))}
        </div>

        <button 
          onClick={handleLogout}
          className="w-full py-4 mt-6 bg-red-500/10 border border-red-500/50 text-red-500 rounded-2xl font-bold flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
        >
          <LogOut size={18} className="mr-2" /> Logout Account
        </button>

        <p className="text-center text-[10px] text-slate-600 mt-4">Version 1.2.0 • Mobile Only</p>
      </div>
    </div>
  );
}
