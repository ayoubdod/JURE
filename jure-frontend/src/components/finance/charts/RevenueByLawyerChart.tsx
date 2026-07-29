import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatMAD } from '@/utils/formatMAD';

type Row = { lawyer_name: string; amount: number };

type Props = {
  data: Row[];
};

const BAR = '#6D54B5';

function formatAxisMad(v: number): string {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return '0';
  if (Math.abs(n) < 1000) return `${Math.round(n)}`;
  return `${Math.round(n / 1000)}k`;
}

export const RevenueByLawyerChart: React.FC<Props> = ({ data }) => {
  const rows = useMemo(
    () => data.map((d) => ({ ...d, name: d.lawyer_name })),
    [data]
  );

  const xAxisMax = useMemo(() => {
    const m = Math.max(0, ...rows.map((r) => r.amount));
    return m <= 0 ? 1 : m * 1.12;
  }, [rows]);

  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">CA par avocat</h3>
      {rows.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          Aucune répartition par avocat pour cette période
        </div>
      ) : (
        <div className="h-[280px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                domain={[0, xAxisMax]}
                tickFormatter={formatAxisMad}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fontSize: 11 }}
                className="text-slate-600 dark:text-slate-400"
              />
              <Tooltip
                formatter={(value: number) => formatMAD(value)}
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
              />
              <Bar dataKey="amount" fill={BAR} radius={[0, 6, 6, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
