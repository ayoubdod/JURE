import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Play, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type AiAssistantCopy = {
  title: string;
  desc: string;
  greeting: string;
  features: string[];
  userMessage: string;
  aiResponse: string;
  suggestions: string[];
  placeholder: string;
};

type AiAssistantDemoProps = {
  copy: AiAssistantCopy;
  dir: "ltr" | "rtl";
};

function useTypewriter(text: string, enabled: boolean, speed = 18) {
  const [out, setOut] = useState(enabled ? "" : text);
  const [done, setDone] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setOut(text);
      setDone(true);
      return;
    }
    setOut("");
    setDone(false);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => window.clearInterval(id);
  }, [text, enabled, speed]);

  return { out, done };
}

const AiAssistantDemo: React.FC<AiAssistantDemoProps> = ({ copy, dir }) => {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"greeting" | "user" | "response">("greeting");
  const { out: typedResponse, done: responseDone } = useTypewriter(
    copy.aiResponse,
    !reduce && phase === "response",
    16
  );

  // Stagger chat phases so the demo feels alive
  useEffect(() => {
    if (reduce) {
      setPhase("response");
      return;
    }
    setPhase("greeting");
    const t1 = window.setTimeout(() => setPhase("user"), 900);
    const t2 = window.setTimeout(() => setPhase("response"), 1800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [copy.aiResponse, reduce]);

  return (
    <Card
      className={cn(
        "landing-glass border-0 shadow-none h-fit",
        "lg:sticky lg:top-24",
        "ring-1 ring-[#A58CF4]/15 dark:ring-[#A58CF4]/25",
        "shadow-[0_0_40px_-12px_rgba(100,73,157,0.35)] dark:shadow-[0_0_48px_-10px_rgba(139,111,209,0.4)]"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 bg-gradient-to-br from-[#A58CF4] to-[#4D3680] rounded-xl flex items-center justify-center flex-shrink-0 landing-bot-pulse">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="font-display text-lg tracking-tight">
              {copy.title}
            </CardTitle>
            <CardDescription className="dark:text-slate-400 text-xs">
              {copy.desc}
            </CardDescription>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#A58CF4] dark:text-[#A58CF4] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
            Live
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {/* AI greeting */}
          <div className={cn("flex gap-2", dir === "rtl" && "flex-row-reverse")}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#A58CF4] to-[#4D3680] flex items-center justify-center flex-shrink-0 landing-bot-pulse">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="p-3 rounded-xl text-xs bg-white/70 dark:bg-slate-800/80 border border-[#A58CF4]/10 dark:border-[#A58CF4]/20">
                <p className="text-slate-900 dark:text-slate-100">{copy.greeting}</p>
                <ul className="mt-1.5 space-y-0.5 text-slate-700 dark:text-slate-300">
                  {copy.features.map((feature, index) => (
                    <li key={index}>• {feature}</li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {copy.suggestions.map((suggestion, index) => (
                  <motion.button
                    key={suggestion}
                    type="button"
                    initial={reduce ? false : { opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.35 + index * 0.12, duration: 0.35 }}
                    className="px-2.5 py-1 bg-white/80 dark:bg-slate-800/90 border border-[#A58CF4]/20 dark:border-[#A58CF4]/30 rounded-full text-[10px] text-slate-600 dark:text-slate-300 hover:bg-[#F4F1FF] dark:hover:bg-[#A58CF4]/20 hover:border-[#A58CF4]/40 transition-colors"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* User message */}
          {(phase === "user" || phase === "response") && (
            <motion.div
              className={cn("flex gap-2", dir === "rtl" && "flex-row-reverse")}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#A58CF4] to-[#A58CF4] flex items-center justify-center flex-shrink-0">
                <Users className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="p-3 bg-gradient-to-r from-[#A58CF4] to-[#4D3680] rounded-xl text-xs text-white shadow-[0_0_20px_-6px_rgba(100,73,157,0.6)]">
                  <p>{copy.userMessage}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* AI response with typewriter */}
          {phase === "response" && (
            <motion.div
              className={cn("flex gap-2", dir === "rtl" && "flex-row-reverse")}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#A58CF4] to-[#4D3680] flex items-center justify-center flex-shrink-0 landing-bot-pulse">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="p-3 rounded-xl text-xs bg-white/70 dark:bg-slate-800/80 border border-[#A58CF4]/10 dark:border-[#A58CF4]/20">
                  <p className="text-slate-900 dark:text-slate-100 min-h-[3em]">
                    {typedResponse}
                    {!responseDone && !reduce && (
                      <span className="inline-block w-0.5 h-3 ms-0.5 align-middle bg-[#A58CF4] dark:bg-[#A58CF4] animate-pulse" />
                    )}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Input Area */}
          <div className="pt-3 border-t border-[#A58CF4]/10 dark:border-[#A58CF4]/20 sticky bottom-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={copy.placeholder}
                className="flex-1 px-3 py-2 border border-[#A58CF4]/20 dark:border-[#A58CF4]/30 rounded-lg text-xs bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#A58CF4] focus:border-transparent"
                disabled
              />
              <Button
                size="icon"
                className="h-9 w-9 bg-gradient-to-r from-[#A58CF4] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] flex-shrink-0"
                disabled
              >
                <Play className={cn("w-3.5 h-3.5", dir === "rtl" && "rotate-180")} />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AiAssistantDemo;
