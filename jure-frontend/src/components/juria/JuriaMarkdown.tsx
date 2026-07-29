import React, { Children, Fragment } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function LegalInline({ text }: { text: string }) {
  const re = /(Art\.\s*\d+[\w\s.]*(?:CGI)?|Dahir du[^\n]+)/gi;
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) => {
        if (/^Art\./i.test(part)) {
          return (
            <span
              key={i}
              className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-800 ring-1 ring-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-200 dark:ring-indigo-800"
            >
              {part}
            </span>
          );
        }
        if (/^Dahir/i.test(part)) {
          return (
            <span
              key={i}
              className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-900 ring-1 ring-sky-200/80 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-800"
            >
              {part}
            </span>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

function mapTextChildren(children: React.ReactNode): React.ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === 'string') return <LegalInline text={child} />;
    return child;
  });
}

export function JuriaMarkdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 text-[13px] leading-relaxed text-slate-800 last:mb-0 dark:text-slate-100">
              {mapTextChildren(children)}
            </p>
          ),
          ul: ({ children }) => <ul className="mb-2 list-disc pl-4 text-[13px] text-slate-800 dark:text-slate-100">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal pl-4 text-[13px] text-slate-800 dark:text-slate-100">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{mapTextChildren(children)}</li>,
          strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>,
          h1: ({ children }) => <h3 className="mb-1 text-sm font-semibold">{children}</h3>,
          h2: ({ children }) => <h4 className="mb-1 text-sm font-semibold">{children}</h4>,
          h3: ({ children }) => <h5 className="mb-1 text-[13px] font-semibold">{children}</h5>,
          code: ({ className: c, children }) => {
            const inline = !c?.includes('language-');
            if (inline) {
              return (
                <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                  {children}
                </code>
              );
            }
            return (
              <pre className="mb-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px] dark:border-slate-700 dark:bg-slate-900">
                <code className="font-mono">{children}</code>
              </pre>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-indigo-300 pl-3 text-[13px] italic text-slate-600 dark:border-indigo-600 dark:text-slate-300">
              {mapTextChildren(children)}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
