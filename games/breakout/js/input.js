import { bindTouchControls } from "../../../js/touch.js";

export function createInputController(target, canvas, state) {
    const input = {
        rightPressed: false,
        leftPressed: false,
        mouseX: null,
        serve: false,
        pause: false,
        restart: false,
        menu: false
    };

    target.addEventListener("keydown", (e) => {
        if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", " "].includes(e.key)) {
            e.preventDefault();
        }
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") input.rightPressed = true;
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") input.leftPressed = true;
        if (e.key === " " || e.key === "Enter") {
            if (state.phase === "gameover") input.restart = true;
            else input.serve = true;
        }
        if (e.key === "p" || e.key === "P") input.pause = true;
        if (e.key === "Escape") {
            if (state.phase === "playing") input.pause = true;
            else input.menu = true;
        }
    });

    target.addEventListener("keyup", (e) => {
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") input.rightPressed = false;
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") input.leftPressed = false;
    });

    function pointerX(clientX) {
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.width / rect.width;
        return (clientX - rect.left) * scale;
    }

    canvas.addEventListener("mousemove", (e) => {
        input.mouseX = pointerX(e.clientX);
    });

    canvas.addEventListener("mousedown", () => {
        if (state.phase === "gameover") input.restart = true;
        else input.serve = true;
    });

    canvas.addEventListener(
        "touchstart",
        (e) => {
            if (e.touches.length !== 1) return;
            e.preventDefault();
            input.mouseX = pointerX(e.touches[0].clientX);
            if (state.phase === "gameover") input.restart = true;
            else if (state.phase === "ready") input.serve = true;
        },
        { passive: false }
    );
    canvas.addEventListener(
        "touchmove",
        (e) => {
            if (e.touches.length !== 1) return;
            e.preventDefault();
            input.mouseX = pointerX(e.touches[0].clientX);
        },
        { passive: false }
    );

    bindTouchControls(input);

    const interval = setInterval(() => {
        if (state.phase === "gameover" && input.serve) {
            input.restart = true;
            input.serve = false;
        }
    }, 40);
    window.addEventListener("pagehide", () => clearInterval(interval), { once: true });

    return input;
}
