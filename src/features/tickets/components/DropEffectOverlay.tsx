import { useEffect, useMemo } from 'react';

export type DropEffect = 'none' | 'palmas' | 'fogos' | 'relogio';

interface Props {
  effect: Exclude<DropEffect, 'none'>;
  onDone: () => void;
}

/**
 * Overlay fullscreen com efeito visual dramático por 3s.
 * Cada efeito tem coreografia própria — não bloqueia interações.
 */
export function DropEffectOverlay({ effect, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      <style>{KEYFRAMES}</style>
      {effect === 'palmas' && <PalmasFX />}
      {effect === 'fogos' && <FogosFX />}
      {effect === 'relogio' && <RelogioFX />}
    </div>
  );
}

/* ============================ PALMAS ============================ */
function PalmasFX() {
  const claps = useMemo(
    () =>
      Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        emoji: ['👏', '🙌', '👏🏼', '👏🏽', '👏🏾', '✋', '🤚'][i % 7],
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 1.6 + Math.random() * 1.2,
        size: 32 + Math.random() * 40,
        drift: (Math.random() - 0.5) * 240,
        rotateStart: (Math.random() - 0.5) * 60,
        rotateEnd: (Math.random() - 0.5) * 1080,
      })),
    []
  );
  const ripples = useMemo(() => Array.from({ length: 4 }).map((_, i) => i), []);
  return (
    <>
      {/* flash dourado */}
      <div className="absolute inset-0" style={{ animation: 'ne-flash 0.6s ease-out forwards', background: 'radial-gradient(circle, rgba(255,218,69,0.45), transparent 60%)' }} />
      {/* ondas concêntricas */}
      {ripples.map(i => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '55%',
            width: 80,
            height: 80,
            marginLeft: -40,
            marginTop: -40,
            borderRadius: '50%',
            border: '4px solid rgba(255,218,69,0.85)',
            animation: `ne-ripple 1.6s ${i * 0.25}s ease-out forwards`,
          }}
        />
      ))}
      {/* texto BRAVO */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          animation: 'ne-pop 1.4s ease-out forwards',
        }}
      >
        <span
          style={{
            fontFamily: 'Sora, sans-serif',
            fontWeight: 900,
            fontSize: 'clamp(60px, 12vw, 180px)',
            color: '#FFDA45',
            textShadow: '0 8px 30px rgba(0,0,0,0.55), 0 0 50px rgba(255,218,69,0.6)',
            letterSpacing: '-0.04em',
            transform: 'rotate(-4deg)',
          }}
        >
          BRAVO!
        </span>
      </div>
      {claps.map(c => (
        <span
          key={c.id}
          style={{
            position: 'absolute',
            left: `${c.left}%`,
            top: 0,
            fontSize: c.size,
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
            animation: `ne-fall-spin ${c.duration}s ${c.delay}s cubic-bezier(.22,.61,.36,1) forwards`,
            // @ts-ignore
            '--drift': `${c.drift}px`,
            '--rs': `${c.rotateStart}deg`,
            '--re': `${c.rotateEnd}deg`,
          } as React.CSSProperties}
        >
          {c.emoji}
        </span>
      ))}
    </>
  );
}

/* ============================ FOGOS ============================ */
function FogosFX() {
  const bursts = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => ({
        id: i,
        x: 15 + Math.random() * 70,
        y: 20 + Math.random() * 50,
        delay: i * 0.35,
        color: ['#FFDA45', '#FF6B6B', '#4ECDC4', '#A78BFA', '#FB923C', '#34D399'][i % 6],
      })),
    []
  );
  const confetti = useMemo(
    () =>
      Array.from({ length: 90 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.5,
        duration: 1.8 + Math.random() * 1.4,
        size: 6 + Math.random() * 10,
        drift: (Math.random() - 0.5) * 300,
        color: ['#FFDA45', '#FF6B6B', '#4ECDC4', '#A78BFA', '#FB923C', '#34D399', '#F472B6'][i % 7],
        rotate: (Math.random() - 0.5) * 1440,
        shape: Math.random() > 0.5 ? '50%' : '2px',
      })),
    []
  );
  return (
    <>
      {/* bursts radiais */}
      {bursts.map(b => (
        <Burst key={b.id} x={b.x} y={b.y} delay={b.delay} color={b.color} />
      ))}
      {/* texto */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ animation: 'ne-pop 1.8s 0.4s ease-out forwards', opacity: 0 }}
      >
        <span
          style={{
            fontFamily: 'Sora, sans-serif',
            fontWeight: 900,
            fontSize: 'clamp(50px, 10vw, 150px)',
            background: 'linear-gradient(135deg, #FFDA45, #FF6B6B, #A78BFA)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 8px 40px rgba(255,107,107,0.5)',
            letterSpacing: '-0.04em',
          }}
        >
          🎉 SHOW! 🎉
        </span>
      </div>
      {/* confetti */}
      {confetti.map(c => (
        <span
          key={c.id}
          style={{
            position: 'absolute',
            top: 0,
            left: `${c.left}%`,
            width: c.size,
            height: c.size * 1.4,
            background: c.color,
            borderRadius: c.shape,
            boxShadow: `0 0 8px ${c.color}88`,
            animation: `ne-fall-spin ${c.duration}s ${c.delay}s cubic-bezier(.22,.61,.36,1) forwards`,
            // @ts-ignore
            '--drift': `${c.drift}px`,
            '--rs': '0deg',
            '--re': `${c.rotate}deg`,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

function Burst({ x, y, delay, color }: { x: number; y: number; delay: number; color: string }) {
  const particles = useMemo(() => Array.from({ length: 24 }).map((_, i) => i), []);
  return (
    <>
      {/* anel de explosão */}
      <div
        style={{
          position: 'absolute',
          left: `${x}%`,
          top: `${y}%`,
          width: 20,
          height: 20,
          marginLeft: -10,
          marginTop: -10,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 60px 20px ${color}`,
          animation: `ne-burst-core 1s ${delay}s ease-out forwards`,
          opacity: 0,
        }}
      />
      {particles.map(i => {
        const angle = (i / particles.length) * Math.PI * 2;
        const dist = 140 + Math.random() * 80;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: 6,
              height: 6,
              marginLeft: -3,
              marginTop: -3,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 10px ${color}`,
              animation: `ne-burst-part 1.4s ${delay}s cubic-bezier(.18,.7,.3,1) forwards`,
              // @ts-ignore
              '--dx': `${dx}px`,
              '--dy': `${dy}px`,
            } as React.CSSProperties}
          />
        );
      })}
    </>
  );
}

/* ============================ RELÓGIO ============================ */
function RelogioFX() {
  const clocks = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => ({
        id: i,
        emoji: ['⏰', '⏳', '🕐', '🕒', '🕘', '⌛', '🕛'][i % 7],
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 1.8 + Math.random() * 1.2,
        size: 36 + Math.random() * 36,
        drift: (Math.random() - 0.5) * 200,
        rotateEnd: (Math.random() < 0.5 ? -1 : 1) * (720 + Math.random() * 720),
      })),
    []
  );
  const rings = useMemo(() => Array.from({ length: 5 }).map((_, i) => i), []);
  return (
    <>
      {/* tint azul */}
      <div className="absolute inset-0" style={{ animation: 'ne-flash 0.8s ease-out forwards', background: 'radial-gradient(circle, rgba(27,30,44,0.55), transparent 65%)' }} />
      {/* anéis "tick-tock" */}
      {rings.map(i => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 100,
            height: 100,
            marginLeft: -50,
            marginTop: -50,
            borderRadius: '50%',
            border: '3px solid rgba(255,218,69,0.7)',
            animation: `ne-ripple 2s ${i * 0.4}s ease-out forwards`,
          }}
        />
      ))}
      {/* relógio gigante girando */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          style={{
            fontSize: 'clamp(120px, 22vw, 320px)',
            filter: 'drop-shadow(0 12px 40px rgba(0,0,0,0.5))',
            animation: 'ne-clock-spin 3s ease-in-out forwards',
            display: 'inline-block',
          }}
        >
          ⏰
        </span>
      </div>
      {/* texto */}
      <div
        className="absolute inset-x-0 bottom-[18%] flex justify-center"
        style={{ animation: 'ne-pop 1.6s 0.3s ease-out forwards', opacity: 0 }}
      >
        <span
          style={{
            fontFamily: 'Sora, sans-serif',
            fontWeight: 900,
            fontSize: 'clamp(40px, 7vw, 100px)',
            color: '#FFDA45',
            textShadow: '0 6px 24px rgba(0,0,0,0.6)',
            letterSpacing: '0.05em',
          }}
        >
          TIC-TAC!
        </span>
      </div>
      {clocks.map(c => (
        <span
          key={c.id}
          style={{
            position: 'absolute',
            top: 0,
            left: `${c.left}%`,
            fontSize: c.size,
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))',
            animation: `ne-fall-spin ${c.duration}s ${c.delay}s cubic-bezier(.22,.61,.36,1) forwards`,
            // @ts-ignore
            '--drift': `${c.drift}px`,
            '--rs': '0deg',
            '--re': `${c.rotateEnd}deg`,
          } as React.CSSProperties}
        >
          {c.emoji}
        </span>
      ))}
    </>
  );
}

/* ============================ KEYFRAMES ============================ */
const KEYFRAMES = `
@keyframes ne-fall-spin {
  0%   { transform: translate3d(0,-15vh,0) rotate(var(--rs)); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translate3d(var(--drift), 115vh, 0) rotate(var(--re)); opacity: 0; }
}
@keyframes ne-flash {
  0%   { opacity: 0; }
  20%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes ne-ripple {
  0%   { transform: scale(0.2); opacity: 0.9; border-width: 6px; }
  100% { transform: scale(14); opacity: 0; border-width: 1px; }
}
@keyframes ne-pop {
  0%   { transform: scale(0.3) rotate(-8deg); opacity: 0; }
  25%  { transform: scale(1.25) rotate(2deg); opacity: 1; }
  45%  { transform: scale(0.95) rotate(-1deg); }
  60%  { transform: scale(1.05) rotate(0deg); }
  85%  { opacity: 1; transform: scale(1) rotate(0deg); }
  100% { opacity: 0; transform: scale(1.1); }
}
@keyframes ne-burst-core {
  0%   { transform: scale(0.2); opacity: 1; }
  40%  { transform: scale(3); opacity: 0.8; }
  100% { transform: scale(0.6); opacity: 0; }
}
@keyframes ne-burst-part {
  0%   { transform: translate(0,0) scale(1); opacity: 1; }
  60%  { opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity: 0; }
}
@keyframes ne-clock-spin {
  0%   { transform: scale(0.2) rotate(0deg); opacity: 0; }
  20%  { transform: scale(1.3) rotate(180deg); opacity: 1; }
  35%  { transform: scale(1) rotate(360deg); }
  80%  { transform: scale(1.05) rotate(900deg); opacity: 1; }
  100% { transform: scale(0.6) rotate(1080deg); opacity: 0; }
}
`;
