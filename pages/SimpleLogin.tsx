
import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import { useSimpleAuth } from '../context/SimpleAuthContext';
import { logLoginAttempt } from '../services/authLogService';
import { getStoredData } from '../services/storageService';
import { AppData } from '../types';

const ADMIN_PASSCODE = "AmtEvent1$";

const SimpleLogin: React.FC = () => {
  const { login } = useSimpleAuth();
  const [data, setData] = useState<AppData>(getStoredData());
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync with data source updates
  const refreshData = useCallback(() => {
    setData(getStoredData());
  }, []);

  useEffect(() => {
    window.addEventListener('hardy-storage-update', refreshData);
    return () => window.removeEventListener('hardy-storage-update', refreshData);
  }, [refreshData]);

  const theme = data.theme;
  const logoUrl = theme.logoUrl;
  const schoolName = data.schoolName;

  const isFormValid = email.trim().length > 0 && passcode.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    setError('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 800));

    const lowercaseEmail = email.toLowerCase().trim();
    
    if (!lowercaseEmail.endsWith('@schools.nyc.gov')) {
      logLoginAttempt(lowercaseEmail, false, 'invalid_email_domain');
      setError('Unauthorized domain. Staff email required (@schools.nyc.gov).');
      setLoading(false);
      return;
    }

    if (passcode !== ADMIN_PASSCODE) {
      logLoginAttempt(lowercaseEmail, false, 'wrong_passcode');
      setError('Invalid security passcode. Access denied.');
      setLoading(false);
      return;
    }

    logLoginAttempt(lowercaseEmail, true, 'success');
    login(lowercaseEmail);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 overflow-hidden bg-black select-none">
      {/* Background using CSS Variables */}
      <div 
        className="absolute inset-0 transition-all duration-1000"
        style={{ 
          background: `linear-gradient(160deg, var(--gradient-start) 0%, var(--gradient-end) 100%)` 
        }}
      ></div>
      
      {/* Animated Accents using CSS Variables */}
      <div 
        className="absolute top-[10%] left-[5%] w-[50vw] h-[50vw] rounded-full blur-[140px] animate-pulse opacity-20 pointer-events-none"
        style={{ backgroundColor: 'var(--accent-color)' }}
      ></div>
      <div 
        className="absolute bottom-[10%] right-[5%] w-[40vw] h-[40vw] rounded-full blur-[120px] animate-pulse delay-1000 opacity-15 pointer-events-none"
        style={{ backgroundColor: 'var(--accent-color)' }}
      ></div>
      
      {/* Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      <div className="max-w-md w-full relative z-10 animate-in fade-in zoom-in duration-700">
        <div 
          className="glass-panel rounded-[2.5rem] p-12 border shadow-2xl backdrop-blur-3xl bg-white/5 flex flex-col items-center"
          style={{ borderColor: 'var(--glass-border)' }}
        >
          {/* Logo Section */}
          <div className="w-28 h-28 bg-white/5 rounded-3xl flex items-center justify-center mb-8 shadow-2xl border border-white/10 overflow-hidden group transition-all duration-500 hover:scale-105">
            {logoUrl ? (
              <img src={logoUrl} className="w-full h-full object-contain p-3" alt="School Logo" />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, var(--accent-color), var(--gradient-end))` }}
              >
                <ShieldCheck className="w-14 h-14 text-white" />
              </div>
            )}
          </div>

          <h1 className="text-3xl font-black mb-2 tracking-tight text-white text-center leading-tight drop-shadow-lg">
            {schoolName}
          </h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.5em] mb-12 opacity-60 text-center">Identity Verification</p>

          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <div className="space-y-1.5">
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="email"
                  placeholder="DOE Staff Email (@schools.nyc.gov)"
                  required
                  className="w-full pl-14 pr-6 py-5 bg-black/40 border border-white/10 rounded-2xl focus:outline-none transition-all text-sm font-semibold text-white placeholder-slate-600 focus:ring-2"
                  style={{ '--tw-ring-color': `var(--accent-color)` } as any}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="password"
                  placeholder="Admin Passcode"
                  required
                  className="w-full pl-14 pr-6 py-5 bg-black/40 border border-white/10 rounded-2xl focus:outline-none transition-all text-sm font-semibold text-white placeholder-slate-600 focus:ring-2"
                  style={{ '--tw-ring-color': `var(--accent-color)` } as any}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold leading-relaxed text-center flex items-center justify-center gap-3 animate-in slide-in-from-top-2 duration-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isFormValid}
              style={{ 
                backgroundColor: isFormValid ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                color: isFormValid ? '#fff' : 'rgba(255,255,255,0.3)',
                boxShadow: isFormValid ? `0 10px 30px -10px var(--accent-color)` : 'none'
              }}
              className="w-full py-5 font-black rounded-2xl text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] mt-6 hover:brightness-110 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Log In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-14 opacity-30 text-[9px] font-black uppercase tracking-[0.4em] flex items-center gap-3">
            <span className="w-10 h-px bg-white/50"></span>
            Hardy Signage OS
            <span className="w-10 h-px bg-white/50"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleLogin;
