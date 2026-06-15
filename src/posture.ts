export type PostureSettings = {
  threshold: number;
  warningDurationMs: number;
  cooldownMs: number;
};

export type PostureState = {
  baselineY: number | null;
  badSince: number | null;
  lastAlertAt: number | null;
};

export type PostureResult = {
  state: PostureState;
  drop: number;
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
  if (previous.baselineY === null) {
    return {
      state: previous,
      drop: 0,
      isBad: false,
      shouldAlert: false,
      badDurationMs: 0,
    };
  }

  const drop = noseY - previous.baselineY;
  const isBad = drop >= settings.threshold;
  const badSince = isBad ? (previous.badSince ?? now) : null;
  const badDurationMs = badSince === null ? 0 : Math.max(0, now - badSince);
  const cooldownPassed =
    previous.lastAlertAt === null ||
    now - previous.lastAlertAt >= settings.cooldownMs;
  const shouldAlert =
    isBad && badDurationMs >= settings.warningDurationMs && cooldownPassed;

  return {
    state: {
      baselineY: previous.baselineY,
      badSince,
      lastAlertAt: shouldAlert ? now : previous.lastAlertAt,
    },
    drop,
    isBad,
    shouldAlert,
    badDurationMs,
  };
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
