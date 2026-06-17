import {
  DrawingUtils,
  FilesetResolver,
  type NormalizedLandmark,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";
import "./style.css";
import { renderApp } from "./ui";
import {
  average,
  evaluatePosture,
  type PostureState,
} from "./posture";

const MODEL_URL = `${import.meta.env.BASE_URL}mediapipe/models/pose_landmarker_lite.task`;
const WASM_URL = `${import.meta.env.BASE_URL}mediapipe/wasm`;
const STARTUP_TIMEOUT_MS = 30_000;
const CALIBRATION_SAMPLE_MS = 3000;
const CALIBRATION_TRANSITION_MS = 2500;
const APP_VERSION = import.meta.env.VITE_APP_VERSION;

document.querySelector<HTMLDivElement>("#app")!.innerHTML = renderApp(APP_VERSION);
const video = document.querySelector<HTMLVideoElement>("#video")!;
const canvas = document.querySelector<HTMLCanvasElement>("#overlay")!;
const cameraStage = document.querySelector<HTMLDivElement>("#camera-stage")!;
const placeholder = document.querySelector<HTMLDivElement>("#camera-placeholder")!;
const calibrationOverlay =
  document.querySelector<HTMLDivElement>("#calibration-overlay")!;
const countdown = document.querySelector<HTMLSpanElement>("#countdown")!;
const calibrationTitle =
  document.querySelector<HTMLElement>("#calibration-title")!;
const calibrationHelp =
  document.querySelector<HTMLElement>("#calibration-help")!;
const startButton = document.querySelector<HTMLButtonElement>("#start-button")!;
const startButtonLabel =
  document.querySelector<HTMLSpanElement>("#start-button-label")!;
const calibrateButton =
  document.querySelector<HTMLButtonElement>("#calibrate-button")!;
const statusPill = document.querySelector<HTMLDivElement>("#status-pill")!;
const statusLabel = document.querySelector<HTMLElement>("#status-label")!;
const postureBadges =
  document.querySelectorAll<HTMLDivElement>("[data-posture-badge]");
const meterFills =
  document.querySelectorAll<HTMLDivElement>("[data-meter-fill]");
const metricMessages =
  document.querySelectorAll<HTMLParagraphElement>("[data-metric-message]");
const sensitivity =
  document.querySelector<HTMLSelectElement>("#sensitivity")!;
const duration = document.querySelector<HTMLSelectElement>("#duration")!;
const soundButton = document.querySelector<HTMLButtonElement>("#sound-button")!;
const alertFlash = document.querySelector<HTMLDivElement>("#alert-flash")!;
const menuButton = document.querySelector<HTMLButtonElement>("#menu-button");
const closeMenuButton =
  document.querySelector<HTMLButtonElement>("#close-menu-button");
const menuScrim = document.querySelector<HTMLDivElement>("#menu-scrim");
const mobileMenu = document.querySelector<HTMLElement>("#mobile-menu")!;

let poseLandmarker: PoseLandmarker | null = null;
let stream: MediaStream | null = null;
let animationFrame = 0;
let lastVideoTime = -1;
let calibrating = false;
let calibrationStep: "good" | "transition" | "bad" | null = null;
let calibrationStartedAt = 0;
let calibrationSamples: number[] = [];
let calibratedGoodY: number | null = null;
let postureState: PostureState = {
  goodY: null,
  badY: null,
  badSince: null,
  lastAlertAt: null,
};

function setStartButtonLabel(label: string) {
  startButtonLabel.textContent = label;
}

function setMetricMessage(message: string) {
  metricMessages.forEach((element) => {
    element.textContent = message;
  });
}

function setPostureBadge(status: "idle" | "missing" | "good" | "bad", text: string) {
  postureBadges.forEach((element) => {
    element.className = `posture-badge ${status}`;
    element.textContent = text;
  });
}

function setMeterProgress(progress: number) {
  meterFills.forEach((element) => {
    element.style.width = `${Math.max(4, progress * 100)}%`;
  });
}

function setMenuOpen(open: boolean) {
  mobileMenu.classList.toggle("open", open);
  menuButton?.setAttribute("aria-expanded", String(open));
  if (menuScrim) menuScrim.hidden = !open;
}

async function createLandmarker() {
  return withTimeout(
    (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.55,
        minPosePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
    })(),
    STARTUP_TIMEOUT_MS,
    "姿勢モデルの読み込みがタイムアウトしました。",
  );
}

async function startCamera() {
  if (!isCameraContextAvailable()) {
    showStartupError(
      "カメラは file:// では利用できません。npm run dev または npm run preview で開いてください。",
    );
    return;
  }

  startButton.disabled = true;
  setStartButtonLabel("カメラの許可を待っています…");

  try {
    const mediaStream = await getCameraStream();
    stream = mediaStream;

    if (!poseLandmarker) {
      setStartButtonLabel("姿勢モデルを読み込んでいます…");
      setMetricMessage("初回だけ姿勢モデルを読み込みます。しばらくお待ちください。");
      poseLandmarker = await createLandmarker();
    }

    video.srcObject = stream;
    await withTimeout(
      video.play(),
      10_000,
      "カメラ映像の開始がタイムアウトしました。",
    );

    placeholder.hidden = true;
    video.classList.add("visible");
    statusPill.hidden = false;
    calibrateButton.disabled = false;
    setStartButtonLabel("カメラを停止");
    startButton.disabled = false;
    startButton.classList.add("stop");
    startButton.onclick = stopCamera;
    resizeCanvas();
    beginCalibration();
    predict();
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    console.error(error);
    showStartupError(getStartupErrorMessage(error));
  }
}

function isCameraContextAvailable(): boolean {
  return Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia);
}

function getCameraStream(): Promise<MediaStream> {
  return new Promise((resolve, reject) => {
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      reject(
        new Error(
          "カメラの許可待ちがタイムアウトしました。ブラウザの許可ダイアログを確認してください。",
        ),
      );
    }, STARTUP_TIMEOUT_MS);

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      .then(
        (mediaStream) => {
          window.clearTimeout(timeout);
          if (timedOut) {
            mediaStream.getTracks().forEach((track) => track.stop());
            return;
          }
          resolve(mediaStream);
        },
        (error) => {
          window.clearTimeout(timeout);
          if (!timedOut) reject(error);
        },
      );
  });
}

function getStartupErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "カメラの利用が許可されませんでした。アドレスバー横のカメラ設定から許可してください。";
    }
    if (error.name === "NotFoundError") {
      return "利用できるカメラが見つかりませんでした。";
    }
    if (error.name === "NotReadableError") {
      return "カメラを使用できません。他のアプリがカメラを使っていないか確認してください。";
    }
  }

  return error instanceof Error
    ? error.message
    : "カメラの起動中にエラーが発生しました。";
}

function showStartupError(message: string) {
  startButton.disabled = false;
  setStartButtonLabel("もう一度試す");
  setMetricMessage(message);
  setPostureBadge("bad", "起動エラー");
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function stopCamera() {
  cancelAnimationFrame(animationFrame);
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  video.srcObject = null;
  clearOverlay();
  video.classList.remove("visible");
  placeholder.hidden = false;
  statusPill.hidden = true;
  calibrationOverlay.hidden = true;
  calibrateButton.disabled = true;
  setStartButtonLabel("カメラを起動");
  startButton.classList.remove("stop");
  startButton.onclick = startCamera;
  calibrating = false;
  calibrationStep = null;
  postureState = { goodY: null, badY: null, badSince: null, lastAlertAt: null };
  updateStatus("idle", 0, 0);
}

function beginCalibration() {
  calibrating = true;
  calibrationStep = "good";
  calibrationStartedAt = performance.now();
  calibrationSamples = [];
  calibratedGoodY = null;
  calibrationOverlay.hidden = false;
  calibrationTitle.textContent = "背すじを伸ばして、そのまま";
  calibrationHelp.textContent = "良い姿勢の頭の高さを覚えています";
  countdown.textContent = "3";
  statusLabel.textContent = "姿勢を登録中";
  statusPill.className = "status-pill calibrating";
  postureState = { goodY: null, badY: null, badSince: null, lastAlertAt: null };
}

function resizeCanvas() {
  canvas.width = video.videoWidth || cameraStage.clientWidth;
  canvas.height = video.videoHeight || cameraStage.clientHeight;
}

function clearOverlay() {
  const context = canvas.getContext("2d")!;
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function predict() {
  if (!poseLandmarker || !stream) return;

  const now = performance.now();
  if (video.currentTime !== lastVideoTime && video.readyState >= 2) {
    lastVideoTime = video.currentTime;
    poseLandmarker.detectForVideo(video, now, (poseResult) => {
      if (!stream) {
        clearOverlay();
        return;
      }

      const landmarks = poseResult.landmarks[0];
      drawPose(landmarks);

      if (!landmarks) {
        statusLabel.textContent = "人を探しています";
        updateStatus("missing", 0, 0);
        return;
      }

      const nose = landmarks[0];
      if (!nose || (nose.visibility ?? 1) < 0.55) {
        updateStatus("missing", 0, 0);
        return;
      }

      if (calibrating) {
        handleCalibrationSample(nose.y, now);
        return;
      }

      const postureResult = evaluatePosture(nose.y, now, postureState, {
        threshold: Number(sensitivity.value),
        warningDurationMs: Number(duration.value),
        cooldownMs: 12000,
      });
      postureState = postureResult.state;

      if (postureResult.shouldAlert) {
        playAlert();
        flashAlert();
      }

      updateStatus(
        postureResult.isBad ? "bad" : "good",
        postureResult.score,
        postureResult.badDurationMs,
      );
    });
  }

  animationFrame = requestAnimationFrame(predict);
}

function handleCalibrationSample(noseY: number, now: number) {
  const elapsed = now - calibrationStartedAt;

  if (calibrationStep === "transition") {
    countdown.textContent = String(
      Math.max(1, Math.ceil((CALIBRATION_TRANSITION_MS - elapsed) / 1000)),
    );

    if (elapsed >= CALIBRATION_TRANSITION_MS) {
      calibrationStep = "bad";
      calibrationStartedAt = now;
      calibrationSamples = [];
      calibrationTitle.textContent = "猫背になって、そのまま";
      calibrationHelp.textContent = "ここをアウト水準として覚えます";
      countdown.textContent = "3";
    }
    return;
  }

  calibrationSamples.push(noseY);
  countdown.textContent = String(
    Math.max(1, Math.ceil((CALIBRATION_SAMPLE_MS - elapsed) / 1000)),
  );

  if (elapsed < CALIBRATION_SAMPLE_MS) return;

  const averageY = average(calibrationSamples);
  if (averageY === null) return;

  if (calibrationStep === "good") {
    calibratedGoodY = averageY;
    calibrationStep = "transition";
    calibrationStartedAt = now;
    calibrationSamples = [];
    calibrationTitle.textContent = "猫背の姿勢へ";
    calibrationHelp.textContent = "頭を下げたアウト姿勢を次に登録します";
    countdown.textContent = "3";
    return;
  }

  if (calibrationStep === "bad" && calibratedGoodY !== null) {
    postureState = {
      goodY: calibratedGoodY,
      badY: averageY,
      badSince: null,
      lastAlertAt: null,
    };
    calibrating = false;
    calibrationStep = null;
    calibrationOverlay.hidden = true;
    statusLabel.textContent = "見守り中";
    statusPill.className = "status-pill";
  }
}

function drawPose(landmarks: NormalizedLandmark[] | undefined) {
  clearOverlay();
  if (!landmarks) return;

  const context = canvas.getContext("2d")!;
  const drawing = new DrawingUtils(context);
  drawing.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
    color: "rgba(255, 255, 255, .5)",
    lineWidth: 3,
  });
  drawing.drawLandmarks(landmarks, {
    color: "#f3a33a",
    fillColor: "#fff7e9",
    radius: 3,
    lineWidth: 1,
  });

  if (postureState.goodY !== null) {
    const y = postureState.goodY * canvas.height;
    context.setLineDash([10, 10]);
    context.strokeStyle = "rgba(243, 163, 58, .9)";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
    context.setLineDash([]);
  }

  if (postureState.badY !== null) {
    const y = postureState.badY * canvas.height;
    context.setLineDash([4, 8]);
    context.strokeStyle = "rgba(233, 91, 70, .9)";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
    context.setLineDash([]);
  }
}

function updateStatus(
  status: "idle" | "missing" | "good" | "bad",
  progress: number,
  badDurationMs: number,
) {
  setMeterProgress(progress);

  if (status === "good") {
    setPostureBadge(status, "いい姿勢");
    setMetricMessage("きれいな姿勢です。その調子でいきましょう。");
    statusLabel.textContent = "見守り中";
    statusPill.className = "status-pill";
  } else if (status === "bad") {
    const remaining = Math.max(
      0,
      Math.ceil((Number(duration.value) - badDurationMs) / 1000),
    );
    setPostureBadge(status, remaining > 0 ? `あと ${remaining}秒` : "猫背を検知");
    setMetricMessage(
      remaining > 0
        ? "頭の位置が少し下がっています。背すじを意識してみましょう。"
        : "姿勢が丸まっています。肩の力を抜いて、背すじを伸ばしましょう。",
    );
    statusLabel.textContent = "姿勢が低下";
    statusPill.className = "status-pill warning";
  } else if (status === "missing") {
    setPostureBadge(status, "検出待ち");
    setMetricMessage("顔と肩がカメラに映る位置へ移動してください。");
  } else {
    setPostureBadge(status, "待機中");
    setMetricMessage("カメラを起動すると、ここに姿勢の状態が表示されます。");
  }
}

function playAlert() {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const audio = new AudioContextClass();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const start = audio.currentTime;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(720, start);
  oscillator.frequency.exponentialRampToValueAtTime(430, start + 0.34);
  oscillator.frequency.exponentialRampToValueAtTime(600, start + 0.62);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.22, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.72);
  oscillator.addEventListener("ended", () => audio.close());
}

function flashAlert() {
  alertFlash.hidden = false;
  alertFlash.classList.remove("show");
  requestAnimationFrame(() => alertFlash.classList.add("show"));
  window.setTimeout(() => {
    alertFlash.classList.remove("show");
    window.setTimeout(() => {
      alertFlash.hidden = true;
    }, 300);
  }, 2200);
}

startButton.onclick = startCamera;
calibrateButton.onclick = beginCalibration;
soundButton.onclick = playAlert;
menuButton?.addEventListener("click", () => setMenuOpen(true));
closeMenuButton?.addEventListener("click", () => setMenuOpen(false));
menuScrim?.addEventListener("click", () => setMenuOpen(false));
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenuOpen(false);
});
window.addEventListener("resize", resizeCanvas);

if (!isCameraContextAvailable()) {
  startButton.disabled = true;
  setStartButtonLabel("localhost で起動してください");
  setMetricMessage(
    "画面は確認できますが、file:// ではカメラを利用できません。npm run dev または npm run preview を使ってください。",
  );
}
