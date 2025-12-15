
import { User, UserPlan, Transaction, PlanStatus } from '../types';
import { PLANS } from '../constants';

// --- CONFIGURATION ---
const STORAGE_KEY = 'stockgrow_data_master_v3'; // Main Database
const SESSION_KEY = 'stockgrow_session_mobile_v2'; // Current User
const GAME_SEQ_KEY = 'stockgrow_game_sequence'; // Admin controlled results
const LIVE_BETS_KEY = 'stockgrow_live_bets'; // Shared state for live bets

// --- TYPES ---
interface DatabaseSchema {
  users: User[];
  gameSequence?: ('DRAGON' | 'TIGER' | 'TIE')[];
}

// --- HELPERS ---
const getDB = (): DatabaseSchema => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    // Initial Seed
    const initialDB: DatabaseSchema = { users: [], gameSequence: generateRandomSequence(20) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDB));
    return initialDB;
  }
  const parsed = JSON.parse(data);
  if (!parsed.gameSequence) {
    parsed.gameSequence = generateRandomSequence(20);
  }
  return parsed;
};

const saveDB = (db: DatabaseSchema) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  window.dispatchEvent(new Event('storage-update'));
};

const normalizeMobile = (mobile: string): string => {
  if (!mobile) return '';
  return mobile.toString().replace(/\D/g, ''); 
};

function generateRandomSequence(length: number): ('DRAGON' | 'TIGER' | 'TIE')[] {
  const results: ('DRAGON' | 'TIGER' | 'TIE')[] = [];
  for (let i = 0; i < length; i++) {
    const r = Math.random();
    if (r < 0.45) results.push('DRAGON');
    else if (r < 0.90) results.push('TIGER');
    else results.push('TIE');
  }
  return results;
}

// --- GAME LOGIC (ADMIN CONTROLLED) ---

export const getNextGameResult = (): 'DRAGON' | 'TIGER' | 'TIE' => {
  const db = getDB();
  if (!db.gameSequence || db.gameSequence.length === 0) {
    db.gameSequence = generateRandomSequence(20);
    saveDB(db);
  }
  // Peek at the first result
  return db.gameSequence[0];
};

export const consumeGameResult = (): 'DRAGON' | 'TIGER' | 'TIE' => {
  const db = getDB();
  if (!db.gameSequence || db.gameSequence.length === 0) {
    db.gameSequence = generateRandomSequence(20);
  }
  
  const result = db.gameSequence.shift() as 'DRAGON' | 'TIGER' | 'TIE';
  
  // Ensure we always have a queue
  if (db.gameSequence.length < 10) {
    db.gameSequence = [...db.gameSequence, ...generateRandomSequence(10)];
  }
  
  saveDB(db);
  return result;
};

export const getGameSequence = (): string[] => {
  const db = getDB();
  return db.gameSequence || [];
};

export const updateGameResultAtIndex = (index: number, newVal: 'DRAGON' | 'TIGER' | 'TIE') => {
  const db = getDB();
  if(db.gameSequence && db.gameSequence[index]) {
    db.gameSequence[index] = newVal;
    saveDB(db);
  }
};

// --- LIVE BETS SYNC ---
export const updateLiveBets = (bets: { DRAGON: number, TIGER: number, TIE: number }) => {
  localStorage.setItem(LIVE_BETS_KEY, JSON.stringify(bets));
};

export const getLiveBets = () => {
  const data = localStorage.getItem(LIVE_BETS_KEY);
  return data ? JSON.parse(data) : { DRAGON: 0, TIGER: 0, TIE: 0 };
};


// --- AUTH SERVICES ---

// Auto-create Admin and FORCE PASSWORD RESET
const ensureAdminExists = () => {
  const db = getDB();
  const MAIN_ADMIN_MOBILE = '03281614102';
  const ADMIN_PASS = 'Ziakhalid@102';
  let changed = false;

  const adminUser = db.users.find(u => u.mobile === MAIN_ADMIN_MOBILE);

  if (!adminUser) {
    const newAdmin: User = {
      id: 'admin_main',
      name: 'Muhammad Ziaullah',
      email: '',
      mobile: MAIN_ADMIN_MOBILE,
      balance: 1000000,
      isVerified: true,
      plans: [],
      transactions: [],
      referralCode: 'ADMIN786',
      referralEarnings: 0,
      referralCount: 0,
      referredBy: null,
      // @ts-ignore
      _password: ADMIN_PASS,
      role: 'ADMIN',
      // @ts-ignore
      createdAt: new Date().toISOString()
    };
    db.users.push(newAdmin);
    changed = true;
  } else {
    // @ts-ignore
    if (adminUser._password !== ADMIN_PASS || adminUser.role !== 'ADMIN') {
        // @ts-ignore
        adminUser._password = ADMIN_PASS;
        // @ts-ignore
        adminUser.role = 'ADMIN';
        changed = true;
    }
  }

  if (changed) saveDB(db);
};

ensureAdminExists();

export const registerUser = async (userData: { name: string, mobile: string, password?: string, referredByCode?: string }): Promise<User> => {
  const db = getDB();
  const normalizedMobile = normalizeMobile(userData.mobile);

  if (normalizedMobile.length !== 11) throw new Error("Invalid mobile number (11 digits required).");

  if (db.users.find(u => u.mobile === normalizedMobile)) {
    throw new Error("Account already exists. Please Login.");
  }

  const newReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  let validReferredBy: string | null = null;
  if (userData.referredByCode) {
    const referrer = db.users.find(u => u.referralCode === userData.referredByCode);
    if (referrer) {
      validReferredBy = userData.referredByCode;
      referrer.referralCount = (referrer.referralCount || 0) + 1;
    }
  }

  const newUser: any = {
    id: 'user_' + Date.now(),
    name: userData.name,
    email: '',
    mobile: normalizedMobile,
    balance: 200, 
    isVerified: false,
    plans: [],
    transactions: [],
    referralCode: newReferralCode,
    referredBy: validReferredBy,
    referralEarnings: 0,
    referralCount: 0,
    _password: userData.password?.trim(),
    role: 'USER',
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDB(db);

  localStorage.setItem(SESSION_KEY, normalizedMobile);
  window.dispatchEvent(new Event('storage-update')); 
  
  return newUser;
};

export const loginUser = async (mobile: string, password: string): Promise<User> => {
  const db = getDB();
  const normalizedMobile = normalizeMobile(mobile);
  
  const user = db.users.find(u => u.mobile === normalizedMobile);
  if (!user) throw new Error("Account not found. Please Register.");
  
  // @ts-ignore
  if (user._password !== password.trim()) throw new Error("Invalid Password.");

  localStorage.setItem(SESSION_KEY, normalizedMobile);
  window.dispatchEvent(new Event('storage-update'));

  return user;
};

export const logout = async () => {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('storage-update')); 
};

export const getCurrentUser = (): User | null => {
  const mobile = localStorage.getItem(SESSION_KEY);
  if (!mobile) return null;
  const db = getDB();
  return db.users.find(u => u.mobile === mobile) || null;
};

export const playGameTransaction = async (amount: number, type: 'WIN' | 'LOSS', details: string) => {
  const db = getDB();
  const mobile = localStorage.getItem(SESSION_KEY);
  if (!mobile) throw new Error("Not logged in");

  const user = db.users.find(u => u.mobile === mobile);
  if (!user) throw new Error("User not found");

  const currentBal = Number(user.balance) || 0;

  if (type === 'LOSS') {
    if (currentBal < amount) throw new Error("Insufficient Balance");
    user.balance = currentBal - amount;
  } else {
    user.balance = currentBal + amount;
  }

  const tx: Transaction = {
    id: 'gm_' + Math.random().toString(36).substr(2, 6),
    type: type === 'WIN' ? 'GAME_WIN' : 'GAME_LOSS',
    amount: amount,
    method: details,
    date: new Date().toISOString(),
    status: 'APPROVED'
  };

  user.transactions.push(tx);
  saveDB(db);
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  const handleUpdate = () => {
    callback(getCurrentUser());
  };

  window.addEventListener('storage-update', handleUpdate); 
  window.addEventListener('storage', handleUpdate); 
  handleUpdate();
  return () => {
    window.removeEventListener('storage-update', handleUpdate);
    window.removeEventListener('storage', handleUpdate);
  };
};

export const resetPassword = async (mobile: string) => {
  const db = getDB();
  const user = db.users.find(u => u.mobile === normalizeMobile(mobile));
  if(!user) throw new Error("Account not found");
  return true;
};

export const buyPlan = async (planId: string): Promise<void> => {
  const db = getDB();
  const mobile = localStorage.getItem(SESSION_KEY);
  if (!mobile) throw new Error("Not logged in");

  const userIndex = db.users.findIndex(u => u.mobile === mobile);
  if (userIndex === -1) throw new Error("User not found");
  const user = db.users[userIndex];

  const planDef = PLANS.find(p => p.id === planId);
  if (!planDef) throw new Error("Invalid plan");

  const currentBal = Number(user.balance);
  if (isNaN(currentBal) || currentBal < planDef.price) throw new Error("Insufficient Balance");

  user.balance = currentBal - planDef.price;

  const newPlan: UserPlan = {
    ...planDef,
    purchaseDate: new Date().toISOString(),
    status: PlanStatus.ACTIVE,
    progressDays: 0,
    earnedSoFar: 0
  };
  user.plans.push(newPlan);
  
  // Record Transaction
  const planTx: Transaction = {
    id: 'plan_' + Math.random().toString(36).substr(2, 6),
    type: 'PLAN_BUY',
    amount: planDef.price,
    method: planDef.name,
    date: new Date().toISOString(),
    status: 'APPROVED'
  };
  user.transactions.push(planTx);

  if (user.referredBy) {
    const referrer = db.users.find(u => u.referralCode === user.referredBy);
    if (referrer) {
      const commission = Math.floor(planDef.price * 0.05);
      const refBal = Number(referrer.balance);
      referrer.balance = (isNaN(refBal) ? 0 : refBal) + commission;
      referrer.referralEarnings = (referrer.referralEarnings || 0) + commission;
      
      const tx: Transaction = {
        id: 'tx_ref_' + Math.random().toString(36).substr(2, 6),
        type: 'REFERRAL',
        amount: commission,
        method: 'System',
        date: new Date().toISOString(),
        status: 'APPROVED'
      };
      referrer.transactions.push(tx);
    }
  }

  saveDB(db);
};

export const processDeposit = async (amount: number, method: string): Promise<void> => {
  const db = getDB();
  const mobile = localStorage.getItem(SESSION_KEY);
  if (!mobile) throw new Error("Not logged in");

  const user = db.users.find(u => u.mobile === mobile);
  if (!user) throw new Error("User not found");

  const tx: Transaction = {
    id: 'tx_' + Math.random().toString(36).substr(2, 6),
    type: 'DEPOSIT',
    amount: Number(amount), 
    method,
    date: new Date().toISOString(),
    status: 'PENDING'
  };

  user.transactions.push(tx);
  saveDB(db);
};

export const processWithdraw = async (amount: number, method: string): Promise<void> => {
  const db = getDB();
  const mobile = localStorage.getItem(SESSION_KEY);
  if (!mobile) throw new Error("Not logged in");

  const user = db.users.find(u => u.mobile === mobile);
  if (!user) throw new Error("User not found");

  const currentBal = Number(user.balance);
  if (isNaN(currentBal) || currentBal < amount) throw new Error("Insufficient funds");

  user.balance = currentBal - Number(amount); 

  const tx: Transaction = {
    id: 'tx_' + Math.random().toString(36).substr(2, 6),
    type: 'WITHDRAW',
    amount: Number(amount), 
    method,
    date: new Date().toISOString(),
    status: 'PENDING'
  };

  user.transactions.push(tx);
  saveDB(db);
};

export const getAllUsers = async (): Promise<User[]> => {
  const db = getDB();
  return db.users;
};

export const getPlatformStats = async () => {
  const db = getDB();
  let totalDeposit = 0;
  let totalWithdraw = 0;
  let totalProfitDistributed = 0;

  db.users.forEach(u => {
    u.transactions.forEach(t => {
      if(t.status === 'APPROVED') {
        if(t.type === 'DEPOSIT') totalDeposit += t.amount;
        if(t.type === 'WITHDRAW') totalWithdraw += t.amount;
      }
    });
    totalProfitDistributed += (u.referralEarnings || 0);
    u.plans.forEach(p => {
       totalProfitDistributed += p.earnedSoFar;
    });
  });

  return { totalDeposit, totalWithdraw, totalProfitDistributed };
};

export const adminUpdateUser = async (userId: string, newMobile: string, newPassword?: string) => {
  const db = getDB();
  const normalizedNewMobile = normalizeMobile(newMobile);
  
  const user = db.users.find(u => u.id === userId);
  if (!user) throw new Error("User not found");

  if (user.mobile !== normalizedNewMobile) {
    if (db.users.find(u => u.mobile === normalizedNewMobile)) {
      throw new Error("Mobile already taken");
    }
    user.mobile = normalizedNewMobile;
  }

  if (newPassword && newPassword.trim()) {
    // @ts-ignore
    user._password = newPassword.trim();
  }

  saveDB(db);
};

export const approveDeposit = async (userId: string, txId: string, amount: number) => {
  const db = getDB();
  let user = db.users.find(u => u.id === userId);
  let tx;

  if (user) {
    tx = user.transactions.find(t => t.id.trim().toLowerCase() === txId.trim().toLowerCase());
  }

  if (!user || !tx) {
    for (const u of db.users) {
        const found = u.transactions.find(t => t.id.trim().toLowerCase() === txId.trim().toLowerCase());
        if (found) {
            user = u;
            tx = found;
            break;
        }
    }
  }

  if (!user || !tx) throw new Error("Transaction could not be found.");
  if (tx.status === 'APPROVED') return true; 

  tx.status = 'APPROVED';
  
  const currentBalance = Number(user.balance);
  const depositAmount = Number(amount);
  
  if (isNaN(currentBalance)) {
    user.balance = depositAmount; 
  } else {
    user.balance = currentBalance + depositAmount;
  }
  
  saveDB(db);
  return true;
};

export const rejectDeposit = async (userId: string, txId: string) => {
  const db = getDB();
  let user = db.users.find(u => u.id === userId);
  let tx;

  if (user) {
    tx = user.transactions.find(t => t.id.trim().toLowerCase() === txId.trim().toLowerCase());
  }

  if (!user || !tx) {
    for (const u of db.users) {
        const found = u.transactions.find(t => t.id.trim().toLowerCase() === txId.trim().toLowerCase());
        if (found) {
            user = u;
            tx = found;
            break;
        }
    }
  }

  if (!user || !tx) throw new Error("Transaction could not be found.");

  tx.status = 'REJECTED';
  saveDB(db);
  return true;
};

export const approveWithdrawal = async (userId: string, txId: string) => {
  const db = getDB();
  let user = db.users.find(u => u.id === userId);
  let tx;

  if (user) {
    tx = user.transactions.find(t => t.id.trim().toLowerCase() === txId.trim().toLowerCase());
  }

  if (!user || !tx) {
    for (const u of db.users) {
        const found = u.transactions.find(t => t.id.trim().toLowerCase() === txId.trim().toLowerCase());
        if (found) {
            user = u;
            tx = found;
            break;
        }
    }
  }

  if (!user || !tx) throw new Error("Transaction could not be found.");

  tx.status = 'APPROVED';
  saveDB(db);
  return true;
};

export const rejectWithdrawal = async (userId: string, txId: string, amount: number) => {
  const db = getDB();
  let user = db.users.find(u => u.id === userId);
  let tx;

  if (user) {
    tx = user.transactions.find(t => t.id.trim().toLowerCase() === txId.trim().toLowerCase());
  }

  if (!user || !tx) {
    for (const u of db.users) {
        const found = u.transactions.find(t => t.id.trim().toLowerCase() === txId.trim().toLowerCase());
        if (found) {
            user = u;
            tx = found;
            break;
        }
    }
  }

  if (!user || !tx) throw new Error("Transaction could not be found.");

  tx.status = 'REJECTED';
  
  const currentBalance = Number(user.balance);
  const refundAmount = Number(amount);
  
  if(isNaN(currentBalance)) {
      user.balance = refundAmount;
  } else {
      user.balance = currentBalance + refundAmount;
  }

  saveDB(db);
  return true;
};

export const getDatabaseString = (): string => {
  return localStorage.getItem(STORAGE_KEY) || '{"users":[]}';
};

export const importDatabaseString = (jsonString: string): boolean => {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && Array.isArray(parsed.users)) {
      localStorage.setItem(STORAGE_KEY, jsonString);
      window.dispatchEvent(new Event('storage-update'));
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

export const getMarketStats = async () => {
  return {
    totalActive: 1500 + Math.floor(Math.random() * 100),
    totalCirculation: 5000000 + Math.floor(Math.random() * 100000),
    chartData: PLANS.slice(0, 5).map(p => ({
      name: p.name.split('-')[0],
      count: Math.floor(Math.random() * 100)
    }))
  };
};
