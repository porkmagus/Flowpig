// Linear-style animation variants for Framer Motion
export const animations = {
  // Page transitions
  page: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },

  // Fade in from bottom
  fadeInUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  },

  // Fade in from top
  fadeInDown: {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  },

  // Fade in from left
  fadeInLeft: {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  },

  // Fade in from right
  fadeInRight: {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  },

  // Scale fade in
  scaleIn: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },

  // Stagger children
  stagger: {
    animate: {
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  },

  // Stagger item
  staggerItem: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
  },

  // Hover scale (subtle)
  hoverScale: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.15 },
  },

  // Hover lift
  hoverLift: {
    whileHover: { y: -2 },
    transition: { duration: 0.15 },
  },

  // Button press
  buttonPress: {
    whileTap: { scale: 0.97 },
    transition: { duration: 0.1 },
  },
};

// Easing functions (Linear-style)
export const easings = {
  smooth: [0.25, 0.1, 0.25, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
  snappy: [0.4, 0, 0.2, 1],
};

// Duration constants
export const durations = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
  slower: 0.4,
};
