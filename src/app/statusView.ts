import type { AppElements } from "../ui";
import type { Messages } from "../i18n";

export type PostureViewStatus = "idle" | "missing" | "good" | "bad";
type MessagesProvider = () => Messages;

export function createStatusView(elements: AppElements, getMessages: MessagesProvider) {
  let currentStatus: PostureViewStatus = "idle";
  let currentProgress = 0;
  let currentBadDurationMs = 0;

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
    const t = getMessages();
    currentStatus = status;
    currentProgress = progress;
    currentBadDurationMs = badDurationMs;
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
      elements.statusLabel.textContent = t.camera.lookingForPerson;
    } else {
      setPostureBadge(status, t.posture.idleBadge);
      setMetricMessage(t.posture.idleMessage);
    }
  }

  function refreshLocale() {
    updateStatus(currentStatus, currentProgress, currentBadDurationMs);
  }

  return {
    refreshLocale,
    setStartButtonLabel,
    setMetricMessage,
    setPostureBadge,
    setMeterProgress,
    updateStatus,
  };
}

export type StatusView = ReturnType<typeof createStatusView>;
