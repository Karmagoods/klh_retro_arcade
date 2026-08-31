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

    canvas.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.width / rect.width;
        input.mouseX = (e.clientX - rect.left) * scale;
    });

    canvas.addEventListener("mousedown", () => {
        if (state.phase === "gameover") input.restart = true;
        else input.serve = true;
    });

    return input;
}
