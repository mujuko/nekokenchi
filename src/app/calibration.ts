import { average, type PostureState } from "../posture";
import type { AppElements } from "../ui";
import type { Messages } from "../i18n";

const CALIBRATION_SAMPLE_MS = 3000;
const CALIBRATION_TRANSITION_MS = 2500;

type CalibrationStep = "good" | "transition" | "bad";

export function createCalibrationController(
  elements: AppElements,
  onCalibrated: (state: PostureState) => void,
  t: Messages,
) {
  let calibrating = false;
  let step: CalibrationStep | null = null;
  let startedAt = 0;
  let samples: number[] = [];
  let calibratedGoodY: number | null = null;

  function begin() {
    calibrating = true;
    step = "good";
    startedAt = performance.now();
    samples = [];
    calibratedGoodY = null;
    elements.calibrationOverlay.hidden = false;
    elements.calibrationTitle.textContent = t.calibration.goodTitle;
    elements.calibrationHelp.textContent = t.calibration.goodHelp;
    elements.countdown.textContent = "3";
    elements.statusLabel.textContent = t.calibration.status;
    elements.statusPill.className = "status-pill calibrating";
    onCalibrated({ goodY: null, badY: null, badSince: null, lastAlertAt: null });
  }

  function reset() {
    calibrating = false;
    step = null;
  }

  function handleSample(noseY: number, now: number) {
    const elapsed = now - startedAt;

    if (step === "transition") {
      elements.countdown.textContent = String(
        Math.max(1, Math.ceil((CALIBRATION_TRANSITION_MS - elapsed) / 1000)),
      );

      if (elapsed >= CALIBRATION_TRANSITION_MS) {
        step = "bad";
        startedAt = now;
        samples = [];
        elements.calibrationTitle.textContent = t.calibration.badTitle;
        elements.calibrationHelp.textContent = t.calibration.badHelp;
        elements.countdown.textContent = "3";
      }
      return;
    }

    samples.push(noseY);
    elements.countdown.textContent = String(
      Math.max(1, Math.ceil((CALIBRATION_SAMPLE_MS - elapsed) / 1000)),
    );

    if (elapsed < CALIBRATION_SAMPLE_MS) return;

    const averageY = average(samples);
    if (averageY === null) return;

    if (step === "good") {
      calibratedGoodY = averageY;
      step = "transition";
      startedAt = now;
      samples = [];
      elements.calibrationTitle.textContent = t.calibration.transitionTitle;
      elements.calibrationHelp.textContent = t.calibration.transitionHelp;
      elements.countdown.textContent = "3";
      return;
    }

    if (step === "bad" && calibratedGoodY !== null) {
      onCalibrated({
        goodY: calibratedGoodY,
        badY: averageY,
        badSince: null,
        lastAlertAt: null,
      });
      calibrating = false;
      step = null;
      elements.calibrationOverlay.hidden = true;
      elements.statusLabel.textContent = t.calibration.watching;
      elements.statusPill.className = "status-pill";
    }
  }

  function isCalibrating() {
    return calibrating;
  }

  return {
    begin,
    handleSample,
    isCalibrating,
    reset,
  };
}

export type CalibrationController = ReturnType<typeof createCalibrationController>;
