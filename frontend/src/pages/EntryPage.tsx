import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Moon, Sparkles, Users, Skull, CaseSensitive, Wand2, UserPlus, LogIn, Play } from 'lucide-react';

const features = [
  {
    icon: Skull,
    title: 'Whodunit Mystery',
    description: 'Six suspects, six weapons, nine rooms. Assemble the correct solution and expose the killer before your rivals do.',
  },
  {
    icon: Users,
    title: 'Live Multiplayer',
    description: 'Play with 3–6 friends in real-time. Roll dice, travel the mansion, and grill your opponents with secret cards.',
  },
  {
    icon: Wand2,
    title: 'Classic Cluedo',
    description: 'Suggestions, secret passages, hidden envelopes. Every game is a fresh puzzle dealt from a shuffled deck.',
  },
  {
    icon: CaseSensitive,
    title: 'Server-Authoritative',
    description: 'Every die roll, card, and accusation is decided by the server. Encrypted against tampering, cheating-proof.',
  },
];

const steps = [
  { number: '01', title: 'Enter the Mansion', description: 'Create your detective persona and step into the grand foyer.' },
  { number: '02', title: 'Deal the Deck', description: 'Every suspect along with a murder weapon is hidden in a sealed envelope.' },
  { number: '03', title: 'Explore & Suggest', description: 'Move room to room, make suggestions, and watch opponents reveal cards.' },
  { number: '04', title: 'Accuse & Win', description: 'Unlock the solution and make your final accusation before anyone else.' },
];

export const EntryPage: React.FC = () => {
  const [showParticles] = useState(true);
  const [animatedElements, setAnimatedElements] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedElements(new Set([0, 1, 2, 3]));
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const particleContainer = document.getElementById('particle-bg');
    if (!particleContainer || !showParticles) return;

    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'particle animate-particle-rise';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.width = `${Math.random() * 4 + 2}px`;
      particle.style.height = particle.style.width;
      particle.style.background = 'radial-gradient(circle, hsl(45, 100%, 50% / 0.4) 0%, transparent 70%)';
      particle.style.animationDelay = `${Math.random() * 8}s`;
      particle.style.animationDuration = `${Math.random() * 4 + 6}s`;
      particleContainer.appendChild(particle);

      setTimeout(() => particle.remove(), 10000);
    };

    const interval = setInterval(createParticle, 300);
    return () => clearInterval(interval);
  }, [showParticles]);

  return (
    <div className="relative min-h-screen flex flex-col">
      <header className="absolute top-0 left-0 right-0 z-20 px-6 py-6">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-gold">
                <Moon className="w-7 h-7 text-mystery-900" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blood-500 rounded-full animate-pulse-slow" />
            </div>
            <span className="font-cinzel text-2xl font-bold text-gradient text-stroke-gold">Mystery Mansion</span>
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login" className="btn-ghost">
              <LogIn className="w-4 h-4" /> Sign In
            </Link>
            <Link to="/register" className="btn-primary">
              <UserPlus className="w-4 h-4" /> Enter Mansion
            </Link>
          </div>
          <div className="md:hidden flex items-center gap-2">
            <Link to="/login" className="btn-ghost p-2"><LogIn className="w-5 h-5" /></Link>
            <Link to="/register" className="btn-primary p-2"><UserPlus className="w-5 h-5" /></Link>
          </div>
        </nav>
      </header>

      <main className="flex-1 flex flex-col justify-center relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-mystery-800/50 border border-gold-500/30 backdrop-blur mb-8 animate-float">
              <Sparkles className="w-5 h-5 text-gold-400" />
              <span className="text-sm font-medium text-gold-300">THE CLASSIC MURDER MYSTERY, ONLINE</span>
            </div>
            <h1 className="font-cinzel text-5xl md:text-7xl lg:text-8xl font-bold leading-tight mb-6">
              <span className="block text-mystery-50">Enter the</span>
              <span className="block text-gradient text-stroke-gold">Mystery Mansion</span>
            </h1>
            <p className="text-xl md:text-2xl text-mystery-300 max-w-3xl mx-auto leading-relaxed">
              Someone has been murdered in the mansion. Six suspects were present.
              The killer, the weapon and the room are sealed in the envelope — solve the mystery before anyone else.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
              <Link to="/register" className="btn-primary px-8 py-4 text-lg">
                <Play className="w-5 h-5" /> Start Investigating
              </Link>
              <Link to="/login" className="btn-secondary px-8 py-4 text-lg">
                <LogIn className="w-5 h-5" /> I Already Play
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isAnimated = animatedElements.has(index);
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isAnimated ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ delay: index * 0.08 }}
                  className="card-hover p-6 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-500/20 to-gold-400/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-gold-400" />
                  </div>
                  <h3 className="font-cinzel text-lg font-bold text-mystery-50 mb-2">{feature.title}</h3>
                  <p className="text-sm text-mystery-400 leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card p-8 md:p-12"
          >
            <h2 className="font-cinzel text-2xl md:text-3xl font-bold text-gradient text-center mb-10">
              How the Night Unfolds
            </h2>
            <div className="grid md:grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <div key={step.number} className="relative text-center">
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-1/2 w-full border-t border-dashed border-gold-500/20" />
                  )}
                  <div className="relative inline-flex w-16 h-16 rounded-full bg-gradient-to-br from-gold-500 to-gold-400 items-center justify-center font-cinzel text-xl font-bold text-mystery-900 mb-4 shadow-gold">
                    {step.number}
                  </div>
                  <h3 className="font-cinzel font-bold text-mystery-50 mb-2">{step.title}</h3>
                  <p className="text-sm text-mystery-400 leading-relaxed max-w-[240px] mx-auto">{step.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="relative z-10 px-6 py-6 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-gold-400" />
            <span className="font-cinzel font-bold text-mystery-300">Mystery Mansion</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-mystery-400">
            <Link to="/privacy" className="hover:text-gold-300 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-gold-300 transition-colors">Terms</Link>
          </div>
          <p className="text-sm text-mystery-500">© {new Date().getFullYear()} Mystery Mansion.</p>
        </div>
      </footer>
    </div>
  );
};