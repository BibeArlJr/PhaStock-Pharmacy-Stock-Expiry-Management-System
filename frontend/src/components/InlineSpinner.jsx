import { motion } from 'framer-motion';

export default function InlineSpinner({ className = '' }) {
  return (
    <motion.div
      className={`h-4 w-4 rounded-full border-2 border-primary border-t-transparent ${className}`}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
    />
  );
}
