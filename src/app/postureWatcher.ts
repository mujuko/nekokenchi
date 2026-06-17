import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { evaluatePosture, type PostureState } from "../posture";
import type { AppElements } from "../ui";
import {
  getCameraStream,
  getStartupErrorMessage,
  isCameraContextAvailable,
  playVideo,
} from "./camera";
import { createCalibrationController } from "./calibration";
import { createOverlay } from "./overlay";
import { createLandmarker } from "./poseLandmarker";
import type { SoundController } from "./sound";
import type { StatusView } from "./statusView";

export function createPostureWatcher(
  elements: AppElements,
  statusView: StatusView,
  sound: SoundController,
) {
  let poseLandmarker: PoseLandmarker | null = null;
  let stream: MediaStream | null = null;
  let animationFrame = 0;
  let lastVideoTime = -1;
  let postureState: PostureState = createEmptyPostureState();

  const overlay = createOverlay(elements, () => postureState);
  const calibration = createCalibrationController(
    elements,
    (state) => {
      postureState = state;
    },
  );

  async function startCamera() {
    if (!isCameraContextAvailable()) {
      showStartupError(
        "カメラは file:// では利用できません。npm run dev または npm run preview で開いてください。",
      );
      return;
    }

    elements.startButton.disabled = true;
    statusView.setStartButtonLabel("カメラの許可を待っています…");

    try {
      const mediaStream = await getCameraStream();
      stream = mediaStream;

      if (!poseLandmarker) {
        statusView.setStartButtonLabel("姿勢モデルを読み込んでいます…");
        statusView.setMetricMessage(
          "初回だけ姿勢モデルを読み込みます。しばらくお待ちください。",
        );
        poseLandmarker = await createLandmarker();
      }

      elements.video.srcObject = stream;
      await playVideo(elements.video);

      elements.placeholder.hidden = true;
      elements.video.classList.add("visible");
      elements.statusPill.hidden = false;
      elements.calibrateButton.disabled = false;
      statusView.setStartButtonLabel("カメラを停止");
      elements.startButton.disabled = false;
      elements.startButton.classList.add("stop");
      elements.startButton.onclick = stopCamera;
      overlay.resizeCanvas();
      calibration.begin();
      predict();
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      console.error(error);
      showStartupError(getStartupErrorMessage(error));
    }
  }

  function stopCamera() {
    cancelAnimationFrame(animationFrame);
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    elements.video.srcObject = null;
    overlay.clear();
    elements.video.classList.remove("visible");
    elements.placeholder.hidden = false;
    elements.statusPill.hidden = true;
    elements.calibrationOverlay.hidden = true;
    elements.calibrateButton.disabled = true;
    statusView.setStartButtonLabel("カメラを起動");
    elements.startButton.classList.remove("stop");
    elements.startButton.onclick = startCamera;
    calibration.reset();
    postureState = createEmptyPostureState();
    statusView.updateStatus("idle", 0, 0);
  }

  function predict() {
    if (!poseLandmarker || !stream) return;

    const now = performance.now();
    if (elements.video.currentTime !== lastVideoTime && elements.video.readyState >= 2) {
      lastVideoTime = elements.video.currentTime;
      poseLandmarker.detectForVideo(elements.video, now, (poseResult) => {
        if (!stream) {
          overlay.clear();
          return;
        }

        const landmarks = poseResult.landmarks[0];
        overlay.drawPose(landmarks);

        if (!landmarks) {
          elements.statusLabel.textContent = "人を探しています";
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
          sound.playAlert();
          sound.flashAlert();
        }

        statusView.updateStatus(
          postureResult.isBad ? "bad" : "good",
          postureResult.score,
          postureResult.badDurationMs,
        );
      });
    }

    animationFrame = requestAnimationFrame(predict);
  }

  function showStartupError(message: string) {
    elements.startButton.disabled = false;
    statusView.setStartButtonLabel("もう一度試す");
    statusView.setMetricMessage(message);
    statusView.setPostureBadge("bad", "起動エラー");
  }

  function showUnsupportedStateIfNeeded() {
    if (isCameraContextAvailable()) return;

    elements.startButton.disabled = true;
    statusView.setStartButtonLabel("localhost で起動してください");
    statusView.setMetricMessage(
      "画面は確認できますが、file:// ではカメラを利用できません。npm run dev または npm run preview を使ってください。",
    );
  }

  window.addEventListener("resize", overlay.resizeCanvas);

  return {
    beginCalibration: calibration.begin,
    showUnsupportedStateIfNeeded,
    startCamera,
  };
}

function createEmptyPostureState(): PostureState {
  return { goodY: null, badY: null, badSince: null, lastAlertAt: null };
}
