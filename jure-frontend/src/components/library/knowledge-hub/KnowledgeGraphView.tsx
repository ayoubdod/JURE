import React, { memo, useMemo } from 'react';
import { DocumentCategory } from '@/utils/constants';
import { cn } from '@/lib/utils';
import type { EnrichedDocument } from './types';

type Props = {
  items: EnrichedDocument[];
  selectedId?: number | null;
  onSelect: (doc: EnrichedDocument) => void;
};

const KnowledgeGraphView = memo(function KnowledgeGraphView({
  items,
  selectedId,
  onSelect,
}: Props) {
  const { nodes, edges, width, height } = useMemo(() => {
    const cats = DocumentCategory.options;
    const w = 640;
    const h = 420;
    const cx = w / 2;
    const cy = h / 2;

    const categoryNodes = cats.map((c, i) => {
      const angle = (i / cats.length) * Math.PI * 2 - Math.PI / 2;
      const r = 140;
      return {
        id: `cat-${c.value}`,
        label: c.label,
        kind: 'category' as const,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        category: c.value,
      };
    });

    const docNodes = items.slice(0, 24).map((doc, i) => {
      const catIndex = Math.max(
        0,
        cats.findIndex((c) => c.value === doc.category)
      );
      const base = categoryNodes[catIndex] || categoryNodes[0];
      const jitter = ((i * 47) % 60) - 30;
      const angle = (i / Math.max(items.length, 1)) * Math.PI * 2;
      return {
        id: `doc-${doc.id}`,
        label: doc.title,
        kind: 'document' as const,
        x: base.x + Math.cos(angle) * (36 + (i % 3) * 12) + jitter * 0.2,
        y: base.y + Math.sin(angle) * (36 + (i % 3) * 12) + jitter * 0.15,
        doc,
      };
    });

    const hub = { id: 'hub', label: 'Knowledge', kind: 'hub' as const, x: cx, y: cy };
    const allNodes = [hub, ...categoryNodes, ...docNodes];

    const graphEdges = [
      ...categoryNodes.map((n) => ({ from: hub.id, to: n.id })),
      ...docNodes.map((n) => ({
        from: `cat-${n.doc.category}`,
        to: n.id,
      })),
    ];

    return { nodes: allNodes, edges: graphEdges, width: w, height: h };
  }, [items]);

  const pos = useMemo(() => {
    const map = new Map(nodes.map((n) => [n.id, n]));
    return map;
  }, [nodes]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-b from-[#F8F6FC]/80 to-white dark:border-slate-800 dark:from-[#1a1528]/40 dark:to-slate-950">
      <div className="absolute left-4 top-3 z-10 text-[11px] text-slate-400">
        Interactive map · click a node to inspect
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[min(52vh,420px)] w-full"
        role="img"
        aria-label="Knowledge graph visualization"
      >
        {edges.map((e) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return null;
          return (
            <line
              key={`${e.from}-${e.to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-700"
              strokeWidth={1}
            />
          );
        })}
        {nodes.map((node) => {
          if (node.kind === 'hub') {
            return (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={28}
                  className="fill-[#64499D]/15 stroke-[#64499D]/50"
                  strokeWidth={1.5}
                />
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  className="fill-[#64499D] text-[10px] font-semibold dark:fill-[#CFC2FF]"
                >
                  Hub
                </text>
              </g>
            );
          }
          if (node.kind === 'category') {
            return (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={18}
                  className="fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-600"
                  strokeWidth={1}
                />
                <text
                  x={node.x}
                  y={node.y + 32}
                  textAnchor="middle"
                  className="fill-slate-500 text-[9px]"
                >
                  {node.label}
                </text>
              </g>
            );
          }
          const selected = node.doc?.id === selectedId;
          return (
            <g
              key={node.id}
              className="cursor-pointer"
              onClick={() => node.doc && onSelect(node.doc)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && node.doc) {
                  e.preventDefault();
                  onSelect(node.doc);
                }
              }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={selected ? 8 : 5.5}
                className={cn(
                  selected
                    ? 'fill-[#64499D] stroke-[#64499D]'
                    : 'fill-[#8B6FD1]/80 stroke-[#64499D]/40 hover:fill-[#64499D]'
                )}
                strokeWidth={1}
              >
                <title>{node.label}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400 dark:border-slate-800">
        Showing {Math.min(items.length, 24)} of {items.length} assets linked by category affinity
      </p>
    </div>
  );
});

export default KnowledgeGraphView;
