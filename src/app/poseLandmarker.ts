import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { withTimeout } from "./timeout";

const MODEL_URL = `${import.meta.env.BASE_URL}mediapipe/models/pose_landmarker_lite.task`;
const WASM_URL = `${import.meta.env.BASE_URL}mediapipe/wasm`;
const STARTUP_TIMEOUT_MS = 30_000;

export async function createLandmarker() {
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
