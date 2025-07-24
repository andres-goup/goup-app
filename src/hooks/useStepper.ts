// src/hooks/useStepper.ts
import { useState } from "react";

export type Step = {
  icon: string;
  title: string;
  content: React.ReactNode;
};

export function useStepper<T extends readonly Step[]>(steps: T) {
  const [current, setCurrent] = useState(0);

  const total = steps.length;
  const step = steps[current];

  const next = () => setCurrent((c) => Math.min(c + 1, total - 1));
  const prev = () => setCurrent((c) => Math.max(c - 1, 0));
  const goTo = (i: number) => setCurrent(Math.max(0, Math.min(i, total - 1)));

  return {
    current,
    total,
    step,
    steps,
    next,
    prev,
    goTo,
  };
}