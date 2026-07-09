"use client";

import { useEffect, useState } from "react";
import { IconBot, IconCheck, TypingDots } from "./icons";

interface Step {
  label: string;
  /** Na hoeveel seconden deze stap als "bezig" wordt getoond. */
  after: number;
}

/**
 * Agent-werkscherm: pulserende avatar, stappen die één voor één "afvinken".
 * De voortgang is indicatief (de echte pipeline meldt geen tussenstappen),
 * maar geeft precies weer wat de agent in die fase doet.
 */
export default function AgentWorking({
  title,
  steps,
  note,
}: {
  title: string;
  steps: Step[];
  note?: string;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeIndex = steps.reduce(
    (current, step, index) => (elapsed >= step.after ? index : current),
    0
  );

  return (
    <div className="reveal flex min-h-[65vh] items-center justify-center">
      <div className="card w-full max-w-md p-8">
        <div className="flex items-center gap-4">
          <span className="agent-avatar relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-strong to-accent text-xl text-white">
            <IconBot />
            <span className="pulse-dot absolute -right-1 -top-1 h-3 w-3 rounded-full bg-success" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold">{title}</h2>
            <TypingDots className="mt-1" />
          </div>
        </div>

        <ol className="mt-6 space-y-3">
          {steps.map((step, index) => {
            const done = index < activeIndex;
            const active = index === activeIndex;
            return (
              <li key={step.label} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                    done
                      ? "bg-success/20 text-success"
                      : active
                        ? "bg-primary/20 text-primary"
                        : "bg-surface-3 text-faint"
                  }`}
                >
                  {done ? (
                    <IconCheck className="h-3.5 w-3.5" />
                  ) : active ? (
                    <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-faint" />
                  )}
                </span>
                <span
                  className={
                    done ? "text-muted line-through decoration-faint" : active ? "text-text" : "text-faint"
                  }
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>

        {note && <p className="mt-6 text-xs leading-relaxed text-faint">{note}</p>}
      </div>
    </div>
  );
}
