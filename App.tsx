
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Home, PieChart, BarChart3, Wallet, User as UserIcon, Shield } from 'lucide-react';
import { AuthState, User } from './types';
import { getCurrentUser, subscribeToAuth } from './services/backend';

// Pages
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import MyPlansPage from './pages/MyPlansPage';
import MarketPage from './pages/MarketPage';
import WalletPage from './pages/WalletPage';
import ProfilePage from './pages/ProfilePage';
import ReferralPage from './pages/ReferralPage';
import AdminPage from './pages/AdminPage';
import GamePage from './pages/GamePage';

// Components
const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname === to;
  return (
    <div 
      onClick={() => navigate(to)}
      className={`flex flex-col items-center justify-center w-full h-full cursor-pointer transition-colors duration-300 ${isActive ? 'text-neonBlue' : 'text-slate-500 hover:text-slate-300'}`}
    >
      <Icon size={24} className={isActive ? 'drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : ''} />
      <span className="text-[10px] mt-1 font-medium">{label}</span>
    </div>
  );
};

const BottomNav = () => {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(getCurrentUser());
  
  useEffect(() => {
    const unsub = subscribeToAuth(u => setUser(u));
    return () => unsub();
  }, []);

  // Don't show nav on auth pages, game page, or for Admins
  if (location.pathname === '/auth' || location.pathname === '/game') return null;
  
  // ADMIN CHECK (Only 03281614102)
  if (user && user.mobile === '03281614102') {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-md border-t border-slate-800 flex justify-around items-center z-50 max-w-md mx-auto w-full">
      <NavItem to="/" icon={Home} label="Home" />
      <NavItem to="/plans" icon={PieChart} label="My Plans" />
      <NavItem to="/market" icon={BarChart3} label="Market" />
      <NavItem to="/wallet" icon={Wallet} label="Wallet" />
      <NavItem to="/profile" icon={UserIcon} label="Profile" />
    </div>
  );
};

const ProtectedRoute = ({ children, user, adminOnly = false }: { children?: React.ReactNode, user: User | null, adminOnly?: boolean }) => {
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  const isAdmin = user.mobile === '03281614102';
  
  // If user is Admin, they should ONLY see Admin Page. 
  // If they try to access normal pages, redirect to /admin
  if (isAdmin && !adminOnly) {
     return <Navigate to="/admin" replace />;
  }

  // If normal user tries to access Admin page
  if (!isAdmin && adminOnly) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-neonBlue">
        <div className="animate-pulse-slow text-2xl font-bold tracking-widest">STOCKGROW</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-slate-100 font-sans pb-0 max-w-md mx-auto shadow-2xl overflow-hidden relative border-x border-slate-800">
      <Routes>
        <Route path="/auth" element={user ? (
            // Redirect based on role (Mobile)
            user.mobile === '03281614102'
              ? <Navigate to="/admin" /> 
              : <Navigate to="/" />
          ) : <AuthPage />} 
        />
        
        {/* Normal User Routes */}
        <Route path="/" element={<ProtectedRoute user={user}><HomePage /></ProtectedRoute>} />
        <Route path="/plans" element={<ProtectedRoute user={user}><MyPlansPage /></ProtectedRoute>} />
        <Route path="/market" element={<ProtectedRoute user={user}><MarketPage /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute user={user}><WalletPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute user={user}><ProfilePage /></ProtectedRoute>} />
        <Route path="/referral" element={<ProtectedRoute user={user}><ReferralPage /></ProtectedRoute>} />
        <Route path="/game" element={<ProtectedRoute user={user}><GamePage /></ProtectedRoute>} />
        
        {/* Admin Route */}
        <Route path="/admin" element={<ProtectedRoute user={user} adminOnly={true}><AdminPage /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
