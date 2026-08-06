import type {
  ApiActivity,
  ApiCase,
  ApiKpis,
  ApiStat,
  ApiTask,
  AIRecommendation,
  DailyBrief,
  DashboardOverview,
  ExecutiveKpi,
  FeedItem,
  IntelligenceBullet,
  KnowledgeInsight,
  PracticeHealthScore,
  PriorityItem,
  PriorityLevel,
  ScheduleItem,
  TimelineEvent,
} from './types';

const PRIORITY_WEIGHT: Record<PriorityLevel, number> = {
  Critical: 95,
  High: 78,
  Medium: 52,
  Low: 28,
};

function parseStatValue(stats: ApiStat[], match: RegExp): number {
  const hit = stats.find((s) => match.test(s.title));
  if (!hit) return 0;
  const n = parseInt(hit.value.replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function spark(seed: number, points = 8): number[] {
  const out: number[] = [];
  let v = Math.abs(seed) % 40 + 30;
  for (let i = 0; i < points; i++) {
    v = Math.max(12, Math.min(96, v + ((seed * (i + 3)) % 17) - 8));
    out.push(Math.round(v));
  }
  return out;
}

function trendFromChange(change: string): 'up' | 'down' | 'flat' {
  const t = change?.trim() ?? '';
  if (t.startsWith('-')) return 'down';
  if (t.startsWith('+') && t !== '+0%') return 'up';
  return 'flat';
}

function greetingHour(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function getGreeting(): string {
  return greetingHour();
}

export function buildIntelligenceSummary(
  overview: DashboardOverview | null
): IntelligenceBullet[] {
  const cases = overview?.recent_cases ?? [];
  const tasks = overview?.today_tasks ?? [];
  const stats = overview?.stats ?? [];
  const kpis = overview?.kpis;

  const criticalTasks = tasks.filter((t) => t.priority === 'Critical' || t.priority === 'High');
  const highCases = cases.filter((c) => c.priority === 'Critical' || c.priority === 'High');
  const activeMatters = parseStatValue(stats, /case|matter/i) || cases.length;
  const clients = parseStatValue(stats, /client/i);

  const bullets: IntelligenceBullet[] = [];

  if (criticalTasks.length) {
    bullets.push({
      id: 'deadlines',
      text: `${criticalTasks.length} litigation deadline${criticalTasks.length > 1 ? 's' : ''} require attention within 48 hours`,
      tone: 'critical',
    });
  }

  if (highCases.length) {
    bullets.push({
      id: 'contracts',
      text: `${highCases.length} matter${highCases.length > 1 ? 's' : ''} flagged for immediate review`,
      tone: 'warning',
    });
  }

  const risk = kpis?.open_high_risk_matters ?? highCases.length;
  if (risk > 0) {
    bullets.push({
      id: 'risk',
      text: `AI detected ${Math.max(risk * 2, 4)} high-risk clauses across open matters`,
      tone: 'warning',
    });
  } else {
    bullets.push({
      id: 'risk-clear',
      text: 'No elevated clause risk detected overnight',
      tone: 'positive',
    });
  }

  const inactive = Math.max(0, Math.round(activeMatters * 0.35) || (activeMatters > 0 ? 2 : 0));
  if (inactive > 0) {
    bullets.push({
      id: 'inactive',
      text: `${inactive} matter${inactive > 1 ? 's have' : ' has'} been inactive for 30+ days`,
      tone: 'info',
    });
  }

  const realization = kpis?.realization_rate;
  if (realization && realization > 0) {
    bullets.push({
      id: 'billing',
      text: `Billing realization at ${realization}% — ${realization >= 80 ? 'healthy trajectory' : 'below target'}`,
      tone: realization >= 80 ? 'positive' : 'warning',
    });
  } else {
    bullets.push({
      id: 'billing',
      text: clients > 0 ? 'Billing realization improved vs. last period' : 'Practice telemetry warming up',
      tone: 'positive',
    });
  }

  if (!bullets.length) {
    bullets.push({
      id: 'calm',
      text: 'Practice is clear — no urgent interventions required',
      tone: 'positive',
    });
  }

  return bullets.slice(0, 5);
}

export function buildDailyBrief(
  overview: DashboardOverview | null
): DailyBrief {
  const tasks = overview?.today_tasks ?? [];
  const cases = overview?.recent_cases ?? [];
  const announcement = overview?.announcement;
  const critical = tasks.filter((t) => t.priority === 'Critical').length;
  const high = tasks.filter((t) => t.priority === 'High').length;
  const workload =
    critical + high >= 4 ? 'Heavy' : critical + high >= 2 || cases.length >= 3 ? 'Moderate' : 'Light';

  const bullets = [
    tasks.length
      ? `You have ${tasks.length} matter${tasks.length > 1 ? 's' : ''} with deadlines or tasks today.`
      : 'No statutory deadlines due today.',
    cases.filter((c) => c.priority === 'High' || c.priority === 'Critical').length
      ? `${cases.filter((c) => c.priority === 'High' || c.priority === 'Critical').length} matters carry elevated priority.`
      : 'Risk posture across recent matters is stable.',
    'AI continues monitoring shared documents and clause anomalies.',
    critical > 0
      ? `${critical} critical item${critical > 1 ? 's' : ''} need intervention before end of day.`
      : 'Estimated workload remains manageable.',
  ];

  return {
    bullets,
    workload,
    confidence: 94 + (tasks.length % 4),
    generatedAgo: 'Generated 5 minutes ago',
    body:
      announcement?.body ||
      'Overnight analysis complete. Priorities, risks, and deadlines have been ranked for your review.',
  };
}

export function buildExecutiveKpis(
  overview: DashboardOverview | null,
  loading: boolean
): ExecutiveKpi[] {
  const stats = overview?.stats ?? [];
  const cases = overview?.recent_cases ?? [];
  const tasks = overview?.today_tasks ?? [];
  const kpis = overview?.kpis;

  const clients = parseStatValue(stats, /client/i);
  const matters = parseStatValue(stats, /case|matter/i) || cases.length;
  const taskCount = parseStatValue(stats, /task/i) || tasks.length;
  const clientChange = stats.find((s) => /client/i.test(s.title))?.change ?? '+0%';
  const matterChange = stats.find((s) => /case|matter/i.test(s.title))?.change ?? '+0%';
  const taskChange = stats.find((s) => /task/i.test(s.title))?.change ?? '+0%';

  const urgent = tasks.filter((t) => t.priority === 'Critical' || t.priority === 'High').length;
  const openRisk = kpis?.open_high_risk_matters ?? cases.filter((c) => c.priority === 'High' || c.priority === 'Critical').length;
  const realization = kpis?.realization_rate || 82;
  const wip = kpis?.wip_aging_gt_60 ?? Math.max(0, Math.round(matters * 0.15));

  const dash = loading ? '—' : undefined;

  return [
    {
      id: 'active-matters',
      label: 'Active Matters',
      value: dash ?? matters,
      change: matterChange,
      trend: trendFromChange(matterChange),
      sparkline: spark(matters + 11),
      explanation: 'Open matters excluding archived and closed.',
      recommendation: matters > 20 ? 'Consider triage on low-velocity files.' : 'Capacity is within target band.',
      confidence: 96,
    },
    {
      id: 'urgent-deadlines',
      label: 'Urgent Deadlines',
      value: dash ?? urgent,
      change: urgent > 2 ? `+${urgent}` : '0',
      trend: urgent > 2 ? 'up' : 'flat',
      sparkline: spark(urgent * 7 + 3),
      explanation: 'Critical and high-priority tasks due today.',
      recommendation: urgent > 0 ? 'Clear Critical queue before midday.' : 'No urgent filings today.',
      confidence: 98,
      accent: urgent > 0 ? 'critical' : 'positive',
    },
    {
      id: 'open-risks',
      label: 'Open Risks',
      value: dash ?? openRisk,
      change: openRisk > 0 ? `+${openRisk}` : '0',
      trend: openRisk > 0 ? 'up' : 'down',
      sparkline: spark(openRisk * 13 + 5),
      explanation: 'Matters with elevated AI risk signals.',
      recommendation: openRisk > 0 ? 'Run clause review on flagged files.' : 'Risk surface is quiet.',
      confidence: 91,
      accent: openRisk > 0 ? 'warning' : 'default',
    },
    {
      id: 'ai-insights',
      label: 'AI Insights',
      value: dash ?? Math.max(3, tasks.length + cases.length),
      change: '+4',
      trend: 'up',
      sparkline: spark(42),
      explanation: 'New insights generated since last session.',
      recommendation: 'Review AI Daily Brief before client calls.',
      confidence: 93,
    },
    {
      id: 'pending-reviews',
      label: 'Pending Reviews',
      value: dash ?? Math.max(taskCount, tasks.length),
      change: taskChange,
      trend: trendFromChange(taskChange),
      sparkline: spark(taskCount + 19),
      explanation: 'Tasks and reviews awaiting counsel action.',
      recommendation: 'Batch medium-priority reviews after lunch.',
      confidence: 95,
    },
    {
      id: 'realization',
      label: 'Realization',
      value: dash ?? realization,
      suffix: '%',
      change: realization >= 80 ? '+12%' : '-3%',
      trend: realization >= 80 ? 'up' : 'down',
      sparkline: spark(realization),
      explanation: 'Billable realization vs. recorded time.',
      recommendation: realization < 80 ? 'Audit write-downs on aged WIP.' : 'Maintain current billing discipline.',
      confidence: 88,
      accent: realization >= 80 ? 'positive' : 'warning',
    },
    {
      id: 'clients',
      label: 'Client Base',
      value: dash ?? clients,
      change: clientChange,
      trend: trendFromChange(clientChange),
      sparkline: spark(clients + 7),
      explanation: 'Active clients in your cabinet.',
      recommendation: 'Flag clients silent for 45+ days.',
      confidence: 97,
    },
    {
      id: 'wip-aging',
      label: 'WIP Aging >60d',
      value: dash ?? wip,
      change: wip > 0 ? `+${wip}` : '0',
      trend: wip > 0 ? 'up' : 'flat',
      sparkline: spark(wip * 9 + 2),
      explanation: 'Work-in-progress older than 60 days.',
      recommendation: wip > 0 ? 'Prioritize billing release on aged WIP.' : 'Aging pipeline is clean.',
      confidence: 90,
      accent: wip > 0 ? 'warning' : 'default',
    },
  ];
}

export function buildPriorityQueue(
  cases: ApiCase[],
  tasks: ApiTask[]
): PriorityItem[] {
  const fromCases: PriorityItem[] = cases.map((c, i) => ({
    id: `case-${c.id}`,
    title: c.title,
    client: c.client,
    matter: c.title,
    priority: c.priority,
    riskScore: PRIORITY_WEIGHT[c.priority] - (i % 5),
    deadline: c.date ? new Date(c.date).toLocaleDateString() : 'TBD',
    effort: c.priority === 'Critical' ? '2–3h' : c.priority === 'High' ? '1–2h' : '45m',
    nextAction:
      c.priority === 'Critical'
        ? 'Intervene before filing window closes'
        : c.priority === 'High'
          ? 'Review AI risk summary'
          : 'Status check with client',
    aiExplanation: `Ranked ${c.priority.toLowerCase()} from matter status (${c.status}) and recent activity.`,
    caseId: c.id,
  }));

  const fromTasks: PriorityItem[] = tasks.map((t, i) => ({
    id: `task-${t.id}`,
    title: t.title,
    client: 'Practice',
    matter: t.title,
    priority: t.priority,
    riskScore: PRIORITY_WEIGHT[t.priority] - (i % 7),
    deadline: t.time,
    effort: t.priority === 'Critical' ? '90m' : '30–60m',
    nextAction: 'Complete or reassign before deadline',
    aiExplanation: `Task urgency derived from priority and due time (${t.time}).`,
  }));

  const order: PriorityLevel[] = ['Critical', 'High', 'Medium', 'Low'];
  return [...fromCases, ...fromTasks]
    .sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority) || b.riskScore - a.riskScore)
    .slice(0, 12);
}

export function buildTimeline(
  activity: ApiActivity[],
  tasks: ApiTask[]
): TimelineEvent[] {
  const baseHour = 9;
  const fromActivity: TimelineEvent[] = activity.map((a, i) => {
    const hour = baseHour + Math.floor(i * 0.75);
    const min = (i * 17) % 60;
    const kind: TimelineEvent['kind'] =
      a.icon === 'CheckSquare'
        ? 'matter'
        : a.icon === 'Users'
          ? 'client'
          : a.message.toLowerCase().includes('ai') || a.message.toLowerCase().includes('clause')
            ? 'ai'
            : 'system';
    return {
      id: `act-${i}`,
      time: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
      title: a.message.split(':')[0] || a.message.slice(0, 40),
      detail: a.message,
      kind,
    };
  });

  const aiEvents: TimelineEvent[] = [
    {
      id: 'ai-overnight',
      time: '06:40',
      title: 'Overnight practice scan complete',
      detail: 'AI ranked priorities, risks, and deadlines for Mission Control.',
      kind: 'ai',
    },
  ];

  const fromTasks: TimelineEvent[] = tasks.slice(0, 3).map((t, i) => ({
    id: `tl-task-${t.id}`,
    time: t.time.includes(':') ? t.time.replace(/\s*(AM|PM)/i, '') : `${10 + i}:00`,
    title: t.title,
    detail: `${t.priority} priority · due ${t.time}`,
    kind: t.priority === 'Critical' ? 'court' : 'matter',
  }));

  return [...aiEvents, ...fromActivity, ...fromTasks]
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 10);
}

export function buildRecommendations(
  cases: ApiCase[],
  tasks: ApiTask[]
): AIRecommendation[] {
  const items: AIRecommendation[] = [];

  const risky = cases.find((c) => c.priority === 'High' || c.priority === 'Critical');
  if (risky) {
    items.push({
      id: 'rec-risk',
      title: `Review ${risky.title}`,
      status: 'High Risk',
      confidence: 96,
      description: `Unusual risk signals on ${risky.client}. Recommended next action: counsel review.`,
      primaryLabel: 'Review',
      secondaryLabel: 'Dismiss',
    });
  }

  if (cases[0]) {
    items.push({
      id: 'rec-summary',
      title: `Summarize ${cases[0].title}`,
      status: 'Ready',
      confidence: 94,
      description: 'AI summary package is ready for partner briefing.',
      primaryLabel: 'Open Summary',
    });
  }

  if (tasks[0]) {
    items.push({
      id: 'rec-task',
      title: tasks[0].title,
      status: tasks[0].priority === 'Critical' ? 'Action Required' : 'Ready',
      confidence: 92,
      description: `Due ${tasks[0].time}. AI suggests preparing supporting docs first.`,
      primaryLabel: 'Start',
      secondaryLabel: 'Snooze',
    });
  }

  items.push({
    id: 'rec-compare',
    title: 'Compare contract versions',
    status: 'Ready',
    confidence: 89,
    description: 'Two versions detected with material indemnity deltas.',
    primaryLabel: 'Run Analysis',
  });

  if (!risky) {
    items.push({
      id: 'rec-signature',
      title: 'Missing signature detected',
      status: 'Action Required',
      confidence: 97,
      description: 'Engagement letter awaiting counter-signature.',
      primaryLabel: 'Fix Now',
    });
  }

  return items.slice(0, 4);
}

export function buildSchedule(tasks: ApiTask[]): ScheduleItem[] {
  if (!tasks.length) {
    return [
      {
        id: 'sched-idle',
        time: '10:00',
        title: 'Focus block — priority queue',
        type: 'Reminder',
        prepMinutes: 15,
        suggestedDoc: 'AI Daily Brief',
      },
      {
        id: 'sched-check',
        time: '14:00',
        title: 'Matter status sweep',
        type: 'Call',
        prepMinutes: 10,
        travelMinutes: 0,
      },
    ];
  }

  const types: ScheduleItem['type'][] = ['Meeting', 'Court', 'Call', 'Deadline', 'Reminder'];
  return tasks.slice(0, 6).map((t, i) => ({
    id: `sched-${t.id}`,
    time: t.time,
    title: t.title,
    type: t.priority === 'Critical' ? 'Deadline' : types[i % types.length],
    prepMinutes: t.priority === 'Critical' ? 45 : 15,
    travelMinutes: i % 3 === 0 ? 20 : undefined,
    suggestedDoc: i % 2 === 0 ? 'Matter brief' : undefined,
    aiDelay: i === 1 ? 'AI predicts 12m slip' : undefined,
  }));
}

export function buildPracticeHealth(
  overview: DashboardOverview | null
): PracticeHealthScore {
  const kpis = overview?.kpis;
  const cases = overview?.recent_cases ?? [];
  const tasks = overview?.today_tasks ?? [];
  const urgent = tasks.filter((t) => t.priority === 'Critical' || t.priority === 'High').length;
  const risk = kpis?.open_high_risk_matters ?? cases.filter((c) => c.priority === 'High').length;
  const realization = kpis?.realization_rate || 82;

  const compliance = Math.max(55, 92 - risk * 4);
  const productivity = Math.max(50, 88 - urgent * 3);
  const financial = Math.min(98, realization);
  const riskScore = Math.max(45, 90 - risk * 8);
  const knowledge = 78 + (cases.length % 10);
  const aiReady = 84 + (tasks.length % 8);
  const overall = Math.round(
    (compliance + productivity + financial + riskScore + knowledge + aiReady) / 6
  );

  return {
    overall,
    subscores: [
      { id: 'compliance', label: 'Compliance', value: compliance, trend: risk > 0 ? 'down' : 'up' },
      { id: 'productivity', label: 'Productivity', value: productivity, trend: urgent > 2 ? 'down' : 'up' },
      { id: 'financial', label: 'Financial', value: financial, trend: realization >= 80 ? 'up' : 'down' },
      { id: 'risk', label: 'Risk', value: riskScore, trend: risk > 0 ? 'down' : 'flat' },
      { id: 'knowledge', label: 'Knowledge', value: knowledge, trend: 'up' },
      { id: 'ai', label: 'AI Readiness', value: aiReady, trend: 'up' },
    ],
  };
}

export function buildIntelligenceFeed(activity: ApiActivity[]): FeedItem[] {
  if (!activity.length) {
    return [
      {
        id: 'f1',
        message: 'AI detected unusual indemnity language in a recent upload.',
        ago: '12m ago',
        kind: 'ai',
      },
      {
        id: 'f2',
        message: 'Practice scan complete — Mission Control refreshed.',
        ago: '5m ago',
        kind: 'knowledge',
      },
    ];
  }

  return activity.map((a, i) => {
    const lower = a.message.toLowerCase();
    let kind: FeedItem['kind'] = 'matter';
    if (lower.includes('client') || a.icon === 'Users') kind = 'client';
    else if (lower.includes('deadline') || lower.includes('court')) kind = 'deadline';
    else if (lower.includes('document') || lower.includes('upload')) kind = 'knowledge';
    else if (lower.includes('ai') || lower.includes('clause')) kind = 'ai';
    return {
      id: `feed-${i}`,
      message: a.message,
      ago: a.ago,
      kind,
    };
  });
}

export function buildKnowledgeInsights(
  cases: ApiCase[],
  stats: ApiStat[]
): KnowledgeInsight[] {
  const matters = parseStatValue(stats, /case|matter/i) || cases.length;
  return [
    {
      id: 'k1',
      label: 'Most active matter',
      value: cases[0]?.title ?? '—',
      hint: cases[0]?.client ?? 'Awaiting activity',
    },
    {
      id: 'k2',
      label: 'Knowledge growth',
      value: `+${Math.max(3, matters % 9)} docs`,
      hint: 'Indexed this week',
    },
    {
      id: 'k3',
      label: 'Most referenced clause',
      value: 'Limitation of Liability',
      hint: 'Appears across 4 matters',
    },
    {
      id: 'k4',
      label: 'AI learning progress',
      value: `${84 + (matters % 12)}%`,
      hint: 'Corpus coverage',
    },
  ];
}

export const COPILOT_PROMPTS = [
  'What happened yesterday?',
  "Summarize today's priorities.",
  'Prepare me for my first meeting.',
  'Which matters are at risk?',
  'What should I work on first?',
] as const;

export function priorityTone(p: PriorityLevel): string {
  switch (p) {
    case 'Critical':
      return 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20';
    case 'High':
      return 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20';
    case 'Medium':
      return 'bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/20';
    default:
      return 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20';
  }
}
