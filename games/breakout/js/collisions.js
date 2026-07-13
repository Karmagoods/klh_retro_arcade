import { BRICKS } from "./config.js";

export function detectBrickCollision(state) {
    const { ball, bricks } = state;

    for (let c = 0; c < BRICKS.COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICKS.ROW_COUNT; r++) {
            const b = bricks[c][r];

            if (b.status === 1) {
                if (
                    ball.x > b.x &&
                    ball.x < b.x + BRICKS.WIDTH &&
                    ball.y > b.y &&
                    ball.y < b.y + BRICKS.HEIGHT
                ) {
                    ball.dy = -ball.dy;

                    b.status = 0;

                    state.score++;

                    if (state.score === BRICKS.ROW_COUNT * BRICKS.COLUMN_COUNT) {
                        alert("LEVEL COMPLETE!");

                        document.location.reload();
                    }

                    return;
                }
            }
        }
    }
}
