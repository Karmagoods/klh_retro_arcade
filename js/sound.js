// =======================================
// KLH Retro Arcade
// Sound Manager
// =======================================

export class SoundManager {

    constructor() {

        this.masterVolume = 0.4;
        this.muted = false;

        this.sounds = {

            paddle: this.createSound("/assets/sounds/paddle.wav", 0.35),

            brick: this.createSound("/assets/sounds/brick.wav", 0.20),

            wall: this.createSound("/assets/sounds/wall.wav", 0.15),

            lose: this.createSound("/assets/sounds/lose.wav", 0.50),

            win: this.createSound("/assets/sounds/win.wav", 0.70)

        };

    }

    // =======================================
    // Create Audio Object
    // =======================================

    createSound(src, volume) {

    const sound = new Audio(src);

    sound.preload = "auto";
    sound.baseVolume = volume;
    sound.volume = volume * this.masterVolume;

    return sound;

}

    // =======================================
    // Play Sound
    // =======================================

    play(name) {

        if (this.muted) return;

        const sound = this.sounds[name];

        if (!sound) return;

        sound.pause();
        sound.currentTime = 0;

        sound.play().catch(() => {
            // Ignore autoplay restrictions until audio is unlocked
        });

    }

    // =======================================
    // Stop One Sound
    // =======================================

    stop(name) {

        const sound = this.sounds[name];

        if (!sound) return;

        sound.pause();
        sound.currentTime = 0;

    }

    // =======================================
    // Stop Everything
    // =======================================

    stopAll() {

        Object.values(this.sounds).forEach(sound => {

            sound.pause();
            sound.currentTime = 0;

        });

    }

    // =======================================
    // Mute
    // =======================================

    mute() {

        this.muted = true;

    }

    // =======================================
    // Unmute
    // =======================================

    unmute() {

        this.muted = false;

    }

    // =======================================
    // Toggle Mute
    // =======================================

    toggleMute() {

        this.muted = !this.muted;

        return this.muted;

    }

    // =======================================
    // Master Volume
    // value = 0.0 - 1.0
    // =======================================

    setMasterVolume(value) {

        this.masterVolume = Math.max(0, Math.min(1, value));

        Object.values(this.sounds).forEach(sound => {
            sound.volume = sound.baseVolume * this.masterVolume;
        });

    }

}

// =======================================
// Singleton
// =======================================

export const audio = new SoundManager();