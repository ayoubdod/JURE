import { describe, expect, it } from "vitest";
import { cookieCopyAr, cookieCopyEn, cookieCopyFr } from "@/i18n/messages/cookies";
import { analyticsBufferSize, clearAnalyticsProvider, discardAnalyticsBuffer, track } from "@/lib/analytics";
import {
  analyticsMayLoad,
  bannerRequired,
  optionalSelection,
  writeForCustom,
  type ConsentDecision,
} from "./logic";

const granted: ConsentDecision = {
  action: "accept_all",
  functional: true,
  analytics: true,
  policy_version: "1.0",
  stale: false,
  effective_functional: true,
  effective_analytics: true,
};

describe("cookie consent rules", () => {
  it("shows the banner for a first visit and after a policy change", () => {
    expect(bannerRequired(null)).toBe(true);
    expect(bannerRequired(granted)).toBe(false);
    expect(bannerRequired({ ...granted, stale: true })).toBe(true);
  });

  it("does not preselect optional categories", () => {
    expect(optionalSelection(null, true)).toEqual({ functional: false, analytics: false });
    expect(optionalSelection({ ...granted, stale: true }, true)).toEqual({
      functional: false,
      analytics: false,
    });
    expect(optionalSelection(granted, false).analytics).toBe(false);
  });

  it("turns a cleared custom choice into a withdrawal when a decision already exists", () => {
    expect(writeForCustom({ functional: false, analytics: false }, true, true)).toEqual({
      action: "withdraw",
    });
    expect(writeForCustom({ functional: true, analytics: true }, false, false)).toEqual({
      action: "custom",
      functional: true,
      analytics: false,
    });
  });

  it("blocks analytics until a current grant, a configured provider, and a measurement id", () => {
    expect(
      analyticsMayLoad({
        measurementId: "G-TEST",
        analyticsConfigured: true,
        decision: granted,
      }),
    ).toBe(true);
    expect(
      analyticsMayLoad({
        measurementId: "G-TEST",
        analyticsConfigured: true,
        decision: null,
      }),
    ).toBe(false);
    expect(
      analyticsMayLoad({
        measurementId: "G-TEST",
        analyticsConfigured: true,
        decision: { ...granted, stale: true, effective_analytics: false },
      }),
    ).toBe(false);
    expect(
      analyticsMayLoad({
        measurementId: "",
        analyticsConfigured: true,
        decision: granted,
      }),
    ).toBe(false);
    expect(
      analyticsMayLoad({
        measurementId: "G-TEST",
        analyticsConfigured: false,
        decision: granted,
      }),
    ).toBe(false);
  });

  it("drops queued events when consent is withdrawn", () => {
    clearAnalyticsProvider();
    track("marketing.hero.primary_cta");
    expect(analyticsBufferSize()).toBe(1);
    discardAnalyticsBuffer();
    expect(analyticsBufferSize()).toBe(0);
    track("marketing.hero.primary_cta");
    clearAnalyticsProvider();
    expect(analyticsBufferSize()).toBe(0);
  });

  it("keeps French, English and Arabic cookie copy in parity", () => {
    const keys = (value: object) => Object.keys(value).sort();
    expect(keys(cookieCopyFr)).toEqual(keys(cookieCopyEn));
    expect(keys(cookieCopyAr)).toEqual(keys(cookieCopyEn));
  });
});
