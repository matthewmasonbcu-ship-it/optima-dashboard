'use client';
import { motion } from 'framer-motion';

function Shape({ className, delay = 0, width = 400, height = 100, rotate = 0, gradient = 'from-cyan-500/[0.08]' }: { className?: string; delay?: number; width?: number; height?: number; rotate?: number; gradient?: string; }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -150, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{ duration: 2.4, delay, ease: [0.23, 0.86, 0.39, 0.96], opacity: { duration: 1.2 } }}
      className={`absolute ${className}`}
    >
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width, height }}
        className="relative"
      >
        <div className={`absolute inset-0 rounded-full bg-gradient-to-r to-transparent ${gradient} backdrop-blur-[2px] border border-white/[0.08]`} />
      </motion.div>
    </motion.div>
  );
}

export function FloatingShapes() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <Shape delay={0.3} width={500} height={120} rotate={12} gradient="from-cyan-500/[0.08]" className="left-[-5%] top-[20%]" />
      <Shape delay={0.5} width={400} height={100} rotate={-15} gradient="from-blue-500/[0.08]" className="right-[0%] top-[60%]" />
      <Shape delay={0.4} width={250} height={70} rotate={-8} gradient="from-cyan-400/[0.06]" className="left-[10%] bottom-[10%]" />
      <Shape delay={0.6} width={180} height={50} rotate={20} gradient="from-blue-400/[0.07]" className="right-[20%] top-[15%]" />
      <Shape delay={0.7} width={120} height={35} rotate={-25} gradient="from-cyan-300/[0.05]" className="left-[25%] top-[8%]" />
    </div>
  );
}
