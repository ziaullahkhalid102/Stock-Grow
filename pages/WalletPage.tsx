
import React, { useState, useEffect } from 'react';
import { getCurrentUser, processDeposit, processWithdraw, subscribeToAuth } from '../services/backend';
import { User, Transaction } from '../types';
import { Wallet, ArrowDownLeft, ArrowUpRight, History, Copy, Upload, AlertCircle, Smartphone, Landmark, Filter, Gift, CheckCircle, Info, BookOpen, ChevronDown, Gamepad2, ShoppingCart } from 'lucide-react';

type Mode = 'VIEW' | 'DEPOSIT' | 'WITHDRAW';
type FilterType = 'DEPOSIT' | 'WITHDRAW' | 'HISTORY';

export default function WalletPage() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<Mode>('VIEW');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [filter, setFilter] = useState<FilterType>('DEPOSIT');

  // Form States
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('JazzCash');
  const [trxId, setTrxId] = useState('');
  const [senderNum, setSenderNum] = useState('');

  // Admin Account Details
  const ADMIN_ACCOUNTS: any = {
    'JazzCash': { 
      number: '03281614102', 
      title: 'Muhammad Ziaullah', 
      type: 'Mobile Wallet',
      details: 'JazzCash / EasyPaisa'
    },
    'Easypaisa': { 
      number: '03281614102', 
      title: 'Muhammad Ziaullah', 
      type: 'Mobile Wallet',
      details: 'JazzCash / EasyPaisa'
    },
    'Meezan Bank': {
      number: '00300110222778',
      iban: 'PK26MEZN0000300110222778',
      title: 'Muhammad Ziaullah',
      type: 'Bank Transfer',
      details: 'Meezan Bank'
    },
    'Allied Bank': {
      number: '09700010154215910010', 
      title: 'Muhammad Ziaullah',
      type: 'Bank Transfer',
      details: 'Allied Bank (Asaan Digital Account)'
    }
  };

  useEffect(() => {
    setUser(getCurrentUser());
    const unsub = subscribeToAuth((u) => setUser(u));
    return () => unsub();
  }, []);

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'DEPOSIT') {
        if (!trxId) throw new Error("Transaction ID (TRX) is required");
        const cleanTrx = trxId.replace(/\s/g, '');
        const cleanSender = senderNum.replace(/\D/g, ''); 

        if (cleanTrx.length < 11) throw new Error("Invalid TRX ID.");

        if (method === 'JazzCash' || method === 'Easypaisa') {
            if (!/^\d{11}$/.test(cleanSender)) {
                 throw new Error(`Invalid Sender Number. Must be exactly 11 digits.`);
            }
        } else {
            if (cleanSender.length < 10) throw new Error("Invalid Bank Account Number.");
        }
        
        await processDeposit(Number(amount), method);
        setSuccessMsg('Deposit request submitted! Wait for Admin Verification.');
        setFilter('DEPOSIT');

      } else {
        const amountNum = Number(amount);
        if (amountNum < 400) throw new Error("Minimum withdrawal is Rs.400");
        if (amountNum > 400000) throw new Error("Maximum withdrawal is Rs.400,000");

        const accountInput = (document.getElementById('withdrawAccount') as HTMLInputElement)?.value;
        const cleanAccount = accountInput?.replace(/\D/g, '') || '';

        if (!cleanAccount) throw new Error("Account number is required");

        if (method === 'JazzCash' || method === 'Easypaisa') {
            if (!/^\d{11}$/.test(cleanAccount)) throw new Error(`Invalid ${method} number.`);
        }
        
        await processWithdraw(amountNum, method);
        setSuccessMsg('Withdrawal request submitted!');
        setFilter('WITHDRAW');
      }

      setTimeout(() => {
        setMode('VIEW');
        setAmount('');
        setTrxId('');
        setSenderNum('');
        setSuccessMsg('');
      }, 2000);

    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied!");
  };

  const getFilteredTransactions = () => {
    if (!user) return [];
    let txs = user.transactions.slice().reverse();
    
    if (filter === 'DEPOSIT') {
        return txs.filter(t => t.type === 'DEPOSIT');
    } else if (filter === 'WITHDRAW') {
        return txs.filter(t => t.type === 'WITHDRAW');
    } else {
        // HISTORY: Everything EXCEPT deposit/withdraw
        return txs.filter(t => t.type !== 'DEPOSIT' && t.type !== 'WITHDRAW');
    }
  };

  const renderInstructions = () => {
    // Instructions logic same as before...
    if (method === 'JazzCash' || method === 'Easypaisa') {
      return (
        <div className="text-xs text-slate-300 space-y-2 mt-2 font-sans">
          <p>1. {method} ایپ اوپن کریں۔</p>
          <p>2. <strong>Send Money</strong> پر کلک کریں۔</p>
          <p>3. <strong>Mobile Account</strong> منتخب کریں۔</p>
          <p>4. اوپر دیا گیا نمبر <strong>({ADMIN_ACCOUNTS[method].number})</strong> درج کریں۔</p>
          <p>5. Amount لکھیں۔</p>
          <p>6. MPIN ڈال کر پیمنٹ کنفرم کریں۔</p>
          <p>7. پیمنٹ مکمل ہونے پر <strong>Transaction ID</strong> کاپی کریں۔</p>
        </div>
      );
    } else if (method === 'Meezan Bank') {
      return (
        <div className="text-xs text-slate-300 space-y-2 mt-2 font-sans">
          <p>1. Meezan Bank موبائل ایپ اوپن کریں۔</p>
          <p>2. <strong>Send Money / Fund Transfer</strong> پر جائیں۔</p>
          <p>3. <strong>Other Bank / IBFT</strong> منتخب کریں۔</p>
          <p>4. اوپر دی گئی اکاؤنٹ تفصیل (Account No / IBAN) درج کریں۔</p>
          <p>5. Amount لکھیں۔</p>
          <p>6. OTP / MPIN ڈال کر ٹرانزیکشن مکمل کریں۔</p>
          <p>7. کامیابی پر <strong>Transaction ID</strong> کاپی کریں۔</p>
        </div>
      );
    } else {
      return (
        <div className="text-xs text-slate-300 space-y-2 mt-2 font-sans">
          <p>1. کسی بھی بینک ایپ سے <strong>Bank Transfer</strong> کریں۔</p>
          <p>2. <strong>Allied Bank</strong> منتخب کریں۔</p>
          <p>3. اکاؤنٹ نمبر اور نام درج کریں۔</p>
          <p>4. رقم سینڈ کریں۔</p>
          <p>5. <strong>Transaction ID</strong> محفوظ کریں۔</p>
        </div>
      );
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 pt-8 pb-24">
      {/* Wallet Card */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 to-black border border-slate-800 p-6 mb-8 overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-neonBlue/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-24 w-48 h-48 bg-neonPurple/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 text-center">
          <p className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-2">Total Balance</p>
          <h1 className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            Rs. <span className="text-neonBlue">{user.balance.toLocaleString()}</span>
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8 relative z-10">
          <button 
            onClick={() => setMode('DEPOSIT')}
            className="flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 transition-colors"
          >
            <div className="bg-green-500/20 p-2 rounded-full mb-2">
              <ArrowDownLeft className="text-green-500" size={20} />
            </div>
            <span className="text-xs font-bold text-white">Add Funds</span>
          </button>
          <button 
             onClick={() => setMode('WITHDRAW')}
             className="flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 transition-colors"
          >
            <div className="bg-red-500/20 p-2 rounded-full mb-2">
              <ArrowUpRight className="text-red-500" size={20} />
            </div>
            <span className="text-xs font-bold text-white">Withdraw</span>
          </button>
        </div>
      </div>

      {mode === 'VIEW' && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <History className="mr-2 text-slate-500" /> History
            </h3>
          </div>
          
          {/* Tabs */}
          <div className="flex bg-slate-900/50 p-1 rounded-xl mb-4 overflow-hidden">
             <button 
               onClick={() => setFilter('DEPOSIT')} 
               className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${filter === 'DEPOSIT' ? 'bg-green-600 text-white' : 'text-slate-500 hover:text-white'}`}
             >
               Add Funds
             </button>
             <button 
               onClick={() => setFilter('WITHDRAW')} 
               className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${filter === 'WITHDRAW' ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-white'}`}
             >
               Withdraw
             </button>
             <button 
               onClick={() => setFilter('HISTORY')} 
               className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${filter === 'HISTORY' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
             >
               Balance History
             </button>
          </div>

          <div className="space-y-3 pb-8">
            {getFilteredTransactions().length === 0 ? (
              <div className="text-slate-500 text-center py-12 flex flex-col items-center border border-dashed border-slate-800 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                  <Filter size={20} opacity={0.5} />
                </div>
                <p className="text-sm">No transactions found.</p>
              </div>
            ) : (
              getFilteredTransactions().map((tx) => (
                <div key={tx.id} className={`bg-surface p-4 rounded-xl border flex justify-between items-center transition-colors ${
                  tx.status === 'PENDING' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-slate-800 hover:border-slate-600'
                }`}>
                  <div className="flex items-center">
                    <div className={`p-2.5 rounded-full mr-3 ${
                      tx.type === 'DEPOSIT' || tx.type === 'GAME_WIN' || tx.type === 'REFERRAL' ? 'bg-green-500/10 text-green-500' : 
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {tx.type === 'DEPOSIT' ? <ArrowDownLeft size={18} /> : 
                       tx.type === 'WITHDRAW' ? <ArrowUpRight size={18} /> :
                       tx.type === 'GAME_WIN' || tx.type === 'GAME_LOSS' ? <Gamepad2 size={18} /> :
                       tx.type === 'PLAN_BUY' ? <ShoppingCart size={18} /> :
                       <Gift size={18} />}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">
                        {tx.type === 'DEPOSIT' ? 'Deposit' : 
                         tx.type === 'WITHDRAW' ? 'Withdraw' :
                         tx.type === 'GAME_WIN' ? 'Game Win' :
                         tx.type === 'GAME_LOSS' ? 'Game Loss' :
                         tx.type === 'PLAN_BUY' ? 'Plan Purchase' :
                         'Referral Bonus'}
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center mt-0.5">
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 mr-1.5 truncate max-w-[100px]">{tx.method}</span>
                        {new Date(tx.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono font-bold text-sm ${
                      tx.type === 'DEPOSIT' || tx.type === 'GAME_WIN' || tx.type === 'REFERRAL' ? 'text-green-500' : 'text-red-400'
                    }`}>
                      {tx.type === 'DEPOSIT' || tx.type === 'GAME_WIN' || tx.type === 'REFERRAL' ? '+' : '-'} Rs.{tx.amount.toLocaleString()}
                    </p>
                    {tx.status && (
                        <p className={`text-[9px] uppercase font-bold mt-1 ${
                        tx.status === 'APPROVED' ? 'text-neonBlue' : 
                        tx.status === 'REJECTED' ? 'text-red-500' : 
                        'text-yellow-500 animate-pulse'
                        }`}>
                        {tx.status === 'PENDING' ? 'Under Process' : tx.status}
                        </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {(mode === 'DEPOSIT' || mode === 'WITHDRAW') && (
        <div className="bg-surface border border-slate-800 rounded-2xl p-6 shadow-xl animate-slide-up">
           {/* Same Form Logic as before... */}
           {/* Keeping existing form rendering to save space, assuming it's correctly preserved */}
           <h2 className="text-xl font-bold text-white mb-6">
            {mode === 'DEPOSIT' ? 'Add Funds' : 'Withdraw Funds'}
          </h2>

          {successMsg ? (
            <div className="p-6 bg-green-500/10 border border-green-500 text-green-500 rounded-xl text-center mb-4 flex flex-col items-center animate-pulse">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-black mb-3">
                <CheckCircle size={24} />
              </div>
              <p className="font-bold">{successMsg}</p>
              <p className="text-xs mt-2 opacity-80">Admin Verification Pending.</p>
            </div>
          ) : (
            <form onSubmit={handleTransaction} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">Step 1: Payment Method منتخب کریں</label>
                <div className="grid grid-cols-2 gap-3">
                  {['JazzCash', 'Easypaisa', 'Meezan Bank', 'Allied Bank'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`py-3 px-2 text-xs font-bold rounded-xl border transition-all duration-200 flex items-center justify-center ${
                        method === m 
                        ? 'bg-neonBlue text-black border-neonBlue shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {(m.includes('Bank') || m.includes('Meezan')) ? <Landmark size={14} className="mr-1"/> : <Smartphone size={14} className="mr-1"/>}
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {mode === 'DEPOSIT' && (
                <div className="space-y-4">
                  <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-700 mt-2">
                    <div className="flex items-start mb-4">
                       <AlertCircle size={18} className="text-neonBlue mr-2 mt-0.5 flex-shrink-0" />
                       <p className="text-xs text-slate-300 leading-relaxed font-bold">
                         اکاؤنٹ تفصیل ({method})
                       </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-xs text-slate-500">Account Title</span>
                        <span className="text-sm font-bold text-white tracking-wide">{ADMIN_ACCOUNTS[method].title}</span>
                      </div>

                      {ADMIN_ACCOUNTS[method].number && (
                        <div className="flex justify-between items-center pt-1">
                          <div className="overflow-hidden">
                            <span className="text-xs text-slate-500 block mb-1">Account Number</span>
                            <span className="text-sm md:text-lg font-bold text-neonBlue font-mono tracking-wide break-all">
                              {ADMIN_ACCOUNTS[method].number}
                            </span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => copyToClipboard(ADMIN_ACCOUNTS[method].number)}
                            className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-500 transition-all flex-shrink-0 ml-2"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-4">
                     {renderInstructions()}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <label className="block text-xs text-slate-400 mb-1 font-bold uppercase">Amount (Rs)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-500">Rs.</span>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-3 pl-12 rounded-xl focus:border-neonBlue focus:ring-1 focus:ring-neonBlue focus:outline-none transition-all font-bold text-lg"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              {mode === 'DEPOSIT' && (
                <div className="animate-fade-in">
                  <div className="mb-4">
                    <label className="block text-xs text-slate-400 mb-1 font-bold uppercase">Sender {method.includes('Bank') ? 'Account No' : 'Mobile Number'}</label>
                    <input 
                      type="tel" 
                      value={senderNum}
                      onChange={(e) => setSenderNum(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl focus:border-neonBlue focus:outline-none"
                      placeholder={method.includes('Bank') ? "Enter Account Number" : "03XXXXXXXXX"}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-bold uppercase">Transaction ID (TRX)</label>
                    <input 
                      type="text" 
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-neonGreen p-3 rounded-xl focus:border-neonGreen focus:ring-1 focus:ring-neonGreen focus:outline-none placeholder-slate-600 font-mono tracking-wider"
                      placeholder="e.g. 84738291012"
                      required
                    />
                  </div>
                </div>
              )}

              {mode === 'WITHDRAW' && (
                <div>
                   <label className="block text-xs text-slate-400 mb-1 font-bold uppercase">Your {method} Number</label>
                   <input 
                    id="withdrawAccount"
                    type="tel" 
                    className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl focus:border-neonBlue focus:outline-none" 
                    placeholder={method.includes('Bank') ? "Account Number / IBAN" : "03XXXXXXXXX"} 
                    required 
                   />
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setMode('VIEW')}
                  className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 py-3 bg-neonBlue text-black rounded-xl font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all"
                >
                  {loading ? 'Processing...' : 'Submit'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
