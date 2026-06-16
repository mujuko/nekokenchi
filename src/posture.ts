export type PostureSettings = {
  threshold: number;
  warningDurationMs: number;
  cooldownMs: number;
};

const MIN_CALIBRATED_DROP = 0.02;

export type PostureState = {
  goodY: number | null;
  badY: number | null;
  badSince: number | null;
  lastAlertAt: number | null;
};

export type PostureResult = {
  state: PostureState;
  drop: number;
  score: number;
  isBad: boolean;
  shouldAlert: boolean;
  badDurationMs: number;
};

export function evaluatePosture(
  noseY: number,
  now: number,
  previous: PostureState,
  settings: PostureSettings,
): PostureResult {
  if (previous.goodY === null || previous.badY === null) {
    return {
      state: previous,
      drop: 0,
      score: 0,
      isBad: false,
      shouldAlert: false,
      badDurationMs: 0,
    };
  }

  const drop = noseY - previous.goodY;
  const calibratedDrop = Math.max(MIN_CALIBRATED_DROP, previous.badY - previous.goodY);
  const score = Math.max(0, Math.min(1, drop / calibratedDrop));
  const isBad = score >= settings.threshold;
  const badSince = isBad ? (previous.badSince ?? now) : null;
  const badDurationMs = badSince === null ? 0 : Math.max(0, now - badSince);
  const cooldownPassed =
    previous.lastAlertAt === null ||
    now - previous.lastAlertAt >= settings.cooldownMs;
  const shouldAlert =
    isBad && badDurationMs >= settings.warningDurationMs && cooldownPassed;

  return {
    state: {
      goodY: previous.goodY,
      badY: previous.badY,
      badSince,
      lastAlertAt: shouldAlert ? now : previous.lastAlertAt,
    },
    drop,
    score,
    isBad,
    shouldAlert,
    badDurationMs,
  };
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
