import { withTimeout } from "./timeout";
import type { Messages } from "../i18n";

const STARTUP_TIMEOUT_MS = 30_000;

export function isCameraContextAvailable(): boolean {
  return Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia);
}

export function getCameraStream(t: Messages): Promise<MediaStream> {
  return new Promise((resolve, reject) => {
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      reject(
        new Error(t.camera.permissionTimeout),
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

export function playVideo(video: HTMLVideoElement, t: Messages): Promise<void> {
  return withTimeout(
    video.play(),
    10_000,
    t.camera.playTimeout,
  );
}

export function getStartupErrorMessage(error: unknown, t: Messages): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return t.camera.permissionDenied;
    }
    if (error.name === "NotFoundError") {
      return t.camera.notFound;
    }
    if (error.name === "NotReadableError") {
      return t.camera.notReadable;
    }
  }

  return error instanceof Error
    ? error.message
    : t.camera.genericStartupError;
}
