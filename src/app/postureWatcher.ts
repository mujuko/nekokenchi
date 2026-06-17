import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { evaluatePosture, type PostureState } from "../posture";
import type { AppElements } from "../ui";
import type { Messages } from "../i18n";
import {
  getCameraStream,
  getStartupErrorMessage,
  isCameraContextAvailable,
  playVideo,
} from "./camera";
import { createCalibrationController } from "./calibration";
import { createDesktopNotifier } from "./desktopNotification";
import { createOverlay } from "./overlay";
import { createLandmarker } from "./poseLandmarker";
import type { SoundController } from "./sound";
import type { StatusView } from "./statusView";

type MessagesProvider = () => Messages;

export function createPostureWatcher(
  elements: AppElements,
  statusView: StatusView,
  sound: SoundController,
  getMessages: MessagesProvider,
) {
  const BACKGROUND_PREDICTION_INTERVAL_MS = 125;

  let poseLandmarker: PoseLandmarker | null = null;
  let stream: MediaStream | null = null;
  let animationFrame = 0;
  let backgroundTimer = 0;
  let lastVideoTime = -1;
  let predicting = false;
  let postureState: PostureState = createEmptyPostureState();

  const overlay = createOverlay(elements, () => postureState);
  const desktopNotifier = createDesktopNotifier(getMessages);
  const calibration = createCalibrationController(
    elements,
    (state) => {
      postureState = state;
    },
    getMessages,
  );

  async function startCamera() {
    const startupMessages = getMessages();
    void sound.unlock();
    void desktopNotifier.requestPermission();

    if (!isCameraContextAvailable()) {
      showStartupError(startupMessages.camera.fileUnavailable);
      return;
    }

    elements.startButton.disabled = true;
    statusView.setStartButtonLabel(startupMessages.camera.waitingPermission);

    try {
      const mediaStream = await getCameraStream(getMessages());
      stream = mediaStream;

      if (!poseLandmarker) {
        const loadingMessages = getMessages();
        statusView.setStartButtonLabel(loadingMessages.camera.loadingModel);
        statusView.setMetricMessage(loadingMessages.camera.loadingModelMessage);
        poseLandmarker = await createLandmarker(loadingMessages);
      }

      elements.video.srcObject = stream;
      await playVideo(elements.video, getMessages());

      elements.placeholder.hidden = true;
      elements.video.classList.add("visible");
      elements.statusPill.hidden = false;
      elements.calibrateButton.disabled = false;
      statusView.setStartButtonLabel(getMessages().camera.stop);
      elements.startButton.disabled = false;
      elements.startButton.classList.add("stop");
      elements.startButton.onclick = stopCamera;
      overlay.resizeCanvas();
      calibration.begin();
      scheduleNextPrediction();
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      console.error(error);
      showStartupError(getStartupErrorMessage(error, getMessages()));
    }
  }

  function stopCamera() {
    cancelScheduledPrediction();
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    elements.video.srcObject = null;
    overlay.clear();
    elements.video.classList.remove("visible");
    elements.placeholder.hidden = false;
    elements.statusPill.hidden = true;
    elements.calibrationOverlay.hidden = true;
    elements.calibrateButton.disabled = true;
    statusView.setStartButtonLabel(getMessages().camera.start);
    elements.startButton.classList.remove("stop");
    elements.startButton.onclick = startCamera;
    calibration.reset();
    postureState = createEmptyPostureState();
    statusView.updateStatus("idle", 0, 0);
  }

  function cancelScheduledPrediction() {
    cancelAnimationFrame(animationFrame);
    window.clearTimeout(backgroundTimer);
    animationFrame = 0;
    backgroundTimer = 0;
    predicting = false;
  }

  function scheduleNextPrediction() {
    cancelAnimationFrame(animationFrame);
    window.clearTimeout(backgroundTimer);

    if (document.hidden) {
      backgroundTimer = window.setTimeout(
        predict,
        BACKGROUND_PREDICTION_INTERVAL_MS,
      );
      return;
    }

    animationFrame = requestAnimationFrame(predict);
  }

  function predict() {
    if (!poseLandmarker || !stream) return;
    if (predicting) {
      scheduleNextPrediction();
      return;
    }

    const now = performance.now();
    if (elements.video.currentTime !== lastVideoTime && elements.video.readyState >= 2) {
      lastVideoTime = elements.video.currentTime;
      predicting = true;
      poseLandmarker.detectForVideo(elements.video, now, (poseResult) => {
        predicting = false;
        if (!stream) {
          overlay.clear();
          return;
        }

        const landmarks = poseResult.landmarks[0];
        overlay.drawPose(landmarks);

        if (!landmarks) {
          elements.statusLabel.textContent = getMessages().camera.lookingForPerson;
          statusView.updateStatus("missing", 0, 0);
          return;
        }

        const nose = landmarks[0];
        if (!nose || (nose.visibility ?? 1) < 0.55) {
          statusView.updateStatus("missing", 0, 0);
          return;
        }

        if (calibration.isCalibrating()) {
          calibration.handleSample(nose.y, now);
          return;
        }

        const postureResult = evaluatePosture(nose.y, now, postureState, {
          threshold: Number(elements.sensitivity.value),
          warningDurationMs: Number(elements.duration.value),
          cooldownMs: 12000,
        });
        postureState = postureResult.state;

        if (postureResult.shouldAlert) {
          void sound.playAlert();
          desktopNotifier.notifyBadPosture();
          sound.flashAlert();
        }

        statusView.updateStatus(
          postureResult.isBad ? "bad" : "good",
          postureResult.score,
          postureResult.badDurationMs,
        );
      });
    }

    scheduleNextPrediction();
  }

  function showStartupError(message: string) {
    const t = getMessages();
    elements.startButton.disabled = false;
    statusView.setStartButtonLabel(t.camera.retry);
    statusView.setMetricMessage(message);
    statusView.setPostureBadge("bad", t.camera.startupError);
  }

  function showUnsupportedStateIfNeeded() {
    if (isCameraContextAvailable()) return;

    elements.startButton.disabled = true;
    const t = getMessages();
    statusView.setStartButtonLabel(t.camera.localHostRequired);
    statusView.setMetricMessage(t.camera.filePreviewOnly);
  }

  function refreshLocale() {
    const t = getMessages();

    calibration.refreshLocale();
    statusView.refreshLocale();

    if (!isCameraContextAvailable()) {
      showUnsupportedStateIfNeeded();
      return;
    }

    if (stream) {
      statusView.setStartButtonLabel(t.camera.stop);
      return;
    }

    if (!elements.startButton.disabled) {
      statusView.setStartButtonLabel(t.camera.start);
    }
  }

  window.addEventListener("resize", overlay.resizeCanvas);
  document.addEventListener("visibilitychange", () => {
    if (!stream) return;
    scheduleNextPrediction();
  });

  return {
    beginCalibration: calibration.begin,
    refreshLocale,
    showUnsupportedStateIfNeeded,
    startCamera,
  };
}

function createEmptyPostureState(): PostureState {
  return { goodY: null, badY: null, badSince: null, lastAlertAt: null };
}
