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
import type { DisplaySettingsController } from "./displaySettings";

type MessagesProvider = () => Messages;

export function createPostureWatcher(
  elements: AppElements,
  statusView: StatusView,
  sound: SoundController,
  displaySettings: DisplaySettingsController,
  getMessages: MessagesProvider,
) {
  const BACKGROUND_PREDICTION_INTERVAL_MS = 125;

  let poseLandmarker: PoseLandmarker | null = null;
  let stream: MediaStream | null = null;
  let animationFrame = 0;
  let backgroundTimer = 0;
  let lastVideoTime = -1;
  let predicting = false;
  let paused = false;
  let postureState: PostureState = createEmptyPostureState();

  const overlay = createOverlay(
    elements,
    () => postureState,
    displaySettings.getSettings,
  );
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
        statusView.setCameraMessage(loadingMessages.camera.loadingModelMessage);
        poseLandmarker = await createLandmarker(loadingMessages);
      }

      elements.video.srcObject = stream;
      await playVideo(elements.video, getMessages());

      elements.placeholder.hidden = true;
      elements.video.classList.add("visible");
      elements.statusPill.hidden = false;
      elements.pauseButton.disabled = true;
      updatePauseButton(false);
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
    calibration.reset();
    paused = false;
    elements.pauseButton.disabled = true;
    updatePauseButton(false);
    elements.calibrateButton.disabled = true;
    statusView.setStartButtonLabel(getMessages().camera.start);
    elements.startButton.classList.remove("stop");
    elements.startButton.onclick = startCamera;
    postureState = createEmptyPostureState();
    statusView.updateStatus("idle", 0, 0);
  }

  function updatePauseButton(isPaused: boolean) {
    const t = getMessages();
    elements.pauseButtonLabel.textContent = isPaused ? t.camera.resume : t.camera.pause;
    elements.pauseButtonPauseIcon.toggleAttribute("hidden", isPaused);
    elements.pauseButtonResumeIcon.toggleAttribute("hidden", !isPaused);
  }

  function pauseDetection() {
    if (!stream || paused || calibration.isCalibrating()) return;

    paused = true;
    cancelScheduledPrediction();
    overlay.clear();
    elements.calibrationOverlay.hidden = true;
    updatePauseButton(true);
    elements.calibrateButton.disabled = true;
    statusView.updateStatus("paused", 0, 0);
  }

  function resumeDetection() {
    if (!stream || !paused) return;

    paused = false;
    updatePauseButton(false);
    elements.calibrateButton.disabled = false;
    statusView.updateStatus("idle", 0, 0);
    scheduleNextPrediction();
  }

  function toggleDetectionPause() {
    if (paused) {
      resumeDetection();
      return;
    }

    pauseDetection();
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
    if (!poseLandmarker || !stream || paused) return;
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
        if (!stream || paused) {
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
          elements.pauseButton.disabled = calibration.isCalibrating();
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
    statusView.setCameraMessage(message);
    statusView.setPostureBadge("bad", t.camera.startupError);
  }

  function showUnsupportedStateIfNeeded() {
    if (isCameraContextAvailable()) return;

    elements.startButton.disabled = true;
    const t = getMessages();
    statusView.setStartButtonLabel(t.camera.localHostRequired);
    statusView.setCameraMessage(t.camera.filePreviewOnly);
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
      updatePauseButton(paused);
      statusView.setStartButtonLabel(t.camera.stop);
      return;
    }

    if (!elements.startButton.disabled) {
      statusView.setStartButtonLabel(t.camera.start);
    }
  }

  function beginCalibration() {
    if (paused) resumeDetection();
    elements.pauseButton.disabled = true;
    updatePauseButton(false);
    calibration.begin();
  }

  window.addEventListener("resize", overlay.resizeCanvas);
  document.addEventListener("visibilitychange", () => {
    if (!stream || paused) return;
    scheduleNextPrediction();
  });

  elements.pauseButton.onclick = toggleDetectionPause;

  return {
    beginCalibration,
    refreshLocale,
    showUnsupportedStateIfNeeded,
    startCamera,
  };
}

function createEmptyPostureState(): PostureState {
  return { goodY: null, badY: null, badSince: null, lastAlertAt: null };
}
