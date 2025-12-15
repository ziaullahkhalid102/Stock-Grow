
import React, { useEffect, useState, useRef } from 'react';
import { getAllUsers, approveWithdrawal, rejectWithdrawal, approveDeposit, rejectDeposit, getCurrentUser, logout, getPlatformStats, adminUpdateUser, getDatabaseString, importDatabaseString, getGameSequence, updateGameResultAtIndex, getLiveBets } from '../services/backend';
import { User } from '../types';
import { ShieldCheck, ArrowUpRight, ArrowDownLeft, Check, X, Loader2, LogOut, LayoutDashboard, Users, Activity, Edit2, Lock, Smartphone, Database, Download, Upload, AlertTriangle, RefreshCw, Bell, Gamepad2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'DASHBOARD' | 'REQUESTS' | 'GAME' | 'USERS' | 'DATA'>('REQUESTS');
  const [stats, setStats] = useState({ totalDeposit: 0, totalWithdraw: 0, totalProfitDistributed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  
  // Game Control State
  const [gameSequence, setGameSequence] = useState<string[]>([]);
  const [liveBets, setLiveBets] = useState<{ DRAGON: number, TIGER: number, TIE: number }>({ DRAGON: 0, TIGER: 0, TIE: 0 });
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ mobile: '', password: '' });

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.mobile !== '03281614102') {
       navigate('/');
       return;
    }

    fetchData();

    // Polling for updates
    const interval = setInterval(() => {
        fetchData(true); 
    }, 3000); // 3 sec for game updates

    return () => clearInterval(interval);
  }, []);

  const fetchData = async (silent = false) => {
    if(!silent) setLoading(true);
    const data = await getAllUsers();
    const platformStats = await getPlatformStats();
    
    // Game Data
    const seq = getGameSequence();
    const bets = getLiveBets();

    setUsers(data);
    setStats(platformStats);
    setGameSequence(seq);
    setLiveBets(bets);
    
    setLastRefreshed(new Date());
    if(!silent) setLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const toggleGameResult = (index: number) => {
    const current = gameSequence[index];
    let next: 'DRAGON' | 'TIGER' | 'TIE' = 'TIGER';
    if(current === 'DRAGON') next = 'TIGER';
    if(current === 'TIGER') next = 'TIE';
    if(current === 'TIE') next = 'DRAGON';
    
    updateGameResultAtIndex(index, next);
    setGameSequence(prev => {
        const copy = [...prev];
        copy[index] = next;
        return copy;
    });
  };

  // ... (Keep existing handlers for Deposit/Withdraw) ...
  // Re-implementing them here to ensure full file integrity is maintained
  const handleApproveDeposit = async (e: React.MouseEvent, userId: string, txId: string, amount: number) => {
    e.preventDefault(); e.stopPropagation();
    if(!confirm(`Approve deposit of Rs.${amount}?`)) return;
    setActionLoading(txId);
    try {
        await approveDeposit(userId, txId, amount);
        fetchData(true);
    } catch (e: any) { alert("Error: " + e.message); }
    setActionLoading(null);
  };

  const handleRejectDeposit = async (e: React.MouseEvent, userId: string, txId: string) => {
    e.preventDefault(); e.stopPropagation();
    if(!confirm("Reject this deposit?")) return;
    setActionLoading(txId);
    try {
        await rejectDeposit(userId, txId);
        fetchData(true);
    } catch (e: any) { alert("Error: " + e.message); }
    setActionLoading(null);
  };

  const handleApproveWithdrawal = async (e: React.MouseEvent, userId: string, txId: string) => {
    e.preventDefault(); e.stopPropagation();
    if(!confirm("Confirm withdrawal sent?")) return;
    setActionLoading(txId);
    try {
        await approveWithdrawal(userId, txId);
        fetchData(true);
    } catch (e: any) { alert("Error: " + e.message); }
    setActionLoading(null);
  };

  const handleRejectWithdrawal = async (e: React.MouseEvent, userId: string, txId: string, amount: number) => {
    e.preventDefault(); e.stopPropagation();
    if(!confirm("Reject & Refund amount?")) return;
    setActionLoading(txId);
    try {
        await rejectWithdrawal(userId, txId, amount);
        fetchData(true);
    } catch (e: any) { alert("Error: " + e.message); }
    setActionLoading(null);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditForm({ mobile: user.mobile, password: '' });
  };

  const saveUserChanges = async () => {
    if(!editingUser) return;
    try {
      await adminUpdateUser(editingUser.id, editForm.mobile, editForm.password);
      setEditingUser(null);
      alert("User updated successfully");
      fetchData();
    } catch(e: any) {
      alert(e.message);
    }
  };

  const handleDownloadData = () => {
    const data = getDatabaseString();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stockgrow_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        if (confirm("WARNING: Overwrite data?")) {
           if (importDatabaseString(content)) {
             alert("Data restored!");
             fetchData();
           } else {
             alert("Invalid file.");
           }
        }
      }
    };
    reader.readAsText(file);
    if(fileInputRef.current) fileInputRef.current.value = ''; 
  };

  const pendingDeposits = users.flatMap(u => (u.transactions || []).filter(t => t.type === 'DEPOSIT' && t.status === 'PENDING').map(t => ({ ...t, userId: u.id, userName: u.name, userMobile: u.mobile }))).reverse();
  const pendingWithdrawals = users.flatMap(u => (u.transactions || []).filter(t => t.type === 'WITHDRAW' && t.status === 'PENDING').map(t => ({ ...t, userId: u.id, userName: u.name, userMobile: u.mobile }))).reverse();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-neonBlue" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 p-4 pb-24 font-sans text-slate-100">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center"><ShieldCheck className="mr-2 text-neonBlue"/> Admin Panel</h1>
        </div>
        <button onClick={handleLogout} className="bg-red-500/20 text-red-500 p-2 rounded-full hover:bg-red-500 hover:text-white transition-all">
          <LogOut size={20} />
        </button>
      </div>

      {/* Nav Tabs */}
      <div className="flex space-x-2 mb-6 bg-slate-900/50 p-1 rounded-xl overflow-x-auto">
        <button onClick={() => setTab('DASHBOARD')} className={`flex-1 py-3 px-3 rounded-lg text-xs font-bold whitespace-nowrap ${tab === 'DASHBOARD' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}><LayoutDashboard size={18} className="mb-1 mx-auto" /> Dashboard</button>
        <button onClick={() => setTab('REQUESTS')} className={`flex-1 py-3 px-3 rounded-lg text-xs font-bold whitespace-nowrap relative ${tab === 'REQUESTS' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}><Activity size={18} className="mb-1 mx-auto" /> Requests {(pendingDeposits.length + pendingWithdrawals.length) > 0 && <span className="absolute top-1 right-2 bg-red-500 text-white text-[9px] px-1.5 rounded-full">{pendingDeposits.length + pendingWithdrawals.length}</span>}</button>
        <button onClick={() => setTab('GAME')} className={`flex-1 py-3 px-3 rounded-lg text-xs font-bold whitespace-nowrap ${tab === 'GAME' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}><Gamepad2 size={18} className="mb-1 mx-auto" /> Game Control</button>
        <button onClick={() => setTab('USERS')} className={`flex-1 py-3 px-3 rounded-lg text-xs font-bold whitespace-nowrap ${tab === 'USERS' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}><Users size={18} className="mb-1 mx-auto" /> Users</button>
        <button onClick={() => setTab('DATA')} className={`flex-1 py-3 px-3 rounded-lg text-xs font-bold whitespace-nowrap ${tab === 'DATA' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}><Database size={18} className="mb-1 mx-auto" /> Data</button>
      </div>

      {/* --- DASHBOARD TAB --- */}
      {tab === 'DASHBOARD' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                <p className="text-slate-400 text-xs font-bold uppercase mb-2">Total Deposits</p>
                <p className="text-2xl font-bold text-green-500">Rs.{stats.totalDeposit.toLocaleString()}</p>
             </div>
             <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                <p className="text-slate-400 text-xs font-bold uppercase mb-2">Total Withdraw</p>
                <p className="text-2xl font-bold text-red-500">Rs.{stats.totalWithdraw.toLocaleString()}</p>
             </div>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
             <p className="text-slate-400 text-xs font-bold uppercase mb-2">Profit Distributed</p>
             <p className="text-3xl font-bold text-neonBlue">Rs.{stats.totalProfitDistributed.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* --- GAME CONTROL TAB --- */}
      {tab === 'GAME' && (
        <div className="space-y-6 animate-fade-in">
            {/* LIVE BETS MONITOR */}
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold flex items-center"><Activity className="text-red-500 mr-2 animate-pulse"/> Live Bets (Current Round)</h2>
                    <span className="text-[10px] bg-red-900/30 text-red-400 px-2 py-1 rounded border border-red-500/30">Auto-updating</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-blue-900/20 p-3 rounded-xl border border-blue-500/30">
                        <p className="text-blue-400 text-xs font-bold uppercase">Dragon</p>
                        <p className="text-xl font-bold text-white">Rs.{liveBets.DRAGON.toLocaleString()}</p>
                    </div>
                    <div className="bg-green-900/20 p-3 rounded-xl border border-green-500/30">
                        <p className="text-green-400 text-xs font-bold uppercase">Tie</p>
                        <p className="text-xl font-bold text-white">Rs.{liveBets.TIE.toLocaleString()}</p>
                    </div>
                    <div className="bg-yellow-900/20 p-3 rounded-xl border border-yellow-500/30">
                        <p className="text-yellow-400 text-xs font-bold uppercase">Tiger</p>
                        <p className="text-xl font-bold text-white">Rs.{liveBets.TIGER.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* UPCOMING RESULTS EDITOR */}
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
                <h2 className="text-white font-bold mb-2 flex items-center"><Gamepad2 className="text-neonPurple mr-2"/> Upcoming Results Sequence</h2>
                <p className="text-xs text-slate-400 mb-4">Click on any result to toggle it (Dragon -> Tiger -> Tie).</p>
                
                <div className="space-y-2">
                    {gameSequence.slice(0, 10).map((res, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-slate-800">
                             <div className="flex items-center">
                                 <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs flex items-center justify-center mr-3 font-mono">{idx + 1}</span>
                                 <span className="text-xs text-slate-500 mr-4">Status:</span>
                                 <span className={`font-bold uppercase w-20 text-center py-1 rounded ${
                                     res === 'DRAGON' ? 'bg-red-500 text-white' :
                                     res === 'TIGER' ? 'bg-yellow-500 text-black' :
                                     'bg-green-500 text-white'
                                 }`}>{res}</span>
                             </div>
                             <button 
                                onClick={() => toggleGameResult(idx)}
                                className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-white font-bold"
                             >
                                Change
                             </button>
                        </div>
                    ))}
                </div>
                {gameSequence.length === 0 && <p className="text-slate-500 text-sm p-4 text-center">No active sequence. Game will generate one.</p>}
            </div>
        </div>
      )}

      {/* --- REQUESTS TAB --- */}
      {tab === 'REQUESTS' && (
        <div className="space-y-6 animate-fade-in">
          {/* Deposits */}
          <div>
            <div className="flex justify-between items-center mb-3">
               <h3 className="text-green-500 font-bold flex items-center text-sm uppercase tracking-wider"><ArrowDownLeft size={16} className="mr-2"/> New Deposits</h3>
               <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-white">{pendingDeposits.length}</span>
            </div>
            {pendingDeposits.map((tx) => (
                <div key={tx.id} className="bg-slate-900 border border-slate-700 p-4 rounded-xl mb-3 shadow-lg relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                   <div className="flex justify-between items-start mb-4 pl-3">
                      <div>
                         <p className="text-white font-bold text-lg">{tx.userName}</p>
                         <p className="text-xs text-slate-400 font-mono">{tx.userMobile}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-2xl font-bold text-white">Rs.{tx.amount.toLocaleString()}</p>
                         <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">{tx.method}</span>
                      </div>
                   </div>
                   <div className="bg-slate-950/50 p-2 rounded-lg mb-4 ml-3 border border-slate-800 flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-mono">TRX: <span className="text-neonBlue">{tx.id}</span></span>
                   </div>
                   <div className="flex gap-3 ml-3">
                      <button onClick={(e) => handleApproveDeposit(e, tx.userId, tx.id, tx.amount)} disabled={actionLoading === tx.id} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl text-sm font-bold uppercase flex items-center justify-center disabled:opacity-50">{actionLoading === tx.id ? <Loader2 className="animate-spin" size={18} /> : "Accept"}</button>
                      <button onClick={(e) => handleRejectDeposit(e, tx.userId, tx.id)} disabled={actionLoading === tx.id} className="flex-1 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-500 py-3 rounded-xl text-sm font-bold uppercase border border-slate-700 flex items-center justify-center disabled:opacity-50">{actionLoading === tx.id ? <Loader2 className="animate-spin" size={18} /> : "Reject"}</button>
                   </div>
                </div>
            ))}
            {pendingDeposits.length === 0 && <p className="text-slate-500 text-xs text-center p-4 bg-slate-900 rounded-xl">No pending deposits.</p>}
          </div>

          {/* Withdrawals */}
          <div>
            <div className="flex justify-between items-center mb-3">
               <h3 className="text-red-500 font-bold flex items-center text-sm uppercase tracking-wider"><ArrowUpRight size={16} className="mr-2"/> Withdrawal Requests</h3>
               <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-white">{pendingWithdrawals.length}</span>
            </div>
            {pendingWithdrawals.map((tx) => (
                <div key={tx.id} className="bg-slate-900 border border-slate-700 p-4 rounded-xl mb-3 shadow-lg relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                   <div className="flex justify-between items-start mb-4 pl-3">
                      <div>
                         <p className="text-white font-bold text-lg">{tx.userName}</p>
                         <p className="text-xs text-slate-400 font-mono">{tx.userMobile}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-2xl font-bold text-white">Rs.{tx.amount.toLocaleString()}</p>
                      </div>
                   </div>
                   <div className="bg-slate-950/50 p-2 rounded-lg mb-4 ml-3 border border-slate-800">
                      <p className="text-[10px] text-slate-500 mb-1">Sending to:</p>
                      <p className="text-sm font-bold text-white font-mono">{tx.method === 'JazzCash' || tx.method === 'Easypaisa' ? tx.userMobile : 'Bank Account'}</p> 
                   </div>
                   <div className="flex gap-3 ml-3">
                      <button onClick={(e) => handleApproveWithdrawal(e, tx.userId, tx.id)} disabled={actionLoading === tx.id} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl text-sm font-bold uppercase flex items-center justify-center disabled:opacity-50">{actionLoading === tx.id ? <Loader2 className="animate-spin" size={18} /> : "Mark Paid"}</button>
                      <button onClick={(e) => handleRejectWithdrawal(e, tx.userId, tx.id, tx.amount)} disabled={actionLoading === tx.id} className="flex-1 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-500 py-3 rounded-xl text-sm font-bold uppercase border border-slate-700 flex items-center justify-center disabled:opacity-50">{actionLoading === tx.id ? <Loader2 className="animate-spin" size={18} /> : "Reject"}</button>
                   </div>
                </div>
            ))}
            {pendingWithdrawals.length === 0 && <p className="text-slate-500 text-xs text-center p-4 bg-slate-900 rounded-xl">No pending withdrawals.</p>}
          </div>
        </div>
      )}

      {/* --- USERS TAB --- */}
      {tab === 'USERS' && (
        <div className="space-y-3 animate-fade-in">
           {users.map(u => (
             <div key={u.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                   <div className="flex items-center">
                     <p className="font-bold text-white mr-2">{u.name}</p>
                     {u.role === 'ADMIN' && <span className="bg-neonPurple/20 text-neonPurple text-[8px] px-1 rounded uppercase font-bold">Admin</span>}
                   </div>
                   <p className="text-xs text-slate-400 font-mono mt-1">{u.mobile}</p>
                </div>
                <div className="text-right">
                   <p className="text-neonGreen font-mono font-bold">Rs.{u.balance}</p>
                   <button onClick={() => openEditModal(u)} className="mt-2 text-[10px] bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg flex items-center ml-auto transition-colors"><Edit2 size={10} className="mr-1" /> Edit</button>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* --- DATA TAB --- */}
      {tab === 'DATA' && (
        <div className="space-y-6 animate-fade-in">
           <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
             <h3 className="text-white font-bold mb-4 flex items-center"><Download size={18} className="mr-2 text-neonBlue"/> Export Database</h3>
             <button onClick={handleDownloadData} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-colors">Download Backup</button>
           </div>
           <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
             <h3 className="text-white font-bold mb-4 flex items-center"><Upload size={18} className="mr-2 text-neonPurple"/> Restore Database</h3>
             <input type="file" accept=".json" ref={fileInputRef} onChange={handleUploadData} className="hidden" />
             <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-neonPurple text-white font-bold rounded-xl hover:bg-purple-600 transition-all">Select File & Restore</button>
           </div>
        </div>
      )}

      {/* --- EDIT USER MODAL --- */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-scale-up">
              <h3 className="text-lg font-bold text-white mb-4">Edit User</h3>
              <div className="space-y-4">
                 <div>
                    <label className="block text-xs text-slate-400 mb-1 font-bold uppercase">Mobile Number</label>
                    <input type="tel" value={editForm.mobile} onChange={e => setEditForm({...editForm, mobile: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-3 text-sm text-white focus:border-neonBlue focus:outline-none"/>
                 </div>
                 <div>
                    <label className="block text-xs text-slate-400 mb-1 font-bold uppercase">New Password</label>
                    <input type="text" placeholder="Leave empty to keep same" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-3 text-sm text-white focus:border-neonBlue focus:outline-none"/>
                 </div>
              </div>
              <div className="flex gap-3 mt-6">
                 <button onClick={() => setEditingUser(null)} className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold">Cancel</button>
                 <button onClick={saveUserChanges} className="flex-1 py-2 bg-neonBlue text-black rounded-lg text-sm font-bold">Save Changes</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
