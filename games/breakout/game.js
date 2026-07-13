import { createGameState } from "./js/state.js";
import { createInputController } from "./js/input.js";
import { draw } from "./js/render.js";
import { update } from "./js/update.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const state = createGameState(canvas);
const input = createInputController(document);

function gameLoop() {
    update(canvas, state, input);
    draw(ctx, canvas, state);

    requestAnimationFrame(gameLoop);
}

gameLoop();
