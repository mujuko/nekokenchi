import {
  DrawingUtils,
  type NormalizedLandmark,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";
import type { PostureState } from "../posture";
import type { AppElements } from "../ui";

export function createOverlay(
  elements: AppElements,
  getPostureState: () => PostureState,
) {
  function resizeCanvas() {
    elements.canvas.width =
      elements.video.videoWidth || elements.cameraStage.clientWidth;
    elements.canvas.height =
      elements.video.videoHeight || elements.cameraStage.clientHeight;
  }

  function clear() {
    const context = elements.canvas.getContext("2d")!;
    context.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  }

  function drawPose(landmarks: NormalizedLandmark[] | undefined) {
    clear();
    if (!landmarks) return;

    const context = elements.canvas.getContext("2d")!;
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

    drawCalibrationLine(getPostureState().goodY, "rgba(243, 163, 58, .9)", [10, 10]);
    drawCalibrationLine(getPostureState().badY, "rgba(233, 91, 70, .9)", [4, 8]);
  }

  function drawCalibrationLine(
    normalizedY: number | null,
    strokeStyle: string,
    lineDash: number[],
  ) {
    if (normalizedY === null) return;

    const context = elements.canvas.getContext("2d")!;
    const y = normalizedY * elements.canvas.height;
    context.setLineDash(lineDash);
    context.strokeStyle = strokeStyle;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(elements.canvas.width, y);
    context.stroke();
    context.setLineDash([]);
  }

  return {
    clear,
    drawPose,
    resizeCanvas,
  };
}

export type Overlay = ReturnType<typeof createOverlay>;
