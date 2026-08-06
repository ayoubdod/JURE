export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export type ApiStat = {
  title: string;
  value: string;
  change: string;
  icon: string;
  color: string;
};

export type ApiCase = {
  id: number;
  title: string;
  client: string;
  status: string;
  priority: PriorityLevel;
  date: string;
};

export type ApiTask = {
  id: number;
  title: string;
  time: string;
  priority: PriorityLevel;
};

export type ApiActivity = {
  icon: string;
  message: string;
  ago: string;
};

export type ApiKpis = {
  wip_aging_gt_60: number;
  open_high_risk_matters: number;
  realization_rate: number;
};

export type DashboardOverview = {
  stats: ApiStat[];
  announcement: { title: string; body: string };
  recent_cases: ApiCase[];
  today_tasks: ApiTask[];
  recent_activity: ApiActivity[];
  kpis: ApiKpis;
};

export type IntelligenceBullet = {
  id: string;
  text: string;
  tone: 'critical' | 'warning' | 'info' | 'positive';
};

export type DailyBrief = {
  bullets: string[];
  workload: 'Light' | 'Moderate' | 'Heavy';
  confidence: number;
  generatedAgo: string;
  body: string;
};

export type ExecutiveKpi = {
  id: string;
  label: string;
  value: string | number;
  suffix?: string;
  change: string;
  trend: 'up' | 'down' | 'flat';
  sparkline: number[];
  explanation: string;
  recommendation: string;
  confidence: number;
  accent?: 'default' | 'warning' | 'critical' | 'positive';
};

export type PriorityItem = {
  id: string;
  title: string;
  client: string;
  matter: string;
  priority: PriorityLevel;
  riskScore: number;
  deadline: string;
  effort: string;
  nextAction: string;
  aiExplanation: string;
  caseId?: number;
};

export type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  detail: string;
  kind: 'system' | 'ai' | 'client' | 'court' | 'matter';
};

export type AIRecommendation = {
  id: string;
  title: string;
  status: 'High Risk' | 'Ready' | 'Action Required';
  confidence: number;
  description: string;
  primaryLabel: string;
  secondaryLabel?: string;
};

export type ScheduleItem = {
  id: string;
  time: string;
  title: string;
  type: 'Meeting' | 'Court' | 'Call' | 'Deadline' | 'Reminder';
  prepMinutes?: number;
  travelMinutes?: number;
  suggestedDoc?: string;
  aiDelay?: string;
};

export type PracticeHealthScore = {
  overall: number;
  subscores: {
    id: string;
    label: string;
    value: number;
    trend: 'up' | 'down' | 'flat';
  }[];
};

export type FeedItem = {
  id: string;
  message: string;
  ago: string;
  kind: 'ai' | 'matter' | 'client' | 'deadline' | 'knowledge';
};

export type KnowledgeInsight = {
  id: string;
  label: string;
  value: string;
  hint: string;
};

export type CommandActionId =
  | 'matter'
  | 'client'
  | 'upload'
  | 'contract'
  | 'askAi'
  | 'conflict'
  | 'draft'
  | 'notes'
  | 'research'
  | 'timeline'
  | 'invoice'
  | 'knowledge'
  | 'appointment'
  | 'task'
  | 'clauseLib'
  | 'closeMatter';

export type MobileCommandTab = 'overview' | 'priorities' | 'timeline' | 'ai';
