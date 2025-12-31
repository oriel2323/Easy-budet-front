import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { BudgetWizard } from './components/BudgetWizard';
import { ReportView } from './components/ReportView';
import { api } from './services/api';
import { X, User, LogOut, Loader2 } from 'lucide-react';

type ViewState = 'landing' | 'wizard' | 'report';

function App() {
  const [view, setView] = useState<ViewState>('landing');
  const [userId, setUserId] = useState<number | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Routing State
  const [isCheckingRoute, setIsCheckingRoute] = useState(false);
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Helper to decide where to send the user
  const routeUser = async (id: number) => {
    setIsCheckingRoute(true);
    try {
        // Try to fetch profile. If successful, they have started the process -> Go to Report
        await api.businessProfile.get(id);
        setView('report');
    } catch (e) {
        // If error (usually 404), they haven't set up profile -> Go to Wizard
        setView('wizard');
    } finally {
        setIsCheckingRoute(false);
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('budget_user_id');
    if (storedUser) {
        const id = parseInt(storedUser);
        setUserId(id);
        routeUser(id);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
        let res;
        if (authMode === 'login') {
            res = await api.auth.login(email, password);
        } else {
            res = await api.auth.register(email, password, fullName);
        }

        if (res.success && res.user_id) {
            setUserId(res.user_id);
            localStorage.setItem('budget_user_id', res.user_id.toString());
            setShowAuthModal(false);
            
            // Reset form
            setEmail('');
            setPassword('');
            setFullName('');

            // Routing Logic
            if (authMode === 'register') {
                // New registration always needs setup
                setView('wizard');
            } else {
                // Login: Check if they already have data
                await routeUser(res.user_id);
            }
        } else {
            setAuthError(res.message || 'שגיאה בהתחברות');
        }
    } catch (err: any) {
        setAuthError(err.message || 'שגיאה בתקשורת');
    } finally {
        setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('budget_user_id');
    setUserId(null);
    setView('landing');
  };

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthError('');
    setShowAuthModal(true);
  };

  // Loading Screen for Routing
  if (isCheckingRoute) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center animate-fadeIn">
              <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                  <h2 className="text-xl font-bold text-gray-800">טוען נתונים...</h2>
                  <p className="text-gray-500 mt-2">אנא המתן בזמן שאנחנו מכינים את האזור האישי שלך</p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative" dir="rtl">
        {/* Top User Bar (Visible when logged in) */}
        {userId && view !== 'landing' && (
            <div className="bg-white border-b px-6 py-3 flex justify-between items-center sticky top-0 z-40 shadow-sm print:hidden">
                <div className="flex items-center gap-2 font-bold text-indigo-700">
                   <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5" />
                   </div>
                   <span>אזור אישי</span>
                </div>
                <div className="flex items-center gap-4">
                    {view === 'report' && (
                        <button 
                            onClick={() => setView('wizard')}
                            className="text-sm font-medium text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition"
                        >
                            ערוך נתונים
                        </button>
                    )}
                    <button 
                        onClick={handleLogout}
                        className="text-gray-500 hover:text-red-500 text-sm flex items-center gap-1 transition-colors px-3 py-1.5 hover:bg-red-50 rounded-lg"
                    >
                        <LogOut className="w-4 h-4" /> התנתק
                    </button>
                </div>
            </div>
        )}

        {/* Main Content Router */}
        {view === 'landing' && (
            <LandingPage 
                onLoginClick={() => openAuth('login')}
                onRegisterClick={() => openAuth('register')}
            />
        )}

        {view === 'wizard' && userId && (
            <BudgetWizard 
                userId={userId} 
                onComplete={() => setView('report')} 
            />
        )}

        {view === 'report' && userId && (
            <ReportView 
                userId={userId}
                onBack={() => setView('wizard')}
            />
        )}

        {/* Auth Modal */}
        {showAuthModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div 
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowAuthModal(false)}
                ></div>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fadeIn">
                    <div className="bg-indigo-600 p-6 text-white text-center relative">
                        <button 
                            onClick={() => setShowAuthModal(false)}
                            className="absolute top-4 left-4 text-white/70 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h2 className="text-2xl font-bold mb-1">{authMode === 'login' ? 'ברוכים השבים!' : 'צור חשבון חדש'}</h2>
                        <p className="text-indigo-100 text-sm">הכנס לניהול התקציב החכם שלך</p>
                    </div>
                    
                    <form onSubmit={handleAuth} className="p-8 space-y-4">
                        {authMode === 'register' && (
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">שם מלא</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>
                        )}
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">אימייל</label>
                            <input 
                                type="email" 
                                required 
                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">סיסמה</label>
                            <input 
                                type="password" 
                                required 
                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {authError && (
                            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg text-center">
                                {authError}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={authLoading}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-70 mt-2 flex items-center justify-center gap-2"
                        >
                            {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {authLoading ? 'מתחבר...' : (authMode === 'login' ? 'התחבר' : 'הרשם')}
                        </button>

                        <div className="text-center pt-2">
                            <button 
                                type="button"
                                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                                className="text-sm text-gray-500 hover:text-indigo-600"
                            >
                                {authMode === 'login' ? 'אין לך חשבון? הירשם כאן' : 'יש לך כבר חשבון? התחבר'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
}

export default App;