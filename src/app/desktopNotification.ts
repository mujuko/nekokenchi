const NOTIFICATION_TITLE = "ねこ検知";
const NOTIFICATION_BODY = "背すじが丸まっています。姿勢を戻しましょう。";
const AUTO_CLOSE_MS = 10_000;

export function createDesktopNotifier() {
  async function requestPermission() {
    if (!isNotificationSupported()) return;
    if (Notification.permission !== "default") return;

    await Notification.requestPermission();
  }

  function notifyBadPosture() {
    if (!document.hidden) return;
    if (!isNotificationSupported()) return;
    if (Notification.permission !== "granted") return;

    const notification = new Notification(NOTIFICATION_TITLE, {
      body: NOTIFICATION_BODY,
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
