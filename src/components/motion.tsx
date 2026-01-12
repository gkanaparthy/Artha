"use client";

import { motion, HTMLMotionProps, Variants } from "framer-motion";
import { forwardRef, ReactNode } from "react";

// Animation variants
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" as const } },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

// Animated components
interface MotionDivProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
}

export const FadeIn = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      {...props}
    >
      {children}
    </motion.div>
  )
);
FadeIn.displayName = "FadeIn";

export const FadeInUp = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      {...props}
    >
      {children}
    </motion.div>
  )
);
FadeInUp.displayName = "FadeInUp";

export const ScaleIn = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      variants={scaleIn}
      {...props}
    >
      {children}
    </motion.div>
  )
);
ScaleIn.displayName = "ScaleIn";

export const StaggerContainer = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      {...props}
    >
      {children}
    </motion.div>
  )
);
StaggerContainer.displayName = "StaggerContainer";

export const StaggerItem = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, ...props }, ref) => (
    <motion.div ref={ref} variants={staggerItem} {...props}>
      {children}
    </motion.div>
  )
);
StaggerItem.displayName = "StaggerItem";

// Page transition wrapper
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeInOut" as const }}
    >
      {children}
    </motion.div>
  );
}

// Animated card with hover effect
export const AnimatedCard = forwardRef<
  HTMLDivElement,
  MotionDivProps & { delay?: number }
>(({ children, delay = 0, ...props }, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay, ease: "easeOut" as const }}
    whileHover={{ y: -2, transition: { duration: 0.2 } }}
    {...props}
  >
    {children}
  </motion.div>
));
AnimatedCard.displayName = "AnimatedCard";

// Animated number counter
export function AnimatedNumber({
  value,
  formatFn = (n: number) => n.toString(),
}: {
  value: number;
  formatFn?: (n: number) => string;
}) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={value}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {formatFn(value)}
      </motion.span>
    </motion.span>
  );
}

// List animation wrapper
export function AnimatedList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export const AnimatedListItem = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={{
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0 },
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
);
AnimatedListItem.displayName = "AnimatedListItem";
