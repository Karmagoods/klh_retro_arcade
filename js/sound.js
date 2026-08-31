import { loadSettings, saveSettings } from "./highscores.js";

export class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterVolume = 0.4;
        this.muted = false;

        const settings = loadSettings();
        this.masterVolume = settings.volume;
        this.muted = settings.muted;
    }

    unlock() {
        this.ensureContext();
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume().catch(() => {});
        }
    }

    ensureContext() {
        if (this.ctx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        this.ctx = new AudioContextClass();
    }

    persist() {
        saveSettings({
            volume: this.masterVolume,
            muted: this.muted
        });
    }

    tone(frequency, duration, type, volume, slideTo) {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const oscillator = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, now);
        if (slideTo) {
            oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
        }

        const peak = Math.max(0, volume * this.masterVolume);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        oscillator.connect(gain);
        gain.connect(this.ctx.destination);
        oscillator.start(now);
        oscillator.stop(now + duration + 0.02);
    }

    play(name) {
        const recipes = {
            paddle: () => this.tone(180, 0.08, "square", 0.22),
            brick: () => this.tone(520, 0.07, "triangle", 0.18, 280),
            wall: () => this.tone(140, 0.05, "square", 0.12),
            lose: () => this.tone(280, 0.35, "sawtooth", 0.2, 80),
            win: () => {
                this.tone(440, 0.12, "square", 0.16);
                setTimeout(() => this.tone(660, 0.12, "square", 0.16), 90);
                setTimeout(() => this.tone(880, 0.18, "square", 0.18), 180);
            },
            shoot: () => this.tone(880, 0.08, "square", 0.12, 220),
            eat: () => this.tone(640, 0.09, "triangle", 0.18, 880),
            hit: () => this.tone(200, 0.1, "square", 0.16, 90),
            line: () => {
                this.tone(523, 0.12, "square", 0.16);
                setTimeout(() => this.tone(659, 0.16, "square", 0.16), 70);
            },
            move: () => this.tone(90, 0.03, "square", 0.08),
            select: () => this.tone(360, 0.05, "square", 0.1)
        };

        const recipe = recipes[name];
        if (recipe) recipe();
    }

    mute() {
        this.muted = true;
        this.persist();
    }

    unmute() {
        this.muted = false;
        this.persist();
    }

    toggleMute() {
        this.muted = !this.muted;
        this.persist();
        return this.muted;
    }

    setMasterVolume(value) {
        this.masterVolume = Math.max(0, Math.min(1, value));
        this.persist();
    }
}

export const audio = new SoundManager();
