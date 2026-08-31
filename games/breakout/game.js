import { createGameState } from "./js/state.js";
import { createInputController } from "./js/input.js";
import { draw } from "./js/render.js";
import { update } from "./js/update.js";
import { getBest } from "../../js/highscores.js";
import { audio } from "../../js/sound.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const state = createGameState(canvas);
state.highScore = getBest("breakout");
const input = createInputController(document, canvas, state);

function unlockAudio() {
    audio.unlock();
}

window.addEventListener("keydown", unlockAudio, { once: true });
window.addEventListener("mousedown", unlockAudio, { once: true });
window.addEventListener("touchstart", unlockAudio, { once: true });

function gameLoop() {
    update(canvas, state, input);
    draw(ctx, canvas, state);
    requestAnimationFrame(gameLoop);
}

gameLoop();
