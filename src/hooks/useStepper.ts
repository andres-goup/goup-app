import { useState } from "react";

export function useStepper<T>(steps: readonly T[]) {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((c) => Math.min(c + 1, steps.length - 1));
  const prev = () => setCurrent((c) => Math.max(c - 1, 0));
  const goTo = (i: number) =>
    setCurrent(Math.max(0, Math.min(i, steps.length - 1)));

  return {
    current,
    total: steps.length,
    step: steps[current],
    next,
    prev,
    goTo,
  };
}