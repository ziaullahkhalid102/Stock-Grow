
export enum PlanStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  MATURED = 'MATURED'
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  duration: number; // in days
  dailyProfitPercent: number;
  totalReturn: number;
  color: string;
}

export interface UserPlan extends Plan {
  purchaseDate: string; // ISO string
  status: PlanStatus;
  progressDays: number;
  earnedSoFar: number;
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'REFERRAL' | 'GAME_WIN' | 'GAME_LOSS' | 'PLAN_BUY';
  amount: number;
  method: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  balance: number;
  isVerified: boolean;
  plans: UserPlan[];
  transactions: Transaction[];
  // Referral System
  referralCode: string;
  referredBy?: string | null;
  referralEarnings: number;
  referralCount: number;
  role?: 'USER' | 'ADMIN';
}

export type AuthState = 'SPLASH' | 'LOGIN' | 'SIGNUP' | 'OTP' | 'AUTHENTICATED' | 'FORGOT_PASSWORD';
