import React, { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw, Trophy, Target, Award, Users, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

// Highly polished custom glossy green pawn SVG resembling the user's image
export const GreenPawnLogo: React.FC<{ size?: number; className?: string }> = ({ size = 64, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-[0_4px_12px_rgba(74,136,37,0.3)] ${className}`}
  >
    <defs>
      {/* 3D Glass/Glossy gradients to match the user's uploaded image pawn exactly */}
      <linearGradient id="pawnBodyGrad" x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stopColor="#8ade3f" />
        <stop offset="40%" stopColor="#5ea721" />
        <stop offset="85%" stopColor="#3d6c13" />
        <stop offset="100%" stopColor="#25440a" />
      </linearGradient>
      
      <linearGradient id="highlightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
        <stop offset="30%" stopColor="#ffffff" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      
      <radialGradient id="headGloss" cx="35%" cy="30%" r="45%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>

      <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    {/* Base shadow */}
    <ellipse cx="50" cy="85" rx="28" ry="6" fill="#000000" fillOpacity="0.4" />
    
    {/* Outline/Border for crisp rendering */}
    <path 
      d="M50 18 C58.284 18 65 24.716 65 33 C65 37.5 62.5 41.5 58.5 43.5 
         C58.5 43.5 60.5 47 50 48.5 
         C39.5 47 41.5 43.5 41.5 43.5
         C37.5 41.5 35 37.5 35 33 C35 24.716 41.716 18 50 18 Z" 
      fill="#29480a" 
    />
    
    {/* Pawn Head 3D Sphere */}
    <circle cx="50" cy="33" r="14" fill="url(#pawnBodyGrad)" stroke="#203a07" strokeWidth="1.5" />
    <circle cx="46" cy="29" r="10" fill="url(#headGloss)" />

    {/* Neck Ring collar */}
    <path 
      d="M36 48 C36 46 64 46 64 48 C64 50 36 50 36 48 Z" 
      fill="url(#pawnBodyGrad)" 
      stroke="#1c3306" 
      strokeWidth="1.2" 
    />
    
    {/* Pawn Main Body - Curvilinear base */}
    <path 
      d="M50 49 
         C43 49 42 55 42 63
         C42 71 31 78 31 82
         H69
         C69 78 58 71 58 63
         C58 55 57 49 50 49 Z" 
      fill="url(#pawnBodyGrad)" 
      stroke="#1c3306" 
      strokeWidth="1.5" 
      strokeLinejoin="round"
    />

    {/* Elegant Gloss Highlight curve on the left shoulder/edge */}
    <path 
      d="M45.5 52 
         C41 57 39 63 40 70
         C40.5 73.5 35 77.5 35 78.5" 
      stroke="url(#highlightGrad)" 
      strokeWidth="2.5" 
      strokeLinecap="round"
      fill="none"
    />
    
    {/* Base rim highlights */}
    <path 
      d="M33 81.5 C36 83.5 64 83.5 67 81.5" 
      stroke="#ffffff" 
      strokeWidth="1" 
      strokeLinecap="round" 
      strokeOpacity="0.4"
      fill="none" 
    />
  </svg>
);

interface ChessProfileWidgetProps {
  theme?: string;
}

export const ChessProfileWidget: React.FC<ChessProfileWidgetProps> = ({ theme = 'dark' }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/chess/profile');
      if (!res.ok) {
        throw new Error('Không thể đồng bộ dữ liệu Chess.com');
      }
      const jsonData = await res.json();
      setData(jsonData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi kết nối API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-2xl bg-white/[0.02] dark:bg-[#09090b]/50 border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 my-4">
        <div className="relative">
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <div className="absolute top-1 right-1">
            <GreenPawnLogo size={32} className="animate-pulse" />
          </div>
        </div>
        <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest animate-pulse">
          Chess.com · TMkingreal...
        </p>
      </div>
    );
  }

  // Fallback if there is an error or offline
  const profile = {
    ...(data?.profile || {}),
    username: 'tm_kingreal',
    name: 'TMkingreal',
    title: data?.profile?.title || 'MEMBER',
    followers: data?.profile?.followers ?? 12,
    avatar: data?.profile?.avatar || 'https://images.chesscomfiles.com/uploads/v1/user/153123880.fc3ca587.200x200o.e38c52e46e8c.png',
    url: 'https://www.chess.com/member/tm_kingreal'
  };

  const stats = data?.stats || {
    chess_rapid: { last: { rating: 1515 }, best: { rating: 1600 } },
    chess_blitz: { last: { rating: 1485 }, best: { rating: 1550 } },
    tactics: { highest: { rating: 2150 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl mx-auto bg-black/60 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl my-5 backdrop-blur-2xl"
    >
      {/* Top Banner Accent */}
      <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-green-600 w-full" />
      
      <div className="p-5 space-y-5">
        {/* Profile Card Header */}
        <div className="flex flex-col sm:flex-row items-center gap-4 relative">
          <div className="relative shrink-0 flex items-center justify-center">
            <img 
              src={profile.avatar} 
              alt={profile.name} 
              className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/30 shadow-lg relative z-10"
              referrerPolicy="no-referrer"
            />
            {profile.title && (
              <span className="absolute -bottom-1 z-25 bg-emerald-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tight shadow">
                {profile.title}
              </span>
            )}
          </div>

          <div className="text-center sm:text-left flex-1 min-w-0">
            <h4 className="text-sm font-black text-white leading-tight truncate flex items-center justify-center sm:justify-start gap-1.5">
              {profile.name}
              <span className="text-[10px] text-emerald-400 font-mono">(@{profile.username})</span>
            </h4>
            <p className="text-[10px] text-text-secondary mt-1">
              Followers: <span className="text-emerald-400 font-black">{profile.followers || 0}</span>
            </p>
            <div className="text-[9px] font-mono text-emerald-400/80 mt-1 flex items-center justify-center sm:justify-start gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1" />
              <span>TMkingreal (king)</span>
            </div>
          </div>
        </div>

        {/* Dynamic rating widgets */}
        <div className="grid grid-cols-3 gap-3">
          {/* Rapid */}
          <div className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 rounded-2xl p-3 flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-blue-400 uppercase tracking-wider font-bold">⏱️ Rapid</span>
              <Trophy size={11} className="text-blue-400" />
            </div>
            <div className="mt-2.5">
              <span className="text-lg font-black text-white font-mono">{stats.chess_rapid?.last?.rating || stats.chess_rapid?.rating || 1515}</span>
              <p className="text-[8px] text-text-secondary/60 mt-0.5">
                Cao nhất: {stats.chess_rapid?.best?.rating || 1515}
              </p>
            </div>
          </div>

          {/* Blitz */}
          <div className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 rounded-2xl p-3 flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-amber-500 uppercase tracking-wider font-bold">🔥 Blitz</span>
              <Target size={11} className="text-amber-500" />
            </div>
            <div className="mt-2.5">
              <span className="text-lg font-black text-white font-mono">{stats.chess_blitz?.last?.rating || stats.chess_blitz?.rating || 1485}</span>
              <p className="text-[8px] text-text-secondary/60 mt-0.5">
                Cao nhất: {stats.chess_blitz?.best?.rating || 1485}
              </p>
            </div>
          </div>

          {/* Tactics */}
          <div className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 rounded-2xl p-3 flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-purple-400 uppercase tracking-wider font-bold">🧩 Puzzles</span>
              <Award size={11} className="text-purple-400" />
            </div>
            <div className="mt-2.5">
              <span className="text-lg font-black text-white font-mono">{stats.tactics?.highest?.rating || stats.tactics?.rating || 2150}</span>
              <p className="text-[8px] text-text-secondary/60 mt-0.5">
                Tactics Skill level
              </p>
            </div>
          </div>
        </div>

        {/* Managed Clubs list */}
        <div className="space-y-2 border-t border-white/5 pt-3">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-text-secondary/80">
            <Users size={11} className="text-emerald-500" />
            <span>Câu lạc bộ thuộc quản lý & tham gia:</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a 
              href="https://www.chess.com/club/never-give-up-club-1"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-xl transition-all group"
            >
              <div className="truncate">
                <p className="text-[9px] font-black text-white">Never Give Up Club</p>
                <p className="text-[7px] text-text-secondary truncate">chess.com/club/never-give-up-club-1</p>
              </div>
              <ExternalLink size={9} className="text-emerald-400 opacity-60 group-hover:opacity-100 shrink-0 ml-1" />
            </a>

            <a 
              href="https://www.chess.com/club/vietnam-group"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 rounded-xl transition-all group"
            >
              <div className="truncate">
                <p className="text-[9px] font-black text-white">Vietnam Group</p>
                <p className="text-[7px] text-text-secondary truncate">chess.com/club/vietnam-group</p>
              </div>
              <ExternalLink size={9} className="text-blue-400 opacity-60 group-hover:opacity-100 shrink-0 ml-1" />
            </a>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-white/5 pt-3 text-[9px]">
          <button 
            onClick={fetchProfile}
            className="flex items-center gap-1.5 text-text-secondary hover:text-emerald-400 transition-colors"
            title="Đồng bộ lại"
          >
            <RefreshCw size={10} />
            <span>Đồng bộ thực tế</span>
          </button>
          
          <a
            href={profile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase rounded-lg tracking-wider transition-all"
          >
            <span>Chess.com Profile</span>
            <ExternalLink size={9} />
          </a>
        </div>
      </div>
    </motion.div>
  );
};
