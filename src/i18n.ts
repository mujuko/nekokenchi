export const LOCALE_STORAGE_KEY = "nekokenchi:locale";

export type Locale = "ja" | "en";

type Widen<T> = T extends (...args: infer Args) => infer Return
  ? (...args: Args) => Return
  : T extends string
    ? string
    : { [Key in keyof T]: Widen<T[Key]> };

export type Messages = Widen<(typeof messages)["ja"]>;

export const messages = {
  ja: {
    meta: {
      title: "ねこ検知 - 猫背みまもり",
      description:
        "カメラで姿勢を見守り、猫背が続くと音で知らせるプライバシー重視のWebアプリ",
    },
    common: {
      brand: "ねこ検知",
      copyright: "© 第一無重工",
      github: "GitHub",
      sourceCode: "ソースを見る",
      soundCredit: "効果音: ポケットサウンド",
      language: "表示言語",
      japanese: "日本語",
      english: "English",
    },
    header: {
      homeLabel: "ねこ検知 ホーム",
      versionLabel: (version: string) => `バージョン ${version}`,
      privacy: "映像は端末内だけで処理",
      openMenu: "メニューを開く",
      closeMenu: "メニューを閉じる",
    },
    hero: {
      titleLine1: "背すじが丸まったら、",
      titleEmphasis: "そっとお知らせ。",
      copy: "カメラで頭の高さを見守り、猫背が続いたときだけ音で知らせます。まずは正面から、目線に近い高さで映してください。",
    },
    camera: {
      placeholderTitle: "カメラを起動しましょう",
      placeholderCopy: "姿勢の判定はこの端末内で行われます",
      start: "カメラを起動",
      stop: "カメラを停止",
      recalibrate: "再調整",
      pause: "判定を一時停止",
      resume: "判定を再開",
      statusPaused: "一時停止中",
      statusMeasuring: "計測中",
      alert: "背すじを伸ばそう",
      waitingPermission: "カメラの許可を待っています...",
      loadingModel: "姿勢モデルを読込中...",
      loadingModelMessage:
        "初回だけ姿勢モデルを読み込みます。しばらくお待ちください。",
      retry: "もう一度試す",
      startupError: "起動エラー",
      localHostRequired: "localhost で起動してください",
      fileUnavailable:
        "カメラは file:// では利用できません。npm run dev または npm run preview で開いてください。",
      filePreviewOnly:
        "画面は確認できますが、file:// ではカメラを利用できません。npm run dev または npm run preview を使ってください。",
      lookingForPerson: "人を探しています",
      permissionTimeout:
        "カメラの許可待ちがタイムアウトしました。ブラウザの許可ダイアログを確認してください。",
      playTimeout: "カメラ映像の開始がタイムアウトしました。",
      permissionDenied:
        "カメラの利用が許可されませんでした。アドレスバー横のカメラ設定から許可してください。",
      notFound: "利用できるカメラが見つかりませんでした。",
      notReadable:
        "カメラを使用できません。他のアプリがカメラを使っていないか確認してください。",
      genericStartupError: "カメラの起動中にエラーが発生しました。",
    },
    calibration: {
      goodTitle: "背すじを伸ばして、そのまま",
      goodHelp: "良い姿勢の頭の高さを覚えています",
      badTitle: "猫背になって、そのまま",
      badHelp: "ここをアウト水準として覚えます",
      transitionTitle: "猫背の姿勢へ",
      transitionHelp: "頭を下げたアウト姿勢を次に登録します",
      status: "姿勢を登録中",
      watching: "見守り中",
    },
    posture: {
      title: "いまの姿勢",
      mobileTitle: "姿勢",
      idleBadge: "待機中",
      idleMessage:
        "カメラを起動すると、ここに姿勢の状態が表示されます。",
      goodMeter: "まっすぐ",
      badMeter: "猫背",
      goodBadge: "いい姿勢",
      goodMessage: "きれいな姿勢です。その調子でいきましょう。",
      badBadge: "猫背を検知",
      badCountdown: (seconds: number) => `あと ${seconds}秒`,
      badMessageWarning:
        "頭の位置が少し下がっています。背すじを意識してみましょう。",
      badMessageAlert:
        "姿勢が丸まっています。肩の力を抜いて、背すじを伸ばしましょう。",
      badStatus: "姿勢が低下",
      missingBadge: "検出待ち",
      missingMessage: "顔と肩がカメラに映る位置へ移動してください。",
      pausedBadge: "一時停止中",
      pausedMessage: "キャリブレーション設定を維持したまま、姿勢判定を止めています。",
    },
    settings: {
      menuTitle: "設定",
      panelTitle: "見守り設定",
      panelAria: "見守り設定",
      sensitivity: "感度",
      sensitivityHelp: "頭がどれくらい下がったら検知するか",
      sensitivityLoose: "ゆるめ",
      sensitivityNormal: "ふつう",
      sensitivitySensitive: "敏感",
      duration: "お知らせまで",
      durationHelp: "悪い姿勢が続く時間",
      seconds: (seconds: number) => `${seconds}秒`,
      sound: "通知音",
      soundHelp: "複数選ぶとランダムに再生",
      soundKindLabel: "通知音の種類",
      soundTone: "電子音",
      soundCat: (index: number) => `ねこ ${index}`,
      mute: "ミュート",
      unmute: "解除",
      muteLabel: "通知音をミュート",
      unmuteLabel: "通知音のミュートを解除",
      volumeLabel: "通知音の音量",
      testSound: "試す ♪",
      testSoundLabel: "通知音を試す",
    },
    tip: {
      title: "うまく測るコツ",
      body: "顔と肩が正面から映る距離で、極端な見下ろしや見上げの画角を避けると安定します。",
    },
    notification: {
      title: "ねこ検知",
      body: "背すじが丸まっています。姿勢を戻しましょう。",
    },
    model: {
      timeout: "姿勢モデルの読み込みがタイムアウトしました。",
    },
  },
  en: {
    meta: {
      title: "Nekokenchi - Posture Watcher",
      description:
        "A privacy-first posture app that nudges you when you start slouching.",
    },
    common: {
      brand: "Nekokenchi",
      copyright: "© Mark I Weightless Industries",
      github: "GitHub",
      sourceCode: "View source",
      soundCredit: "Sounds by Pocket Sound",
      language: "Language",
      japanese: "日本語",
      english: "English",
    },
    header: {
      homeLabel: "Nekokenchi home",
      versionLabel: (version: string) => `Version ${version}`,
      privacy: "Video never leaves your device",
      openMenu: "Open menu",
      closeMenu: "Close menu",
    },
    hero: {
      titleLine1: "Stay upright",
      titleEmphasis: "with a gentle nudge.",
      copy: "Nekokenchi tracks head height on your device and nudges you only when slouching continues. Face the camera near eye level to start.",
    },
    camera: {
      placeholderTitle: "Start the camera",
      placeholderCopy: "Everything runs on this device",
      start: "Start camera",
      stop: "Stop camera",
      recalibrate: "Recalibrate",
      pause: "Pause detection",
      resume: "Resume detection",
      statusPaused: "Paused",
      statusMeasuring: "Measuring",
      alert: "Sit up straight",
      waitingPermission: "Waiting for camera access...",
      loadingModel: "Loading posture model...",
      loadingModelMessage:
        "This may take a moment the first time.",
      retry: "Try again",
      startupError: "Startup error",
      localHostRequired: "Open from localhost",
      fileUnavailable:
        "Camera access does not work from file://. Use npm run dev or npm run preview.",
      filePreviewOnly:
        "You can view the screen, but camera access does not work from file://. Use npm run dev or npm run preview.",
      lookingForPerson: "Looking for you",
      permissionTimeout:
        "Camera access timed out. Check the browser permission dialog.",
      playTimeout: "Camera failed to start in time.",
      permissionDenied:
        "Camera access was blocked. Allow it from the browser address bar.",
      notFound: "No camera found.",
      notReadable:
        "Camera is unavailable. Make sure another app is not using it.",
      genericStartupError: "Could not start the camera.",
    },
    calibration: {
      goodTitle: "Sit up straight and hold still",
      goodHelp: "Saving your upright position",
      badTitle: "Now slouch and hold still",
      badHelp: "Saving this as your alert point",
      transitionTitle: "Get ready to slouch",
      transitionHelp: "Next, lower your head for the alert point",
      status: "Calibrating",
      watching: "Watching",
    },
    posture: {
      title: "Current posture",
      mobileTitle: "Posture",
      idleBadge: "Idle",
      idleMessage: "Start the camera to show posture status here.",
      goodMeter: "Good",
      badMeter: "Slouch",
      goodBadge: "Looks good",
      goodMessage: "Nice posture. Keep it up.",
      badBadge: "Slouch detected",
      badCountdown: (seconds: number) => `${seconds}s`,
      badMessageWarning:
        "Your head is dropping a bit. Try sitting taller.",
      badMessageAlert:
        "You are starting to slouch. Relax your shoulders and sit taller.",
      badStatus: "Slouching",
      missingBadge: "No pose",
      missingMessage: "Make sure your face and shoulders are in view.",
      pausedBadge: "Paused",
      pausedMessage: "Posture detection is paused while keeping your calibration settings.",
    },
    settings: {
      menuTitle: "Settings",
      panelTitle: "Posture settings",
      panelAria: "Posture settings",
      sensitivity: "Sensitivity",
      sensitivityHelp: "How much head drop triggers an alert",
      sensitivityLoose: "Low",
      sensitivityNormal: "Normal",
      sensitivitySensitive: "High",
      duration: "Alert after",
      durationHelp: "How long to wait before alerting",
      seconds: (seconds: number) => `${seconds}s`,
      sound: "Sound",
      soundHelp: "Pick more than one to randomize",
      soundKindLabel: "Alert sound",
      soundTone: "Beep",
      soundCat: (index: number) => `Meow ${index}`,
      mute: "Mute",
      unmute: "Unmute",
      muteLabel: "Mute alert sound",
      unmuteLabel: "Unmute alert sound",
      volumeLabel: "Alert volume",
      testSound: "Test ♪",
      testSoundLabel: "Test alert sound",
    },
    tip: {
      title: "Tip",
      body: "For steadier detection, keep your face and shoulders in view and avoid steep camera angles.",
    },
    notification: {
      title: "Nekokenchi",
      body: "You are starting to slouch. Sit up when you can.",
    },
    model: {
      timeout: "Posture model loading timed out.",
    },
  },
} as const;

export function isLocale(value: unknown): value is Locale {
  return value === "ja" || value === "en";
}

export function getMessages(locale: Locale): Messages {
  return messages[locale] as Messages;
}
