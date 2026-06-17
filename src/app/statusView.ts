import type { AppElements } from "../ui";

export type PostureViewStatus = "idle" | "missing" | "good" | "bad";

export function createStatusView(elements: AppElements) {
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
      setPostureBadge(status, "いい姿勢");
      setMetricMessage("きれいな姿勢です。その調子でいきましょう。");
      elements.statusLabel.textContent = "見守り中";
      elements.statusPill.className = "status-pill";
    } else if (status === "bad") {
      const remaining = Math.max(
        0,
        Math.ceil((Number(elements.duration.value) - badDurationMs) / 1000),
      );
      setPostureBadge(status, remaining > 0 ? `あと ${remaining}秒` : "猫背を検知");
      setMetricMessage(
        remaining > 0
          ? "頭の位置が少し下がっています。背すじを意識してみましょう。"
          : "姿勢が丸まっています。肩の力を抜いて、背すじを伸ばしましょう。",
      );
      elements.statusLabel.textContent = "姿勢が低下";
      elements.statusPill.className = "status-pill warning";
    } else if (status === "missing") {
      setPostureBadge(status, "検出待ち");
      setMetricMessage("顔と肩がカメラに映る位置へ移動してください。");
    } else {
      setPostureBadge(status, "待機中");
      setMetricMessage("カメラを起動すると、ここに姿勢の状態が表示されます。");
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
