"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Circle, XCircle, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OrderTimelineStep {
  id: string;
  label: string;
  timestamp?: string;
  note?: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isTerminal?: boolean; // For cancelled or refunded
  terminalType?: "cancelled" | "refunded";
}

interface OrderTimelineProps {
  steps: OrderTimelineStep[];
}

export function OrderTimeline({ steps }: OrderTimelineProps) {
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col py-4">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        let icon = <Circle className="h-4 w-4" />;
        let colorClass = "border-muted text-muted-foreground";
        let bgClass = "bg-background";
        
        if (step.isTerminal) {
          icon = step.terminalType === "cancelled" ? <XCircle className="h-5 w-5" /> : <RefreshCcw className="h-5 w-5" />;
          colorClass = "text-destructive border-transparent";
          bgClass = "bg-destructive/10";
        } else if (step.isCompleted) {
          icon = <CheckCircle2 className="h-5 w-5" />;
          colorClass = "text-primary border-transparent";
          bgClass = "bg-primary/10";
        } else if (step.isCurrent) {
          icon = <Circle className="h-4 w-4 fill-primary" />;
          colorClass = "text-primary border-primary";
          bgClass = "bg-background";
        }

        return (
          <div key={step.id} className="relative flex gap-4">
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: shouldReduceMotion ? 1 : 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: shouldReduceMotion ? 0 : index * 0.2, type: "spring" }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 z-10",
                  colorClass,
                  bgClass
                )}
              >
                {icon}
              </motion.div>
              
              {!isLast && (
                <div className="my-1 w-[2px] flex-1 bg-muted relative overflow-hidden">
                  <motion.div 
                    initial={{ height: shouldReduceMotion ? "100%" : "0%" }}
                    animate={{ height: step.isCompleted ? "100%" : "0%" }}
                    transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : (index * 0.2) + 0.1 }}
                    className={cn(
                      "absolute top-0 left-0 w-full",
                      step.isTerminal ? "bg-destructive" : "bg-primary"
                    )}
                  />
                </div>
              )}
            </div>

            <motion.div 
              initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: shouldReduceMotion ? 0 : index * 0.2 + 0.1 }}
              className={cn("pb-8 pt-1 flex-1", isLast && "pb-0")}
            >
              <h4
                className={cn(
                  "text-sm font-bold",
                  step.isCompleted || step.isCurrent || step.isTerminal
                    ? step.isTerminal ? "text-destructive" : "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </h4>
              {step.timestamp && (
                <p className="mt-0.5 text-xs text-muted-foreground font-mono">
                  {step.timestamp}
                </p>
              )}
              {step.note && (
                <p className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md border border-border/50">
                  {step.note}
                </p>
              )}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
