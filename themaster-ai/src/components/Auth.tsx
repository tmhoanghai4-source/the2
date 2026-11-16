import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { TranslationStrings } from '../types';

interface AuthProps {
  t: TranslationStrings;
  onSuccess: (user: any) => void;
  onCancel: () => void;
}

export const Auth: React.FC<AuthProps> = ({ t, onSuccess, onCancel }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    const body = isLogin ? { email, password } : { email, username, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.authFailed);
      
      onSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-secondary/80 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-2xl w-full max-w-md mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full space-y-8"
      >
        <button 
          onClick={onCancel}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-3 h-3" /> {t.authBackGuest}
        </button>

        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-text-primary">
            {isLogin ? t.authWelcome : t.authJoin}
          </h2>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-text-secondary">
            {isLogin ? t.authSubtitleLogin : t.authSubtitleSignup}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder={t.authUsernamePh}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              />
            </div>
          )}
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="email" 
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
            />
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="password" 
              placeholder={t.authPasswordPh}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isLogin ? (
              <><LogIn className="w-5 h-5" /> {t.authLoginBtn}</>
            ) : (
              <><UserPlus className="w-5 h-5" /> {t.authSignupBtn}</>
            )}
          </button>
        </form>

        <p className="text-center text-[10px] font-black uppercase tracking-widest text-text-secondary">
          {isLogin ? t.authNoAccount : t.authHaveAccount}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 text-blue-500 hover:text-blue-400 underline"
          >
            {isLogin ? t.authSwitchSignup : t.authSwitchLogin}
          </button>
        </p>
      </motion.div>
    </div>
  );
};
