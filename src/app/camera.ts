import { withTimeout } from "./timeout";

const STARTUP_TIMEOUT_MS = 30_000;

export function isCameraContextAvailable(): boolean {
  return Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia);
}

export function getCameraStream(): Promise<MediaStream> {
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

export function playVideo(video: HTMLVideoElement): Promise<void> {
  return withTimeout(
    video.play(),
    10_000,
    "カメラ映像の開始がタイムアウトしました。",
  );
}

export function getStartupErrorMessage(error: unknown): string {
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
