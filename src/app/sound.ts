import type { AppElements } from "../ui";

const SOUND_VOLUME_KEY = "nekokenchi:sound-volume";
const SOUND_MUTED_KEY = "nekokenchi:sound-muted";
const SOUND_LAST_AUDIBLE_VOLUME_KEY = "nekokenchi:sound-last-audible-volume";
const DEFAULT_SOUND_VOLUME = 50;
const BASE_ALERT_GAIN = 0.22;
const MAX_ALERT_GAIN = 1;

export function createSoundController(elements: AppElements) {
  let audio: AudioContext | null = null;
  let lastAudibleVolume = DEFAULT_SOUND_VOLUME;

  function loadSettings() {
    const savedVolumeRaw = localStorage.getItem(SOUND_VOLUME_KEY);
    const savedVolume = Number(savedVolumeRaw);
    const savedLastAudibleVolume = Number(
      localStorage.getItem(SOUND_LAST_AUDIBLE_VOLUME_KEY),
    );
    const mutedByOldSetting = localStorage.getItem(SOUND_MUTED_KEY) === "true";
    const initialVolume =
      savedVolumeRaw !== null && Number.isFinite(savedVolume)
        ? clampVolume(savedVolume)
        : DEFAULT_SOUND_VOLUME;

    if (Number.isFinite(savedLastAudibleVolume) && savedLastAudibleVolume > 0) {
      lastAudibleVolume = clampVolume(savedLastAudibleVolume);
    } else if (initialVolume > 0) {
      lastAudibleVolume = initialVolume;
    }

    elements.soundVolume.value = String(mutedByOldSetting ? 0 : initialVolume);
    updateControls();
  }

  function bindControls() {
    elements.soundButton.onclick = () => {
      void playAlert();
    };
    elements.soundVolume.addEventListener("input", () => {
      setVolume(Number(elements.soundVolume.value));
    });
    elements.muteButton.addEventListener("click", () => {
      const volume = Number(elements.soundVolume.value);
      setVolume(volume <= 0 ? lastAudibleVolume : 0);
    });
  }

  function updateControls() {
    const volume = Number(elements.soundVolume.value);
    const muted = volume <= 0;

    elements.soundVolume.setAttribute("aria-valuetext", `${volume}%`);
    elements.muteButton.classList.toggle("muted", muted);
    elements.muteButton.textContent = muted ? "解除" : "ミュート";
    elements.muteButton.setAttribute("aria-pressed", String(muted));
    elements.muteButton.setAttribute(
      "aria-label",
      muted ? "通知音のミュートを解除" : "通知音をミュート",
    );
  }

  function saveSettings() {
    localStorage.setItem(SOUND_VOLUME_KEY, elements.soundVolume.value);
    localStorage.setItem(
      SOUND_LAST_AUDIBLE_VOLUME_KEY,
      String(lastAudibleVolume),
    );
    localStorage.removeItem(SOUND_MUTED_KEY);
  }

  function setVolume(volume: number) {
    const nextVolume = clampVolume(volume);
    elements.soundVolume.value = String(nextVolume);
    if (nextVolume > 0) lastAudibleVolume = nextVolume;
    updateControls();
    saveSettings();
  }

  function createAudioContext() {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    return new AudioContextClass();
  }

  async function unlock() {
    audio ??= createAudioContext();
    if (audio.state === "suspended") await audio.resume();
  }

  async function playAlert() {
    const volume = Number(elements.soundVolume.value) / 100;
    if (volume <= 0) return;

    await unlock();
    if (!audio) return;

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(720, start);
    oscillator.frequency.exponentialRampToValueAtTime(430, start + 0.34);
    oscillator.frequency.exponentialRampToValueAtTime(600, start + 0.62);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(getAlertGain(volume), start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.72);
    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      gain.disconnect();
    });
  }

  function flashAlert() {
    elements.alertFlash.hidden = false;
    elements.alertFlash.classList.remove("show");
    requestAnimationFrame(() => elements.alertFlash.classList.add("show"));
    window.setTimeout(() => {
      elements.alertFlash.classList.remove("show");
      window.setTimeout(() => {
        elements.alertFlash.hidden = true;
      }, 300);
    }, 2200);
  }

  return {
    bindControls,
    flashAlert,
    loadSettings,
    playAlert,
    unlock,
  };
}

function clampVolume(volume: number) {
  return Math.min(100, Math.max(0, Math.round(volume / 5) * 5));
}

function getAlertGain(volume: number) {
  if (volume <= 0.5) return BASE_ALERT_GAIN * (volume / 0.5);
  return (
    BASE_ALERT_GAIN +
    (MAX_ALERT_GAIN - BASE_ALERT_GAIN) * ((volume - 0.5) / 0.5)
  );
}

export type SoundController = ReturnType<typeof createSoundController>;
