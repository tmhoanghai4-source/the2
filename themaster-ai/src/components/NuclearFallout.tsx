import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export type NukeStage = 'idle' | 'countdown' | 'missile' | 'flash' | 'explosion' | 'emp-blackout' | 'aftermath';

interface NuclearFalloutProps {
  stage: NukeStage;
  onComplete?: () => void;
  center?: { x: number; y: number };
}

interface PuffParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  targetRadius: number;
  kind: 'fireball' | 'cap' | 'torus' | 'stem' | 'surge' | 'ember' | 'ash' | 'debris';
  heat: number; // 1.0 (white-hot plasma) -> 0.0 (cool smoke)
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
  swirlPhase: number;
  swirlSign: number;
}

interface TrailDot {
  x: number;
  y: number;
  r: number;
  life: number;
}

const sampleKelvinColor = (heat: number, alpha: number): [string, string, string] => {
  const h = Math.max(0, Math.min(1, heat));
  if (h > 0.82) {
    return [
      `rgba(255, 255, 255, ${alpha})`,
      `rgba(255, 240, 175, ${alpha * 0.9})`,
      `rgba(255, 175, 55, 0)`,
    ];
  }
  if (h > 0.58) {
    return [
      `rgba(255, 232, 145, ${alpha * 0.95})`,
      `rgba(255, 132, 24, ${alpha * 0.8})`,
      `rgba(210, 48, 0, 0)`,
    ];
  }
  if (h > 0.34) {
    return [
      `rgba(255, 128, 28, ${alpha * 0.88})`,
      `rgba(168, 36, 8, ${alpha * 0.65})`,
      `rgba(54, 34, 28, 0)`,
    ];
  }
  if (h > 0.14) {
    return [
      `rgba(148, 42, 16, ${alpha * 0.72})`,
      `rgba(56, 46, 44, ${alpha * 0.62})`,
      `rgba(28, 26, 26, 0)`,
    ];
  }
  const shade = Math.round(32 + (0.14 - h) * 140);
  return [
    `rgba(${shade + 12}, ${shade + 8}, ${shade + 6}, ${alpha * 0.62})`,
    `rgba(${shade}, ${shade - 2}, ${shade - 4}, ${alpha * 0.42})`,
    `rgba(18, 18, 20, 0)`,
  ];
};

export const NuclearFallout: React.FC<NuclearFalloutProps> = ({ stage, center }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const particlesRef = useRef<PuffParticle[]>([]);
  const trailRef = useRef<TrailDot[]>([]);
  const rafRef = useRef<number | undefined>(undefined);
  const stageStartRef = useRef<number>(0);
  const explosionStartRef = useRef<number>(0);

  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  });

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const getAudioCtx = (): AudioContext | null => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return null;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new Ctx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  };

  const playIncomingSfx = () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Aerodynamic falling whistle + radar lock chirp
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.72);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.75);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.78);
  };

  const playThermalCrackSfx = () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const length = Math.floor(ctx.sampleRate * 0.25);
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime(1800, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    src.connect(hp);
    hp.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
  };

  const playDetonationSfx = () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Sub-bass chest-thump concussion (58Hz -> 18Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(64, now);
    subOsc.frequency.exponentialRampToValueAtTime(18, now + 1.8);
    subGain.gain.setValueAtTime(0.55, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 2.45);

    // 2. Brownian blast roar
    const roarDur = 3.2;
    const sampleLen = Math.floor(ctx.sampleRate * roarDur);
    const buf = ctx.createBuffer(1, sampleLen, ctx.sampleRate);
    const out = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < sampleLen; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.04 * white) / 1.04;
      const env = Math.exp(-i / (ctx.sampleRate * 1.15));
      out[i] = Math.max(-1, Math.min(1, last * 4.5 * env));
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, now);
    lp.frequency.exponentialRampToValueAtTime(110, now + 2.8);
    const roarGain = ctx.createGain();
    roarGain.gain.setValueAtTime(0.5, now);
    roarGain.gain.exponentialRampToValueAtTime(0.001, now + roarDur);
    noiseSrc.connect(lp);
    lp.connect(roarGain);
    roarGain.connect(ctx.destination);
    noiseSrc.start(now);
  };

  const groundX = center?.x ?? viewport.width / 2;
  const groundY = Math.min(viewport.height - 24, Math.max(viewport.height * 0.45, center?.y ?? viewport.height * 0.85));

  const spawnDetonation = () => {
    const items: PuffParticle[] = [];

    // 1. Central blinding fireball core
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2.4;
      const baseR = 26 + Math.random() * 34;
      items.push({
        x: groundX + (Math.random() - 0.5) * 18,
        y: groundY - 14 + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.6 - 1.2,
        radius: baseR * 0.45,
        targetRadius: baseR * 1.9,
        kind: 'fireball',
        heat: 1.0,
        alpha: 0.95,
        life: 0,
        maxLife: 1.8 + Math.random() * 0.8,
        gravity: -0.02,
        drag: 0.95,
        swirlPhase: Math.random() * Math.PI * 2,
        swirlSign: Math.random() > 0.5 ? 1 : -1,
      });
    }

    // 2. Mach stem & base surge collar blasting horizontally along chat horizon
    for (let i = 0; i < 42; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      const speed = (2.8 + Math.random() * 9.5) * dir;
      items.push({
        x: groundX + dir * (4 + Math.random() * 14),
        y: groundY - Math.random() * 10,
        vx: speed,
        vy: -Math.random() * 1.1,
        radius: 14 + Math.random() * 18,
        targetRadius: 34 + Math.random() * 44,
        kind: 'surge',
        heat: 0.55 + Math.random() * 0.3,
        alpha: 0.72,
        life: 0,
        maxLife: 2.3 + Math.random() * 1.2,
        gravity: -0.004,
        drag: 0.935,
        swirlPhase: Math.random() * Math.PI * 2,
        swirlSign: dir,
      });
    }

    // 3. Incandescent embers & supersonic debris scattered radially from the chat bar
    for (let i = 0; i < 110; i++) {
      const angle = -Math.PI * (0.04 + Math.random() * 0.92);
      const speed = 4 + Math.random() * 14;
      items.push({
        x: groundX + (Math.random() - 0.5) * 40,
        y: groundY - 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.4 + Math.random() * 2.4,
        targetRadius: 1.4,
        kind: 'ember',
        heat: 0.85 + Math.random() * 0.15,
        alpha: 1,
        life: 0,
        maxLife: 1.4 + Math.random() * 1.8,
        gravity: 0.19,
        drag: 0.97,
        swirlPhase: Math.random() * Math.PI * 2,
        swirlSign: 1,
      });
    }

    particlesRef.current = items;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (stage === 'idle') {
      particlesRef.current = [];
      trailRef.current = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    stageStartRef.current = performance.now();

    if (stage === 'missile') {
      trailRef.current = [];
      playIncomingSfx();
    } else if (stage === 'flash') {
      playThermalCrackSfx();
    } else if (stage === 'explosion') {
      explosionStartRef.current = performance.now();
      spawnDetonation();
      playDetonationSfx();
    }

    let prevTime = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.008, (now - prevTime) / 1000));
      prevTime = now;

      const stageElapsed = (now - stageStartRef.current) / 1000;
      const blastElapsed = explosionStartRef.current > 0 ? (now - explosionStartRef.current) / 1000 : 0;

      ctx.clearRect(0, 0, viewport.width, viewport.height);

      // 1. MISSILE DESCENT PHASE
      if (stage === 'missile') {
        const dur = 0.75;
        const p = Math.min(1, stageElapsed / dur);
        const eased = p * p;
        const startX = Math.min(viewport.width - 40, groundX + viewport.width * 0.28);
        const startY = -30;
        const mx = startX + (groundX - startX) * eased;
        const my = startY + (groundY - startY) * eased;

        trailRef.current.push({ x: mx, y: my, r: 4 + Math.random() * 4, life: 1 });

        // Vapor & Plasma Contrail
        for (const dot of trailRef.current) {
          dot.life -= dt * 1.4;
          if (dot.life <= 0) continue;
          const g = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, dot.r * (2.6 - dot.life));
          g.addColorStop(0, `rgba(255, 220, 150, ${dot.life * 0.55})`);
          g.addColorStop(0.5, `rgba(220, 210, 200, ${dot.life * 0.24})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dot.r * (2.6 - dot.life), 0, Math.PI * 2);
          ctx.fill();
        }

        // Warhead + bow-shock glow
        const angle = Math.atan2(groundY - startY, groundX - startX);
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(angle - Math.PI / 2);

        const noseGlow = ctx.createRadialGradient(0, 4, 1, 0, 4, 24);
        noseGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        noseGlow.addColorStop(0.35, 'rgba(255, 160, 40, 0.75)');
        noseGlow.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.fillStyle = noseGlow;
        ctx.beginPath();
        ctx.arc(0, 4, 24, 0, Math.PI * 2);
        ctx.fill();

        // Sleek aerodynamic warhead body
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.lineTo(-4.5, -18);
        ctx.lineTo(4.5, -18);
        ctx.closePath();
        ctx.fill();

        // Exhaust plume
        const plume = ctx.createLinearGradient(0, -18, 0, -48 - Math.random() * 14);
        plume.addColorStop(0, 'rgba(255, 245, 200, 0.95)');
        plume.addColorStop(0.45, 'rgba(255, 120, 20, 0.65)');
        plume.addColorStop(1, 'rgba(255, 40, 0, 0)');
        ctx.fillStyle = plume;
        ctx.beginPath();
        ctx.moveTo(-3.5, -18);
        ctx.lineTo(0, -48 - Math.random() * 14);
        ctx.lineTo(3.5, -18);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      // 2. EXPLOSION & VOLUMETRIC MUSHROOM CLOUD
      if (stage === 'explosion' || stage === 'emp-blackout' || stage === 'aftermath') {
        const isAftermath = stage === 'aftermath';
        const fadeOutMultiplier = isAftermath ? Math.max(0, 1 - stageElapsed / 1.8) : 1;

        // Ambient sky illumination
        if (blastElapsed < 2.2) {
          const skyGlowAlpha = Math.max(0, 0.36 * (1 - blastElapsed / 2.2));
          const skyGlow = ctx.createRadialGradient(
            groundX,
            groundY - 60,
            20,
            groundX,
            groundY - 60,
            Math.max(viewport.width, viewport.height) * 0.75
          );
          skyGlow.addColorStop(0, `rgba(255, 190, 95, ${skyGlowAlpha})`);
          skyGlow.addColorStop(0.4, `rgba(255, 95, 15, ${skyGlowAlpha * 0.5})`);
          skyGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = skyGlow;
          ctx.fillRect(0, 0, viewport.width, viewport.height);
        }

        // Expanding Wilson Condensation Cloud Dome (realistic translucent atmospheric pressure shell)
        if (blastElapsed > 0.08 && blastElapsed < 1.35) {
          const wp = (blastElapsed - 0.08) / 1.27;
          const wAlpha = Math.sin(wp * Math.PI) * 0.42;
          const rx = 55 + wp * Math.min(340, viewport.width * 0.34);
          const ry = 40 + wp * Math.min(200, viewport.height * 0.28);
          const wg = ctx.createRadialGradient(groundX, groundY - ry * 0.3, rx * 0.55, groundX, groundY - ry * 0.3, rx);
          wg.addColorStop(0, 'rgba(255, 255, 255, 0)');
          wg.addColorStop(0.72, `rgba(248, 250, 252, ${wAlpha * 0.65})`);
          wg.addColorStop(0.92, `rgba(255, 255, 255, ${wAlpha})`);
          wg.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = wg;
          ctx.beginPath();
          ctx.ellipse(groundX, groundY - 22, rx, ry, 0, Math.PI, Math.PI * 2);
          ctx.fill();
        }

        // Continuously rise & curl the Mushroom Cloud stem + toroidal vortex cap for ~2.2s
        const riseMax = Math.min(viewport.height * 0.58, 430);
        const riseProgress = 1 - Math.pow(1 - Math.min(1, blastElapsed / 1.65), 2.6);
        const capCenterY = groundY - 40 - riseProgress * riseMax;

        if (!isAftermath && blastElapsed < 2.1) {
          // Convective Stem (upward turbulent draft from ground crater)
          for (let i = 0; i < 4; i++) {
            const hRatio = Math.random();
            const spawnY = groundY - hRatio * (groundY - capCenterY);
            const neckWidth = 10 + (1 - Math.sin(hRatio * Math.PI)) * 12;
            particlesRef.current.push({
              x: groundX + (Math.random() - 0.5) * neckWidth,
              y: spawnY,
              vx: (Math.random() - 0.5) * 0.6,
              vy: -1.9 - Math.random() * 1.8,
              radius: 14 + Math.random() * 14,
              targetRadius: 28 + Math.random() * 20,
              kind: 'stem',
              heat: Math.max(0.08, 0.72 - blastElapsed * 0.28 + hRatio * 0.2),
              alpha: 0.65,
              life: 0,
              maxLife: 1.7 + Math.random() * 0.9,
              gravity: -0.015,
              drag: 0.96,
              swirlPhase: Math.random() * Math.PI * 2,
              swirlSign: Math.random() > 0.5 ? 1 : -1,
            });
          }

          // Toroidal Rolling Mushroom Cap (expanding horizontally, curling down at rim)
          const capWidth = (55 + riseProgress * 125);
          const capHeight = (28 + riseProgress * 55);
          for (let i = 0; i < 7; i++) {
            const theta = Math.random() * Math.PI * 2;
            const px = groundX + Math.cos(theta) * capWidth * (0.35 + Math.random() * 0.65);
            const domeFlatten = Math.sin(theta) > 0 ? 0.28 : 0.95;
            const py = capCenterY + Math.sin(theta) * capHeight * domeFlatten;
            const isRim = Math.abs(Math.cos(theta)) > 0.6;
            particlesRef.current.push({
              x: px,
              y: py,
              vx: Math.cos(theta) * (isRim ? 1.55 : 0.7),
              vy: -0.65 + Math.sin(theta) * 0.45,
              radius: 18 + Math.random() * 22,
              targetRadius: 42 + Math.random() * 34,
              kind: isRim ? 'torus' : 'cap',
              heat: Math.max(0.06, 0.88 - blastElapsed * 0.34 - (isRim ? 0.14 : 0)),
              alpha: 0.68,
              life: 0,
              maxLife: 2.0 + Math.random() * 1.1,
              gravity: -0.008,
              drag: 0.965,
              swirlPhase: theta,
              swirlSign: Math.cos(theta) >= 0 ? 1 : -1,
            });
          }
        }

        // Update particles
        const nextParticles: PuffParticle[] = [];
        for (const pt of particlesRef.current) {
          pt.life += dt;
          if (pt.life >= pt.maxLife) continue;
          const progress = pt.life / pt.maxLife;

          if (pt.kind === 'torus') {
            // Curl outward and slightly downward at torus edge for authentic rolling cloud rim
            pt.vx += pt.swirlSign * 0.045;
            pt.vy += (progress > 0.4 ? 0.035 : -0.02);
          }

          pt.vx *= Math.pow(pt.drag, dt * 60);
          pt.vy *= Math.pow(pt.drag, dt * 60);
          pt.vy += pt.gravity * dt * 60;

          pt.x += pt.vx * dt * 60;
          pt.y += pt.vy * dt * 60;

          // Bounce embers lightly on ground horizon
          if (pt.kind === 'ember' && pt.y > groundY && pt.vy > 0) {
            pt.y = groundY;
            pt.vy *= -0.35;
            pt.vx *= 0.72;
          }

          pt.radius += (pt.targetRadius - pt.radius) * Math.min(1, dt * 3.2);
          pt.heat = Math.max(0, pt.heat - dt * (pt.kind === 'fireball' ? 0.42 : pt.kind === 'ember' ? 0.38 : 0.26));

          nextParticles.push(pt);
        }
        particlesRef.current = nextParticles;

        // Render pass 1: Cooler dark outer smoke / stem / surge
        for (const pt of nextParticles) {
          if (pt.kind === 'ember') continue;
          const lifeAlpha = Math.sin(Math.min(1, pt.life / pt.maxLife) * Math.PI);
          const a = Math.max(0, Math.min(1, pt.alpha * lifeAlpha * fadeOutMultiplier));
          if (a <= 0.01) continue;

          const [c0, c1, c2] = sampleKelvinColor(pt.heat, a);
          const grad = ctx.createRadialGradient(pt.x, pt.y - pt.radius * 0.12, pt.radius * 0.08, pt.x, pt.y, pt.radius);
          grad.addColorStop(0, c0);
          grad.addColorStop(0.52, c1);
          grad.addColorStop(1, c2);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Render pass 2: Additive incandescent core plasma & glowing embers
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const pt of nextParticles) {
          const lifeFraction = pt.life / pt.maxLife;
          const a = (1 - lifeFraction) * fadeOutMultiplier;
          if (a <= 0.02) continue;

          if (pt.kind === 'ember') {
            ctx.fillStyle = pt.heat > 0.5 ? `rgba(255, 220, 120, ${a})` : `rgba(255, 100, 20, ${a})`;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (pt.heat > 0.48) {
            const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.radius * 0.85);
            g.addColorStop(0, `rgba(255, 240, 190, ${a * 0.28})`);
            g.addColorStop(0.5, `rgba(255, 110, 20, ${a * 0.14})`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.radius * 0.85, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        // Supersonic spherical shockwave ring expanding across viewport
        if (blastElapsed < 1.15) {
          const sp = blastElapsed / 1.15;
          const shockR = sp * Math.max(viewport.width, viewport.height) * 0.85;
          const shockAlpha = (1 - sp) * 0.6;
          ctx.strokeStyle = `rgba(255, 248, 235, ${shockAlpha})`;
          ctx.lineWidth = Math.max(1.5, 18 * (1 - sp));
          ctx.beginPath();
          ctx.arc(groundX, groundY - 12, shockR, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [stage, viewport, groundX, groundY]);

  return (
    <div
      className={`fixed inset-0 z-[9999] pointer-events-none overflow-hidden transition-opacity duration-500 ${
        stage === 'idle' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Nuclear Double Thermal Flash */}
      <AnimatePresence>
        {stage === 'flash' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.98, 0.35, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, times: [0, 0.18, 0.36, 0.55, 1] }}
            className="absolute inset-0 bg-white z-[10002]"
          />
        )}
      </AnimatePresence>

      {/* Atmospheric Thermal Chromatic Pulse */}
      <AnimatePresence>
        {stage === 'explosion' && (
          <motion.div
            initial={{ opacity: 0.55 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            className="absolute inset-0 z-[10001] pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${groundX}px ${groundY}px, rgba(255,210,120,0.65), rgba(255,90,15,0.22) 38%, transparent 72%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Main High-DPI Volumetric Simulation Canvas with Impact Shake */}
      <motion.div
        animate={
          stage === 'explosion'
            ? {
                x: [0, -10, 10, -7, 7, -4, 4, -2, 0],
                y: [0, 8, -8, 6, -6, 3, -3, 1, 0],
              }
            : { x: 0, y: 0 }
        }
        transition={{ duration: 0.75, ease: 'easeOut' }}
        className="w-full h-full"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
      </motion.div>
    </div>
  );
};
