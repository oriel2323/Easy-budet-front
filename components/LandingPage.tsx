import React from 'react';
import { Sparkles, ArrowLeft, TrendingUp, Utensils, Wallet, BarChart3, CheckCircle2 } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}
//
export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onRegisterClick }) => {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/50">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span>Budget AI</span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-gray-300">
          <a href="#" className="hover:text-white transition-colors">איך זה עובד?</a>
          <a href="#" className="hover:text-white transition-colors">פיצ'רים</a>
          <a href="#" className="hover:text-white transition-colors">מחירים</a>
        </div>
        <button
          onClick={onLoginClick}
          className="px-5 py-2 rounded-full border border-white/20 hover:bg-white/10 transition text-sm font-medium backdrop-blur-sm"
        >
          התחברות
        </button>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 text-center md:text-right space-y-8 z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>בינה מלאכותית לניהול הכסף שלך</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-[1.1]">
            תפסיק לנחש,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              תתחיל לשלוט.
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto md:mx-0 leading-relaxed font-light">
            הפלטפורמה החכמה שמנתחת את ההוצאות שלך, חוזה את העתיד הכלכלי שלך
            ועוזרת לך לחסוך בצורה אוטומטית - והכל במקום אחד.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-4">
            <button
              onClick={onRegisterClick}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/30 transition-all transform hover:scale-105 flex items-center justify-center gap-3"
            >
              התחל בחינם עכשיו
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium border border-white/10 transition backdrop-blur-sm">
              צפה בדמו
            </button>
          </div>
        </div>

        {/* Visual Element */}
        <div className="flex-1 relative w-full max-w-lg mt-10 md:mt-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-indigo-600/20 blur-[100px] -z-10 rounded-full"></div>

          <div className="relative z-10 bg-gray-900/40 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl transform rotate-[-2deg] hover:rotate-0 transition duration-500">
            {/* Fake Dashboard Card */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-gray-400 text-xs mb-1">יתרה צפויה</p>
                <p className="text-3xl font-bold tracking-tight">₪12,450</p>
              </div>
              <div className="w-10 h-10 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            {/* Fake Chart Bars */}
            <div className="h-32 flex items-end justify-between gap-2 mb-6 px-2">
              {[40, 60, 30, 80, 50, 75, 45].map((h, i) => (
                <div key={i} className="w-full bg-indigo-500/30 rounded-t-sm hover:bg-indigo-500/60 transition-colors cursor-pointer" style={{ height: `${h}%` }}></div>
              ))}
            </div>

            {/* Recent Transaction */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center">
                  <Utensils className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">מסעדה</p>
                  <p className="text-xs text-gray-500">לפני שעה</p>
                </div>
                <p className="font-bold text-red-400">-₪120</p>
              </div>
            </div>
          </div>

          {/* Floating Badge */}
          <div className="absolute -top-6 -right-6 bg-gray-800/80 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-xl animate-bounce duration-[3000ms]">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
              <span className="text-sm font-medium">ה-AI מנתח...</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid (Quick Glimpse) */}
      <div className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-right">
          <div className="p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition border border-white/5">
            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mb-4 mx-auto md:mx-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">תחזית שנתית</h3>
            <p className="text-gray-400 text-sm">ראה את העתיד הפיננסי שלך בשניות עם דוחות חכמים.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition border border-white/5">
            <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center mb-4 mx-auto md:mx-0">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">ניהול תקציב</h3>
            <p className="text-gray-400 text-sm">הגדר יעדים ועקוב אחר ההוצאות הקבועות והמשתנות בקלות.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition border border-white/5">
            <div className="w-12 h-12 bg-pink-500/20 text-pink-400 rounded-xl flex items-center justify-center mb-4 mx-auto md:mx-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">פשטות מירבית</h3>
            <p className="text-gray-400 text-sm">ממשק נוח ואינטואיטיבי שמותאם לבעלי עסקים עסוקים.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
