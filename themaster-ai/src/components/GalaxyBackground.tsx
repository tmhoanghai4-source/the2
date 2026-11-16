
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Theme } from '../types';

export const SpaceDust: React.FC = () => {
  const particles = useMemo(() => {
    return [...Array(20)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 3 + 1}px`,
      duration: `${Math.random() * 10 + 10}s`,
      delay: `${Math.random() * 5}s`,
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <div 
          key={p.id}
          className="absolute bg-white/20 rounded-full blur-[1px]"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animation: `float ${p.duration} linear infinite`,
            animationDelay: p.delay,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          20% { opacity: 0.5; }
          80% { opacity: 0.5; }
          100% { transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

interface GalaxyBackgroundProps {
  scrollOffset: number;
  isWarping: boolean;
  isBlackHoleActive: boolean;
  isShrinking: boolean;
  accretionIntensity: number;
  supernovaTrigger: number;
  isThinking: boolean;
  isAssistantResponding: boolean;
}

const GalaxyBackground: React.FC<GalaxyBackgroundProps> = ({ 
  isWarping, 
  supernovaTrigger, 
  isThinking, 
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mouseVelocity, setMouseVelocity] = useState(0);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const [shootingStars, setShootingStars] = useState<{id: number, left: string, top: string, delay: string}[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<{x: number, y: number, vx: number, vy: number, life: number, maxLife: number, size: number, color: string}[]>([]);
  
  const stars = useMemo(() => {
    return [...Array(100)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 2 + 1,
      delay: Math.random() * 5,
      depth: Math.random() * 0.5 + 0.1, 
      brightness: Math.random() * 0.7 + 0.3
    }));
  }, []);

  useEffect(() => {
    let lastTime = Date.now();
    let animationFrameId: number;
    let mouseRafId: number | null = null;
    let latestMouse = { x: 0, y: 0, velocity: 0 };
    let mouseTimeout: NodeJS.Timeout;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      const dt = now - lastTime;
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      const velocity = dt > 0 ? Math.sqrt(dx * dx + dy * dy) / dt : 0;

      if (Math.random() > 0.3) {
        particlesRef.current.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 1,
          maxLife: Math.random() * 0.5 + 0.5,
          size: Math.random() * 2 + 1,
          color: Math.random() > 0.5 ? '#a855f7' : '#06b6d4'
        });
      }

      latestMouse = { x: e.clientX, y: e.clientY, velocity };
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      lastTime = now;

      if (mouseRafId === null) {
        mouseRafId = requestAnimationFrame(() => {
          mouseRafId = null;
          setMousePos({ x: latestMouse.x, y: latestMouse.y });
          setMouseVelocity(latestMouse.velocity);
        });
      }

      clearTimeout(mouseTimeout);
      mouseTimeout = setTimeout(() => {
        setMouseVelocity(0);
      }, 100);
    };
    
    const renderCanvas = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            
            if (p.life <= 0) {
              particlesRef.current.splice(i, 1);
            } else {
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
              ctx.fillStyle = p.color;
              ctx.globalAlpha = p.life / p.maxLife;
              ctx.fill();
            }
          }
          ctx.globalAlpha = 1;
        }
      }
      animationFrameId = requestAnimationFrame(renderCanvas);
    };
    
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    handleResize();
    renderCanvas();
    
    const starInterval = setInterval(() => {
      const chance = isThinking ? 0.9 : 0.4;
      if (Math.random() < chance) {
        const id = Date.now();
        setShootingStars(prev => [...prev.slice(-3), {
          id,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 40}%`,
          delay: `0s`
        }]);
      }
    }, isThinking ? 800 : 2500);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      clearInterval(starInterval);
      clearTimeout(mouseTimeout);
      if (mouseRafId !== null) cancelAnimationFrame(mouseRafId);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isThinking]);

  const nearbyStars = useMemo(() => {
    if (mouseVelocity > 0.8) return [];
    
    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;
    
    return stars
      .map(s => {
        const x = (s.left / 100) * innerWidth;
        const y = (s.top / 100) * innerHeight;
        const dx = x - mousePos.x;
        const dy = y - mousePos.y;
        const distSq = dx * dx + dy * dy; 
        return { ...s, distSq, x, y };
      })
      .filter(s => s.distSq < 22500) 
      .sort((a, b) => a.distSq - b.distSq)
      .slice(0, 6);
  }, [mousePos.x, mousePos.y, mouseVelocity, stars]);

  const [isSupernova, setIsSupernova] = useState(false);

  useEffect(() => {
    if (supernovaTrigger > 0) {
      setIsSupernova(true);
      setTimeout(() => setIsSupernova(false), 6000); 
    }
  }, [supernovaTrigger]);

  const nebulaColors = isThinking 
    ? 'radial-gradient(circle at 20% 30%, rgba(239, 68, 68, 0.2) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(245, 158, 11, 0.2) 0%, transparent 60%)'
    : 'radial-gradient(circle at 20% 30%, rgba(124, 58, 237, 0.15) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(37, 99, 235, 0.15) 0%, transparent 60%)';

  return (
    <div className={`fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-[#010103]`}>
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 pointer-events-none z-10"
      />
      <div 
        className={`nebula ${isThinking ? 'animate-nebula-pulse' : ''}`}
        style={{ 
          background: nebulaColors,
          transition: 'background 1s ease-in-out'
        }}
      />

      <div 
        className={`absolute inset-0 transition-opacity duration-[5000ms] ease-out pointer-events-none ${isSupernova ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.3) 0%, rgba(124, 58, 237, 0.1) 40%, transparent 80%)',
          zIndex: 5
        }}
      />
      
      {stars.map(star => (
        <div 
          key={star.id}
          className={`star ${isWarping ? 'star-warp' : ''} ${isSupernova ? 'supernova-star' : ''}`}
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            opacity: star.brightness,
            transform: isWarping 
              ? 'none' 
              : `translate(${(mousePos.x - window.innerWidth / 2) * star.depth * 0.1}px, ${(mousePos.y - window.innerHeight / 2) * star.depth * 0.1}px)`
          }}
        />
      ))}

      {shootingStars.map(star => (
        <div 
          key={star.id}
          className="shooting-star"
          style={{
            left: star.left,
            top: star.top,
          }}
        />
      ))}
      
      {nearbyStars.length > 1 && nearbyStars.map((s1, i) => {
        const s2 = nearbyStars[i + 1];
        if (!s2) return null;
        const dx = s2.x - s1.x;
        const dy = s2.y - s1.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        return (
          <div 
            key={`line-${i}`}
            className="constellation-line"
            style={{
              left: s1.x,
              top: s1.y,
              width: Math.sqrt(dx * dx + dy * dy),
              transform: `rotate(${angle}deg)`,
              opacity: (1 - Math.sqrt(s1.distSq) / 150) * 0.4
            }}
          />
        );
      })}

      <style>{`
          @keyframes shake {
            0% { transform: translate(1px, 1px) rotate(0deg); }
            10% { transform: translate(-1px, -2px) rotate(-1deg); }
            20% { transform: translate(-3px, 0px) rotate(1deg); }
            30% { transform: translate(3px, 2px) rotate(0deg); }
            40% { transform: translate(1px, -1px) rotate(1deg); }
            50% { transform: translate(-1px, 2px) rotate(-1deg); }
            60% { transform: translate(-3px, 1px) rotate(0deg); }
            70% { transform: translate(3px, 1px) rotate(-1deg); }
            80% { transform: translate(-1px, -1px) rotate(1deg); }
            90% { transform: translate(1px, 2px) rotate(0deg); }
            100% { transform: translate(1px, -2px) rotate(-1deg); }
          }
          @keyframes super-shake {
            0% { transform: translate(0,0) rotate(0deg); }
            25% { transform: translate(-10px, -10px) rotate(-5deg); }
            50% { transform: translate(10px, 10px) rotate(5deg); }
            75% { transform: translate(-10px, 10px) rotate(-5deg); }
            100% { transform: translate(0,0) rotate(0deg); }
          }
          .shake { animation: shake 0.5s; }
          .super-shake { animation: super-shake 0.2s infinite; }
          .white-flash { animation: flash 0.2s ease-out; }
          @keyframes flash { 0% { opacity: 1; } 100% { opacity: 0; } }
          .gravitational-lensing { filter: blur(2px) contrast(1.2); }
          .warp-effect { transform: scale(0.95) skew(2deg, 2deg); }
        `}</style>
    </div>
  );
};

export default GalaxyBackground;
