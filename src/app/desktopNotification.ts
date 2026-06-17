import type { Messages } from "../i18n";

const AUTO_CLOSE_MS = 10_000;

export function createDesktopNotifier(t: Messages) {
  async function requestPermission() {
    if (!isNotificationSupported()) return;
    if (Notification.permission !== "default") return;

    await Notification.requestPermission();
  }

  function notifyBadPosture() {
    if (!document.hidden) return;
    if (!isNotificationSupported()) return;
    if (Notification.permission !== "granted") return;

    const notification = new Notification(t.notification.title, {
      body: t.notification.body,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    window.setTimeout(() => {
      notification.close();
    }, AUTO_CLOSE_MS);
  }

  return {
    notifyBadPosture,
    requestPermission,
  };
}

function isNotificationSupported() {
  return "Notification" in window;
}

export type DesktopNotifier = ReturnType<typeof createDesktopNotifier>;
