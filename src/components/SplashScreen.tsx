'use client';

import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0A0A0B]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-full h-full bg-[#C9A84C]/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-full h-full bg-[#C9A84C]/5 rounded-full blur-[120px]" />
      </div>

      {/* Brand Identity */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        <motion.div
          animate={{ 
            boxShadow: [
              "0 0 20px rgba(201,168,76,0.1)",
              "0 0 60px rgba(201,168,76,0.3)",
              "0 0 20px rgba(201,168,76,0.1)"
            ] 
          }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-[#C9A84C] to-[#E5C76B] flex items-center justify-center mb-8"
        >
          <Heart size={48} className="text-black fill-black" />
        </motion.div>

        <h1 className="text-5xl font-black text-white tracking-tighter mb-2">VIBRO</h1>
        
        <div className="flex items-center gap-3">
          <div className="h-px w-6 bg-white/10" />
          <span className="text-[10px] uppercase tracking-[0.5em] font-bold text-[#C9A84C]">Elite Discovery</span>
          <div className="h-px w-6 bg-white/10" />
        </div>
      </motion.div>

      {/* Bottom loading bar */}
      <div className="absolute bottom-20 w-48 h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-[#C9A84C]"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 2, ease: "easeInOut" }}
          onAnimationComplete={onComplete}
        />
      </div>
    </motion.div>
  );
}