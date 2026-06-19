'use client';

import { useState } from 'react';
import { HelpCircle, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InstructionStep {
  title: string;
  description: string;
}

interface AdminHelpBoxProps {
  title: string;
  intro: string;
  steps: InstructionStep[];
  tips?: string[];
  defaultOpen?: boolean;
}

/**
 * AdminHelpBox — a collapsible help panel that admins can drop at the top of
 * any panel to give on-the-spot instructions for that section.
 *
 * It's collapsed by default so it doesn't clutter the UI for power users,
 * but new admins can expand it to learn how the section works.
 */
export function AdminHelpBox({ title, intro, steps, tips, defaultOpen = false }: AdminHelpBoxProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="mb-4 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        إظهار التعليمات
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-purple-500/20 bg-purple-500/5 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-purple-500/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          <X
            className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500"
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
          />
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">{intro}</p>
              <ol className="space-y-2">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-purple-500/15 text-purple-500 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-foreground">{step.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {tips && tips.length > 0 && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <p className="text-[11px] font-bold text-amber-600 mb-1">نصائح</p>
                  <ul className="space-y-1">
                    {tips.map((tip, i) => (
                      <li key={i} className="text-[11px] text-amber-700 dark:text-amber-400 flex gap-1">
                        <span>•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
