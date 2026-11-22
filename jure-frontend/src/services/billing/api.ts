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
  display_order: number;
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
  trial_start?: string | null;
  trial_days_left: number | null;
  current_period_start?: string | null;
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

export type StoragePackage = {
  code: string;
  name: string;
  description: string;
  capacity_bytes: number;
  price: string | null;
  currency: string;
  billing_type: string;
  is_purchasable: boolean;
  price_approved: boolean;
};

export type CreditPackageOffer = {
  code: string;
  name: string;
  description: string;
  credits: number;
  price: string | null;
  currency: string;
  validity_days: number;
  is_purchasable: boolean;
};

export type AddonPurchaseRow = {
  id: number;
  kind: string;
  package_code: string;
  package_name: string;
  capacity_bytes: number | null;
  credits: number | null;
  validity_days: number | null;
  subtotal: string;
  currency: string;
  tax_confirmed: boolean;
  payment_reference: string;
  bank_reference: string | null;
  status: string;
  created_at: string;
  activated_at: string | null;
};

export type StorageSummary = {
  included_bytes: number | null;
  purchased_bytes: number;
  total_bytes: number | null;
  used_bytes: number;
  remaining_bytes: number | null;
  usage_percent: number | null;
  level: 'normal' | 'warning' | 'critical' | 'full';
  breakdown: { library_bytes: number; case_bytes: number; juria_bytes: number; total_bytes: number };
  packages: StoragePackage[];
  pending_purchases?: AddonPurchaseRow[];
  can_manage: boolean;
  tax_confirmed: boolean;
};

export type CreditLotRow = { remaining: number; issued: number; expires_at: string; expiring_soon: boolean };

export type CreditHistoryRow = {
  movement_type: string;
  amount: number;
  balance_after: number;
  created_at: string;
};

export type CreditSummary = {
  total_available: number;
  monthly_allowance: number | null;
  monthly_remaining: number;
  monthly_used: number;
  purchased_remaining: number;
  trial_remaining: number;
  lots: CreditLotRow[];
  alerts: string[];
  history?: CreditHistoryRow[];
  packages: CreditPackageOffer[];
  pending_purchases?: AddonPurchaseRow[];
  can_manage: boolean;
  tax_confirmed: boolean;
};

export type BillingHistory = {
  invoices: SubscriptionInvoice[];
  purchases: AddonPurchaseRow[];
  tax_confirmed: boolean;
};

export const fetchStorageSummary = () => axiosInstance.get<StorageSummary>('/subscriptions/storage/');
export const fetchCreditSummary = () => axiosInstance.get<CreditSummary>('/subscriptions/credits/');
export const fetchBillingHistory = () => axiosInstance.get<BillingHistory>('/subscriptions/billing/');
export const requestStoragePurchase = (packageCode: string) =>
  axiosInstance.post<AddonPurchaseRow>('/subscriptions/storage/purchase/', { package_code: packageCode });
export const requestCreditPurchase = (packageCode: string) =>
  axiosInstance.post<AddonPurchaseRow>('/subscriptions/credits/purchase/', { package_code: packageCode });
export const cancelAddonPurchase = (purchaseId: number) =>
  axiosInstance.post<AddonPurchaseRow>(`/subscriptions/purchases/${purchaseId}/cancel/`);

