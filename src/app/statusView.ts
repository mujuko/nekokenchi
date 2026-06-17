import type { AppElements } from "../ui";
import type { Messages } from "../i18n";

export type PostureViewStatus = "idle" | "missing" | "good" | "bad";

export function createStatusView(elements: AppElements, t: Messages) {
  function setStartButtonLabel(label: string) {
    elements.startButtonLabel.textContent = label;
  }

  function setMetricMessage(message: string) {
    elements.metricMessages.forEach((element) => {
      element.textContent = message;
    });
  }

  function setPostureBadge(status: PostureViewStatus, text: string) {
    elements.postureBadges.forEach((element) => {
      element.className = `posture-badge ${status}`;
      element.textContent = text;
    });
  }

  function setMeterProgress(progress: number) {
    elements.meterFills.forEach((element) => {
      element.style.width = `${Math.max(4, progress * 100)}%`;
    });
  }

  function updateStatus(
    status: PostureViewStatus,
    progress: number,
    badDurationMs: number,
  ) {
    setMeterProgress(progress);

    if (status === "good") {
      setPostureBadge(status, t.posture.goodBadge);
      setMetricMessage(t.posture.goodMessage);
      elements.statusLabel.textContent = t.calibration.watching;
      elements.statusPill.className = "status-pill";
    } else if (status === "bad") {
      const remaining = Math.max(
        0,
        Math.ceil((Number(elements.duration.value) - badDurationMs) / 1000),
      );
      setPostureBadge(
        status,
        remaining > 0 ? t.posture.badCountdown(remaining) : t.posture.badBadge,
      );
      setMetricMessage(
        remaining > 0
          ? t.posture.badMessageWarning
          : t.posture.badMessageAlert,
      );
      elements.statusLabel.textContent = t.posture.badStatus;
      elements.statusPill.className = "status-pill warning";
    } else if (status === "missing") {
      setPostureBadge(status, t.posture.missingBadge);
      setMetricMessage(t.posture.missingMessage);
    } else {
      setPostureBadge(status, t.posture.idleBadge);
      setMetricMessage(t.posture.idleMessage);
    }
  }

  return {
    setStartButtonLabel,
    setMetricMessage,
    setPostureBadge,
    setMeterProgress,
    updateStatus,
  };
}

export type StatusView = ReturnType<typeof createStatusView>;
