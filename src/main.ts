import {
  DrawingUtils,
  FilesetResolver,
  type NormalizedLandmark,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";
import "./style.css";
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

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <main class="app-shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="ねこ検知 ホーム">
        <span class="brand-mark" aria-hidden="true">
          <span class="ear ear-left"></span><span class="ear ear-right"></span>
          <span class="face-dot face-dot-left"></span><span class="face-dot face-dot-right"></span>
        </span>
        <span>ねこ検知</span>
      </a>
      <div class="privacy"><span class="privacy-dot"></span>映像は端末内だけで処理</div>
    </header>

    <section class="hero">
      <div>
        <p class="eyebrow">POSTURE WATCHER</p>
        <h1>背すじが丸まったら、<br><em>そっとお知らせ。</em></h1>
      </div>
      <p class="hero-copy">カメラで頭の高さを見守り、猫背が続いたときだけ音で知らせます。まずは正面から、目線に近い高さで映してください。</p>
    </section>

    <section class="workspace">
      <div class="camera-card">
        <div class="camera-stage" id="camera-stage">
          <video id="video" playsinline muted></video>
          <canvas id="overlay"></canvas>
          <div class="camera-placeholder" id="camera-placeholder">
            <div class="cat-orbit">
              <div class="cat-head"><i></i><i></i><b></b><span></span></div>
            </div>
            <h2>カメラを起動しましょう</h2>
            <p>姿勢の判定はこのブラウザ内で行われます</p>
          </div>
          <div class="calibration-overlay" id="calibration-overlay" hidden>
            <div class="countdown-ring"><span id="countdown">3</span></div>
            <strong id="calibration-title">背すじを伸ばして、そのまま</strong>
            <small id="calibration-help">良い姿勢の頭の高さを覚えています</small>
          </div>
          <div class="status-pill" id="status-pill" hidden>
            <span></span><b id="status-label">計測中</b>
          </div>
          <div class="alert-flash" id="alert-flash" hidden>背すじを伸ばそう</div>
        </div>
        <div class="camera-actions">
          <button class="button primary" id="start-button">
            <span class="camera-icon" aria-hidden="true"></span>
            カメラを起動
          </button>
          <button class="button secondary" id="calibrate-button" disabled>姿勢を登録しなおす</button>
        </div>
      </div>

      <aside class="side-panel">
        <div class="metric-card">
          <div class="metric-heading">
            <div>
              <span class="section-label">NOW</span>
              <h2>いまの姿勢</h2>
            </div>
            <div class="posture-badge idle" id="posture-badge">待機中</div>
          </div>
          <div class="meter">
            <div class="meter-track"><div class="meter-fill" id="meter-fill"></div></div>
            <div class="meter-labels"><span>GOOD</span><span>ROUND</span></div>
          </div>
          <p class="metric-message" id="metric-message">カメラを起動すると、ここに姿勢の状態が表示されます。</p>
        </div>

        <div class="settings-card">
          <span class="section-label">SENSITIVITY</span>
          <h2>見守り設定</h2>
          <label class="setting-row">
            <span><b>感度</b><small>頭がどれくらい下がったら検知するか</small></span>
            <select id="sensitivity">
              <option value="0.9">ゆるめ</option>
              <option value="0.75" selected>ふつう</option>
              <option value="0.6">敏感</option>
            </select>
          </label>
          <label class="setting-row">
            <span><b>お知らせまで</b><small>悪い姿勢が続く時間</small></span>
            <select id="duration">
              <option value="2000">2秒</option>
              <option value="3000" selected>3秒</option>
              <option value="5000">5秒</option>
            </select>
          </label>
          <label class="setting-row">
            <span><b>通知音</b><small>一旦は電子音でお知らせ</small></span>
            <button class="sound-button" id="sound-button" aria-label="通知音を試す">試す ♪</button>
          </label>
        </div>

        <div class="tip">
          <span class="tip-icon">i</span>
          <p><b>うまく測るコツ</b>顔と肩が正面から映る距離で、極端な見下ろしや見上げの画角を避けると安定します。</p>
        </div>
      </aside>
    </section>
  </main>
`;

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
const calibrateButton =
  document.querySelector<HTMLButtonElement>("#calibrate-button")!;
const statusPill = document.querySelector<HTMLDivElement>("#status-pill")!;
const statusLabel = document.querySelector<HTMLElement>("#status-label")!;
const postureBadge = document.querySelector<HTMLDivElement>("#posture-badge")!;
const meterFill = document.querySelector<HTMLDivElement>("#meter-fill")!;
const metricMessage =
  document.querySelector<HTMLParagraphElement>("#metric-message")!;
const sensitivity =
  document.querySelector<HTMLSelectElement>("#sensitivity")!;
const duration = document.querySelector<HTMLSelectElement>("#duration")!;
const soundButton = document.querySelector<HTMLButtonElement>("#sound-button")!;
const alertFlash = document.querySelector<HTMLDivElement>("#alert-flash")!;

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
  startButton.textContent = "カメラの許可を待っています…";

  try {
    const mediaStream = await getCameraStream();
    stream = mediaStream;

    if (!poseLandmarker) {
      startButton.textContent = "姿勢モデルを読み込んでいます…";
      metricMessage.textContent =
        "初回だけ姿勢モデルを読み込みます。しばらくお待ちください。";
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
    startButton.textContent = "カメラを停止";
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
  startButton.textContent = "もう一度試す";
  metricMessage.textContent = message;
  postureBadge.textContent = "起動エラー";
  postureBadge.className = "posture-badge bad";
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
  video.classList.remove("visible");
  placeholder.hidden = false;
  statusPill.hidden = true;
  calibrationOverlay.hidden = true;
  calibrateButton.disabled = true;
  startButton.textContent = "カメラを起動";
  startButton.classList.remove("stop");
  startButton.onclick = startCamera;
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

function predict() {
  if (!poseLandmarker || !stream) return;

  const now = performance.now();
  if (video.currentTime !== lastVideoTime && video.readyState >= 2) {
    lastVideoTime = video.currentTime;
    poseLandmarker.detectForVideo(video, now, (poseResult) => {
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
  const context = canvas.getContext("2d")!;
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!landmarks) return;

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
  meterFill.style.width = `${Math.max(4, progress * 100)}%`;
  postureBadge.className = `posture-badge ${status}`;

  if (status === "good") {
    postureBadge.textContent = "いい姿勢";
    metricMessage.textContent = "きれいな姿勢です。その調子でいきましょう。";
    statusLabel.textContent = "見守り中";
    statusPill.className = "status-pill";
  } else if (status === "bad") {
    const remaining = Math.max(
      0,
      Math.ceil((Number(duration.value) - badDurationMs) / 1000),
    );
    postureBadge.textContent = remaining > 0 ? `あと ${remaining}秒` : "猫背を検知";
    metricMessage.textContent =
      remaining > 0
        ? "頭の位置が少し下がっています。背すじを意識してみましょう。"
        : "姿勢が丸まっています。肩の力を抜いて、背すじを伸ばしましょう。";
    statusLabel.textContent = "姿勢が低下";
    statusPill.className = "status-pill warning";
  } else if (status === "missing") {
    postureBadge.textContent = "検出待ち";
    metricMessage.textContent = "顔と肩がカメラに映る位置へ移動してください。";
  } else {
    postureBadge.textContent = "待機中";
    metricMessage.textContent =
      "カメラを起動すると、ここに姿勢の状態が表示されます。";
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
window.addEventListener("resize", resizeCanvas);

if (!isCameraContextAvailable()) {
  startButton.disabled = true;
  startButton.textContent = "localhost で起動してください";
  metricMessage.textContent =
    "画面は確認できますが、file:// ではカメラを利用できません。npm run dev または npm run preview を使ってください。";
}
