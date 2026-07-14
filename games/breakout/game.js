import { createGameState } from "./js/state.js";
import { createInputController } from "./js/input.js";
import { draw } from "./js/render.js";
import { update } from "./js/update.js";
import { audio } from "../../js/sound.js";

// =============================
// Canvas
// =============================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// =============================
// Game State
// =============================

const state = createGameState(canvas);
const input = createInputController(document);

// =============================
// Unlock Audio
// Browsers block sound until the
// first user interaction.
// =============================

function unlockAudio() {

    Object.values(audio.sounds).forEach(sound => {

        sound.volume = 0;
        sound.play()
            .then(() => {
                sound.pause();
                sound.currentTime = 0;
                sound.volume = 0.35;
            })
            .catch(() => {});

    });

    window.removeEventListener("keydown", unlockAudio);
    window.removeEventListener("mousedown", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);

}

window.addEventListener("keydown", unlockAudio, { once: true });
window.addEventListener("mousedown", unlockAudio, { once: true });
window.addEventListener("touchstart", unlockAudio, { once: true });

// =============================
// Main Game Loop
// =============================

function gameLoop() {

    update(canvas, state, input);

    draw(ctx, canvas, state);

    requestAnimationFrame(gameLoop);

}

gameLoop();