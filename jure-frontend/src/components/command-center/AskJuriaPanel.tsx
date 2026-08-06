import React, { memo, useEffect, useRef, useState } from 'react';
import { Brain, Send, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COPILOT_PROMPTS } from './commandCenterUtils';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type Props = {
  onClose?: () => void;
  className?: string;
  compact?: boolean;
};

function mockReply(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes('yesterday')) {
    return 'Yesterday: 2 matters advanced, 1 deadline cleared, and AI flagged an indemnity clause for review. Priority Queue was refreshed overnight.';
  }
  if (p.includes('priorit')) {
    return "Today's priorities: clear Critical deadlines first, then high-risk matter reviews, then inactive-matter outreach. See Priority Queue for ranked actions.";
  }
  if (p.includes('meeting') || p.includes('prepare')) {
    return 'For your first meeting: review the AI Daily Brief, open the suggested matter summary, and confirm any statutory deadlines in the next 48 hours.';
  }
  if (p.includes('risk')) {
    return 'Matters at risk are ranked in Open Risks and the Critical/High Priority Queue. Focus on files with risk score ≥ 78 and any unusual clause detections.';
  }
  if (p.includes('first') || p.includes('work on')) {
    return 'Start with Critical Priority Queue items, then AI Recommendations marked High Risk / Action Required. That sequence maximizes deadline safety.';
  }
  return `Analyzed against your live practice data. Recommendation: address Mission Control Critical items, then review AI Daily Brief confidence signals. Ask a narrower question for a deeper brief.`;
}

const AskJuriaPanel = memo(function AskJuriaPanel({ onClose, className, compact }: Props) {
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "I'm JURIA — your practice intelligence copilot. Ask what happened overnight, what needs attention, or how to prepare for your next matter.",
    },
  ]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setTyping(true);
    window.setTimeout(() => {
      setMessages((m) => [
        ...m,
        { id: `a-${Date.now()}`, role: 'assistant', content: mockReply(trimmed) },
      ]);
      setTyping(false);
    }, 700 + Math.random() * 500);
  };

  return (
    <aside
      aria-label="Ask JURIA"
      className={cn(
        'flex h-full min-h-0 flex-col border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85',
        !compact && 'border-l',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#64499D]/10 text-[#64499D] dark:text-[#CFC2FF]">
            <Brain className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">Ask JURIA</p>
            <p className="text-[10px] text-slate-400">Practice intelligence · always on</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Close JURIA panel"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
        <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <Sparkles className="h-3 w-3" /> Suggested
        </p>
        <div className="flex flex-wrap gap-1.5">
          {COPILOT_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => send(prompt)}
              className="rounded-md border border-slate-200/90 bg-slate-50/80 px-2 py-1 text-[10.5px] text-slate-600 transition hover:border-[#64499D]/30 hover:text-[#64499D] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[92%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed',
                m.role === 'user'
                  ? 'rounded-br-md bg-[#64499D] text-white'
                  : 'rounded-bl-md border border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start" aria-live="polite">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-slate-200/80 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#64499D] [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#64499D] [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#64499D] [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      <form
        className="border-t border-slate-200/80 p-3 dark:border-slate-800"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm focus-within:border-[#64499D]/40 dark:border-slate-700 dark:bg-slate-900">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about priorities, risks, deadlines…"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[12.5px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
            aria-label="Message JURIA"
          />
          <button
            type="submit"
            disabled={!input.trim() || typing}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#64499D] text-white transition hover:bg-[#4D3680] disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </aside>
  );
});

export default AskJuriaPanel;
