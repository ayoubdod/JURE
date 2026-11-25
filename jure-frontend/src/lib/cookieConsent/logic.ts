/** Pure consent rules. Optional categories stay off until a current grant exists. */

export type ConsentDecision = {
  action: string;
  functional: boolean;
  analytics: boolean;
  policy_version: string;
  stale: boolean;
  effective_functional: boolean;
  effective_analytics: boolean;
};

export type ConsentEnvelope = {
  policy_version: string;
  analytics_configured: boolean;
  subject: "anonymous" | "user";
  decision: ConsentDecision | null;
};

export type ConsentWrite =
  | { action: "accept_all" }
  | { action: "reject_non_essential" }
  | { action: "withdraw" }
  | { action: "custom"; functional: boolean; analytics: boolean };

export function bannerRequired(decision: ConsentDecision | null | undefined): boolean {
  if (!decision) return true;
  return decision.stale === true;
}

/** First visit and a new policy version start with optional categories off. */
export function optionalSelection(
  decision: ConsentDecision | null | undefined,
  analyticsConfigured: boolean,
): { functional: boolean; analytics: boolean } {
  if (!decision || decision.stale) {
    return { functional: false, analytics: false };
  }
  return {
    functional: decision.functional === true,
    analytics: analyticsConfigured && decision.analytics === true,
  };
}

export function writeForAcceptAll(): ConsentWrite {
  return { action: "accept_all" };
}

export function writeForReject(): ConsentWrite {
  return { action: "reject_non_essential" };
}

export function writeForCustom(
  selection: { functional: boolean; analytics: boolean },
  analyticsConfigured: boolean,
  hasPriorDecision: boolean,
): ConsentWrite {
  const functional = selection.functional === true;
  const analytics = analyticsConfigured && selection.analytics === true;
  if (!functional && !analytics) {
    return { action: hasPriorDecision ? "withdraw" : "reject_non_essential" };
  }
  return { action: "custom", functional, analytics };
}

export function analyticsMayLoad(args: {
  measurementId?: string | null;
  analyticsConfigured: boolean;
  decision: ConsentDecision | null | undefined;
}): boolean {
  const measurementId = args.measurementId?.trim();
  if (!measurementId) return false;
  if (!args.analyticsConfigured) return false;
  if (!args.decision || args.decision.stale) return false;
  return args.decision.effective_analytics === true;
}
