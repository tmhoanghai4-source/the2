
import React, { useMemo } from 'react';

const RadioactiveBackground: React.FC = () => {
  const particles = useMemo(() => {
    return [...Array(40)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      dx: (Math.random() - 0.5) * 200 + 'px',
      dy: (Math.random() - 0.5) * 200 + 'px',
      duration: (Math.random() * 10 + 10) + 's',
      delay: Math.random() * 10 + 's',
      size: Math.random() * 4 + 2
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      <div className="absolute inset-0 bg-[#050a05]" />
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#00ff00 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      <div className="scanline" />
      <div className="nuclear-symbol-bg">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12C20,14.07 19.21,15.96 17.92,17.38L13,12.46V7H11V12.46L6.08,17.38C4.79,15.96 4,14.07 4,12A8,8 0 0,1 12,4M12,13A1,1 0 0,0 11,14A1,1 0 0,0 12,15A1,1 0 0,0 13,14A1,1 0 0,0 12,13Z" /></svg>
      </div>
      {particles.map(p => (
        <div 
          key={p.id}
          className="radiation-particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            '--dx': p.dx,
            '--dy': p.dy,
            '--duration': p.duration,
            animationDelay: p.delay
          } as any}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-900/5 to-green-900/20" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }} />
    </div>
  );
};

export default RadioactiveBackground;
