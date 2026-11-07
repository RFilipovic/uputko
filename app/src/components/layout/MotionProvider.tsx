"use client";

import { MotionConfig } from "motion/react";

/** All Motion animations follow the user's "reduce motion" setting. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
