import { describe, expect, it } from "vitest";
import { average, evaluatePosture, type PostureState } from "./posture";

const settings = {
  threshold: 0.75,
  warningDurationMs: 3000,
  cooldownMs: 10000,
};

describe("evaluatePosture", () => {
  it("alerts after bad posture continues for the configured duration", () => {
    const initial: PostureState = {
      goodY: 0.3,
      badY: 0.4,
      badSince: null,
      lastAlertAt: null,
    };
    const started = evaluatePosture(0.4, 1000, initial, settings);
    const alerted = evaluatePosture(0.4, 4000, started.state, settings);

    expect(started.shouldAlert).toBe(false);
    expect(alerted.shouldAlert).toBe(true);
  });

  it("scores posture by closeness to the calibrated bad posture", () => {
    const state: PostureState = {
      goodY: 0.3,
      badY: 0.5,
      badSince: null,
      lastAlertAt: null,
    };
    const result = evaluatePosture(0.45, 1000, state, settings);

    expect(result.score).toBeCloseTo(0.75);
    expect(result.isBad).toBe(true);
  });

  it("resets the timer when posture recovers", () => {
    const state: PostureState = {
      goodY: 0.3,
      badY: 0.4,
      badSince: 1000,
      lastAlertAt: null,
    };
    const result = evaluatePosture(0.32, 2500, state, settings);

    expect(result.isBad).toBe(false);
    expect(result.state.badSince).toBeNull();
  });

  it("resets the alert cooldown when posture recovers", () => {
    const state: PostureState = {
      goodY: 0.3,
      badY: 0.4,
      badSince: 1000,
      lastAlertAt: 4000,
    };
    const result = evaluatePosture(0.32, 5000, state, settings);

    expect(result.isBad).toBe(false);
    expect(result.state.lastAlertAt).toBeNull();
  });

  it("respects the alert cooldown", () => {
    const state: PostureState = {
      goodY: 0.3,
      badY: 0.4,
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
