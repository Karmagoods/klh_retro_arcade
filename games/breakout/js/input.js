export function createInputController(target) {
    const input = {
        rightPressed: false,
        leftPressed: false
    };

    target.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight")
            input.rightPressed = true;

        if (e.key === "ArrowLeft")
            input.leftPressed = true;
    });

    target.addEventListener("keyup", (e) => {
        if (e.key === "ArrowRight")
            input.rightPressed = false;

        if (e.key === "ArrowLeft")
            input.leftPressed = false;
    });

    return input;
}
