import axios from 'axios';
import axiosInstance from '@/utils/axiosInstance';

export type PublicPlan = {
  code: string;
  name: string;
  description: string;
  monthly_price: string | null;
  annual_price: string | null;
  currency: string;
  maximum_users: number | null;
  storage_gb: number | null;
  monthly_juria_credits: number | null;
  is_self_serve: boolean;
  is_recommended: boolean;
  features: string[];
};

export type TrialPolicy = {
  days: number;
  credits: number;
  max_users: number;
  vat_rate: string;
  currency: string;
  prices_exclude_vat: boolean;
};

export type PlanCatalogue = {
  trial: TrialPolicy;
  plans: PublicPlan[];
};

export type SubscriptionInvoice = {
  number: string;
  status: string;
  currency: string;
  subtotal: string;
  vat_amount: string;
  total: string;
  description: string;
  created_at: string;
  paid_at: string | null;
};

export type CurrentSubscription = {
  plan: PublicPlan;
  billing_cycle: 'monthly' | 'annual';
  status: string;
  list_price: string | null;
  currency: string;
  trial_end: string | null;
  trial_days_left: number | null;
  renews_or_expires_at: string | null;
  cancel_at_period_end: boolean;
  cancellation_date: string | null;
  pending_plan: PublicPlan | null;
  seats_used: number;
  seat_limit: number | null;
  storage_used_bytes: number;
  storage_limit_bytes: number | null;
  monthly_juria_credits: number | null;
  credits_remaining: number;
  can_manage: boolean;
  payment_required: boolean;
  invoices?: SubscriptionInvoice[];
};

export const fetchPublicPlans = () =>
  axios
    .get<PlanCatalogue>(`${axiosInstance.defaults.baseURL}/subscriptions/plans/`)
    .then((response) => response.data);

export const fetchCurrentSubscription = () =>
  axiosInstance.get<CurrentSubscription | { subscription: null }>('/subscriptions/current/');

export const changeSubscriptionPlan = (planCode: string, billingCycle: 'monthly' | 'annual') =>
  axiosInstance.post('/subscriptions/change-plan/', {
    plan_code: planCode,
    billing_cycle: billingCycle,
  });

export const cancelSubscription = () => axiosInstance.post('/subscriptions/cancel/');
