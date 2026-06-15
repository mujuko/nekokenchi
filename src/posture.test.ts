import { describe, expect, it } from "vitest";
import { average, evaluatePosture, type PostureState } from "./posture";

const settings = {
  threshold: 0.08,
  warningDurationMs: 3000,
  cooldownMs: 10000,
};

describe("evaluatePosture", () => {
  it("alerts after bad posture continues for the configured duration", () => {
    const initial: PostureState = {
      baselineY: 0.3,
      badSince: null,
      lastAlertAt: null,
    };
    const started = evaluatePosture(0.4, 1000, initial, settings);
    const alerted = evaluatePosture(0.4, 4000, started.state, settings);

    expect(started.shouldAlert).toBe(false);
    expect(alerted.shouldAlert).toBe(true);
  });

  it("resets the timer when posture recovers", () => {
    const state: PostureState = {
      baselineY: 0.3,
      badSince: 1000,
      lastAlertAt: null,
    };
    const result = evaluatePosture(0.32, 2500, state, settings);

    expect(result.isBad).toBe(false);
    expect(result.state.badSince).toBeNull();
  });

  it("respects the alert cooldown", () => {
    const state: PostureState = {
      baselineY: 0.3,
      badSince: 1000,
      lastAlertAt: 3500,
    };
    const result = evaluatePosture(0.4, 5000, state, settings);

    expect(result.shouldAlert).toBe(false);
  });
});

describe("average", () => {
  it("returns the mean or null for an empty set", () => {
    expect(average([0.2, 0.4, 0.6])).toBeCloseTo(0.4);
    expect(average([])).toBeNull();
  });
});
