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

    noise(duration, volume, filterFreq = 1000) {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(filterFreq, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + duration);

        const gain = this.ctx.createGain();
        const peak = Math.max(0, volume * this.masterVolume);
        gain.gain.setValueAtTime(peak, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        noiseSrc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noiseSrc.start(now);
        noiseSrc.stop(now + duration + 0.02);
    }

    play(name) {
        const recipes = {
            // Classic sounds
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
            select: () => this.tone(360, 0.05, "square", 0.1),

            // New arcade sounds
            coin: () => {
                this.tone(1200, 0.05, "sine", 0.18);
                setTimeout(() => this.tone(1600, 0.12, "sine", 0.2), 60);
            },
            powerup: () => {
                this.tone(440, 0.08, "square", 0.14);
                setTimeout(() => this.tone(554, 0.08, "square", 0.14), 60);
                setTimeout(() => this.tone(659, 0.08, "square", 0.14), 120);
                setTimeout(() => this.tone(880, 0.14, "square", 0.16), 180);
            },
            explosion: () => {
                this.noise(0.25, 0.35, 800);
                this.tone(120, 0.3, "sawtooth", 0.18, 40);
            },
            crash: () => {
                this.noise(0.35, 0.4, 1200);
                this.tone(100, 0.3, "sawtooth", 0.22, 30);
            },
            jump: () => this.tone(220, 0.12, "square", 0.14, 660),
            splash: () => {
                this.noise(0.3, 0.32, 1400);
                this.tone(320, 0.18, "sine", 0.14, 90);
            },
            engine: () => {
                this.tone(80, 0.15, "sawtooth", 0.12, 60);
                setTimeout(() => this.tone(65, 0.1, "sawtooth", 0.08, 55), 40);
            },
            vroom: () => {
                this.tone(120, 0.2, "sawtooth", 0.15, 180);
                setTimeout(() => this.tone(180, 0.15, "sawtooth", 0.12, 220), 50);
            },
            boost: () => {
                this.tone(330, 0.1, "square", 0.14);
                setTimeout(() => this.tone(440, 0.1, "square", 0.16), 40);
                setTimeout(() => this.tone(660, 0.14, "square", 0.18), 80);
                setTimeout(() => this.tone(880, 0.18, "square", 0.2), 120);
            },
            skid: () => {
                this.noise(0.18, 0.2, 2000);
                this.tone(180, 0.15, "sawtooth", 0.1, 60);
            },
            alarm: () => {
                this.tone(880, 0.08, "square", 0.14);
                setTimeout(() => this.tone(880, 0.08, "square", 0.14), 120);
            },
            sweep: () => {
                this.tone(200, 0.15, "triangle", 0.12, 1200);
            },
            thud: () => this.tone(90, 0.1, "square", 0.18),
            blip: () => this.tone(1200, 0.04, "sine", 0.1),
            ding: () => {
                this.tone(880, 0.06, "sine", 0.15);
                setTimeout(() => this.tone(1320, 0.1, "sine", 0.12), 50);
            },
            score: () => {
                this.tone(660, 0.06, "square", 0.12);
                setTimeout(() => this.tone(880, 0.08, "square", 0.14), 60);
            }
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
