import React, { useMemo, useId } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatMAD } from '@/utils/formatMAD';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

type Point = { month: number; billed: number; collected: number };

type Props = {
  data: Point[];
  year: number;
};

export const MonthlyRevenueChart: React.FC<Props> = ({ data, year }) => {
  const gradId = useId().replace(/:/g, '');
  const colorBilled = `colorBilled-${gradId}`;
  const colorCollected = `colorCollected-${gradId}`;

  const chartData = useMemo(() => {
    const byMonth = new Map<number, Point>();
    for (const p of data) {
      byMonth.set(p.month, p);
    }
    return MONTHS.map((label, i) => {
      const m = i + 1;
      const row = byMonth.get(m);
      return {
        label,
        month: m,
        billed: row?.billed ?? 0,
        collected: row?.collected ?? 0,
      };
    });
  }, [data]);

  /** Scale so small MAD amounts are visible (avoid a flat line at 0 with misleading "0k" ticks). */
  const yAxisMax = useMemo(() => {
    const m = Math.max(0, ...chartData.flatMap((d) => [d.billed, d.collected]));
    return m <= 0 ? 1 : m * 1.12;
  }, [chartData]);

  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Chiffre d&apos;affaires mensuel</h3>
        <span className="text-[11px] font-medium text-slate-500">{year}</span>
      </div>
      <div className="h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={colorBilled} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={colorCollected} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-slate-500" />
            <YAxis
              tick={{ fontSize: 11 }}
              className="text-slate-500"
              domain={[0, yAxisMax]}
              tickFormatter={(v) => {
                const n = Number(v);
                if (!Number.isFinite(n) || n === 0) return '0';
                if (Math.abs(n) < 1000) return `${Math.round(n)}`;
                return `${Math.round(n / 1000)}k`;
              }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid rgb(226 232 240)',
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [
                formatMAD(value),
                name === 'billed' ? 'CA facturé' : 'Encaissé',
              ]}
            />
            <Legend
              formatter={(value) => (value === 'billed' ? 'CA facturé' : 'Encaissé')}
              wrapperStyle={{ fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="billed"
              name="billed"
              stroke="#3b82f6"
              fillOpacity={1}
              fill={`url(#${colorBilled})`}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="collected"
              name="collected"
              stroke="#22c55e"
              fillOpacity={1}
              fill={`url(#${colorCollected})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
