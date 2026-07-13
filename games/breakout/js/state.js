import { BALL, BRICKS, PADDLE } from "./config.js";

function createBricks() {
    const bricks = [];

    for (let c = 0; c < BRICKS.COLUMN_COUNT; c++) {
        bricks[c] = [];

        for (let r = 0; r < BRICKS.ROW_COUNT; r++) {
            bricks[c][r] = {
                x: 0,
                y: 0,
                status: 1
            };
        }
    }

    return bricks;
}

export function createGameState(canvas) {
    return {
        score: 0,
        lives: 3,
        paddle: {
            width: PADDLE.WIDTH,
            height: PADDLE.HEIGHT,
            x: canvas.width / 2 - PADDLE.WIDTH / 2,
            y: canvas.height - 40,
            speed: PADDLE.SPEED
        },
        ball: {
            x: canvas.width / 2,
            y: canvas.height / 2,
            radius: BALL.RADIUS,
            dx: BALL.INITIAL_DX,
            dy: BALL.INITIAL_DY
        },
        bricks: createBricks()
    };
}
