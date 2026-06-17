import type { AppElements } from "../ui";
import type { Messages } from "../i18n";

const SOUND_VOLUME_KEY = "nekokenchi:sound-volume";
const SOUND_MUTED_KEY = "nekokenchi:sound-muted";
const SOUND_LAST_AUDIBLE_VOLUME_KEY = "nekokenchi:sound-last-audible-volume";
const SOUND_CHOICES_KEY = "nekokenchi:sound-choices";
const DEFAULT_SOUND_VOLUME = 50;
const BASE_ALERT_GAIN = 0.22;
const MAX_ALERT_GAIN = 1;
const DEFAULT_SOUND_CHOICE = "tone";

const SOUND_OPTIONS = [
  { id: "tone", type: "tone" },
  { id: "cat10", type: "file", path: "/cat/cat10.mp3" },
  { id: "cat11", type: "file", path: "/cat/cat11.mp3" },
  { id: "cat15", type: "file", path: "/cat/cat15.mp3" },
  { id: "cat30", type: "file", path: "/cat/cat30.mp3" },
] as const;

type SoundOption = (typeof SOUND_OPTIONS)[number];
type SoundChoiceId = SoundOption["id"];
type MessagesProvider = () => Messages;

export function createSoundController(elements: AppElements, getMessages: MessagesProvider) {
  let audio: AudioContext | null = null;
  let lastAudibleVolume = DEFAULT_SOUND_VOLUME;
  const audioBuffers = new Map<string, AudioBuffer>();

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
    setSelectedSoundChoices(loadSoundChoices());
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
    elements.soundChoices.forEach((choice) => {
      choice.addEventListener("change", () => {
        if (getSelectedSoundChoices().length === 0) {
          setSelectedSoundChoices([DEFAULT_SOUND_CHOICE]);
        }
        saveSettings();
      });
    });
  }

  function updateControls() {
    const t = getMessages();
    const volume = Number(elements.soundVolume.value);
    const muted = volume <= 0;

    elements.soundVolume.setAttribute("aria-valuetext", `${volume}%`);
    elements.muteButton.classList.toggle("muted", muted);
    elements.muteButton.textContent = muted ? t.settings.unmute : t.settings.mute;
    elements.muteButton.setAttribute("aria-pressed", String(muted));
    elements.muteButton.setAttribute(
      "aria-label",
      muted ? t.settings.unmuteLabel : t.settings.muteLabel,
    );
  }

  function saveSettings() {
    localStorage.setItem(SOUND_VOLUME_KEY, elements.soundVolume.value);
    localStorage.setItem(
      SOUND_LAST_AUDIBLE_VOLUME_KEY,
      String(lastAudibleVolume),
    );
    localStorage.setItem(
      SOUND_CHOICES_KEY,
      JSON.stringify(getSelectedSoundChoices()),
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

  function getSelectedSoundChoices() {
    return Array.from(elements.soundChoices)
      .filter((choice) => choice.checked)
      .map((choice) => choice.value)
      .filter(isSoundChoiceId);
  }

  function setSelectedSoundChoices(soundChoices: SoundChoiceId[]) {
    elements.soundChoices.forEach((choice) => {
      choice.checked = soundChoices.includes(choice.value as SoundChoiceId);
    });
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

    const soundChoice = pickSoundChoice();
    if (soundChoice.type === "file") {
      await playAudioFile(soundChoice, volume);
      return;
    }

    playTone(volume);
  }

  function playTone(volume: number) {
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

  async function playAudioFile(
    soundChoice: Extract<SoundOption, { type: "file" }>,
    volume: number,
  ) {
    if (!audio) return;

    try {
      const source = audio.createBufferSource();
      const gain = audio.createGain();
      const start = audio.currentTime;

      source.buffer = await getAudioBuffer(soundChoice);
      gain.gain.setValueAtTime(getFileGain(volume), start);
      source.connect(gain);
      gain.connect(audio.destination);
      source.start(start);
      source.addEventListener("ended", () => {
        source.disconnect();
        gain.disconnect();
      });
    } catch (error) {
      console.error("Failed to play notification sound.", error);
      playTone(volume);
    }
  }

  async function getAudioBuffer(
    soundChoice: Extract<SoundOption, { type: "file" }>,
  ) {
    if (!audio) throw new Error("AudioContext is not ready.");

    const cachedBuffer = audioBuffers.get(soundChoice.id);
    if (cachedBuffer) return cachedBuffer;

    const response = await fetch(soundChoice.path);
    if (!response.ok) {
      throw new Error(`Failed to load ${soundChoice.path}: ${response.status}`);
    }

    const buffer = await audio.decodeAudioData(await response.arrayBuffer());
    audioBuffers.set(soundChoice.id, buffer);
    return buffer;
  }

  function pickSoundChoice() {
    const selectedChoices = getSelectedSoundChoices();
    const nextChoice =
      selectedChoices[Math.floor(Math.random() * selectedChoices.length)] ??
      DEFAULT_SOUND_CHOICE;

    return (
      SOUND_OPTIONS.find((soundChoice) => soundChoice.id === nextChoice) ??
      SOUND_OPTIONS[0]
    );
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
    updateControls,
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

function getFileGain(volume: number) {
  return Math.min(1, Math.max(0, volume));
}

function loadSoundChoices(): SoundChoiceId[] {
  const savedChoices = localStorage.getItem(SOUND_CHOICES_KEY);
  if (!savedChoices) return [DEFAULT_SOUND_CHOICE];

  try {
    const parsedChoices = JSON.parse(savedChoices);
    if (!Array.isArray(parsedChoices)) return [DEFAULT_SOUND_CHOICE];

    const validChoices = parsedChoices.filter(isSoundChoiceId);
    return validChoices.length > 0 ? validChoices : [DEFAULT_SOUND_CHOICE];
  } catch {
    return [DEFAULT_SOUND_CHOICE];
  }
}

function isSoundChoiceId(value: unknown): value is SoundChoiceId {
  return (
    typeof value === "string" &&
    SOUND_OPTIONS.some((soundChoice) => soundChoice.id === value)
  );
}

export type SoundController = ReturnType<typeof createSoundController>;
