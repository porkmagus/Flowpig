'use client';

import { motion, AnimatePresence, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

// Page transition variants
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const pageTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

// Stagger container for lists
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

// Card hover animation
export const cardHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
  tap: { scale: 0.98 },
};

// Fade in animation
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// Slide in from left
export const slideInLeft: Variants = {
  initial: { x: -20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -20, opacity: 0 },
};

// Slide in from right
export const slideInRight: Variants = {
  initial: { x: 20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 20, opacity: 0 },
};

// Scale animation
export const scaleIn: Variants = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
};

// Page wrapper component
export function AnimatedPage({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animated list container
export function AnimatedList({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animated list item
export function AnimatedItem({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

// Animated card with hover effect
export function AnimatedCard({ 
  children, 
  className,
  onClick,
}: { 
  children: ReactNode; 
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      variants={cardHover}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// Animate presence wrapper for exit animations
export { AnimatePresence, motion };
