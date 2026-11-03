import { useRef, useEffect, useState, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import './hero-abstract-art.css';

export default function HeroAbstractArt() {
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const prefersReducedMotion = useReducedMotion();

  const LINE_COUNT = 64;

  const lines = useMemo(() => {
    return Array.from({ length: LINE_COUNT }, (_, i) => {
      const normalizedX = i / (LINE_COUNT - 1);
      return { id: i, nx: normalizedX };
    });
  }, [LINE_COUNT]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMousePos({
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y))
      });
    };

    const node = containerRef.current;
    if (node) {
      node.addEventListener('mousemove', handleMouseMove);
    }
    return () => {
      if (node) node.removeEventListener('mousemove', handleMouseMove);
    };
  }, [prefersReducedMotion]);

  return (
    <div className="hero-abstract-container" ref={containerRef} aria-hidden="true">
      <svg
        className="hero-abstract-svg"
        viewBox="0 0 800 680"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="lineHarmonicGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
            <stop offset="35%" stopColor="#4a8bdf" stopOpacity="0.9" />
            <stop offset="65%" stopColor="#38bdf8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.2" />
          </linearGradient>

          <linearGradient id="lineHarmonicGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.1" />
            <stop offset="40%" stopColor="#60a5fa" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#a855f7" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#4338ca" stopOpacity="0.15" />
          </linearGradient>

          <radialGradient
            id="ambientFieldGlow"
            cx={`${mousePos.x * 100}%`}
            cy={`${mousePos.y * 100}%`}
            r="45%"
          >
            <stop offset="0%" stopColor="#4a8bdf" stopOpacity="0.28" />
            <stop offset="60%" stopColor="#2563eb" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#08090c" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Radial Interference Glow */}
        <rect width="800" height="680" fill="url(#ambientFieldGlow)" />

        {/* Vertical Waveform Line Field */}
        {lines.map(({ id, nx }) => {
          const x = nx * 800;
          // Mathematical wave envelope: combination of sine waves and mouse influence
          const distToMouse = Math.abs(nx - mousePos.x);
          const mouseBoost = Math.max(0, 1 - distToMouse * 2.8) * 0.35;

          const wave1 = Math.sin(nx * Math.PI * 3.5);
          const wave2 = Math.cos(nx * Math.PI * 7.0) * 0.4;
          const wave = Math.abs(wave1 + wave2) * 0.5 + 0.4 + mouseBoost;

          const baseHeight = 560;
          const height = Math.min(650, baseHeight * wave);
          const y = (680 - height) / 2;

          const isEven = id % 2 === 0;
          const opacity = Math.min(1, Math.max(0.25, 0.4 + wave * 0.55));

          return (
            <line
              key={id}
              x1={x}
              y1={y}
              x2={x}
              y2={y + height}
              stroke={isEven ? 'url(#lineHarmonicGrad1)' : 'url(#lineHarmonicGrad2)'}
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity={opacity}
              className="abstract-line"
              style={{
                transition: prefersReducedMotion ? 'none' : 'y 0.25s ease, y2 0.25s ease, opacity 0.25s ease'
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}

