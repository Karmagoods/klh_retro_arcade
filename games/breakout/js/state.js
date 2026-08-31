import { BALL, BRICKS, PADDLE } from "./config.js";

export function createBricks(level) {
    const extraRows = Math.min(2, Math.max(0, level - 1));
    const rows = BRICKS.ROW_COUNT + extraRows;
    const bricks = [];

    for (let c = 0; c < BRICKS.COLUMN_COUNT; c++) {
        bricks[c] = [];
        for (let r = 0; r < rows; r++) {
            bricks[c][r] = { x: 0, y: 0, status: 1, row: r };
        }
    }

    return { bricks, rows };
}

export function serveBall(state, canvas) {
    const speed = BALL.INITIAL_SPEED + (state.level - 1) * 0.6;
    const angle = (Math.random() * 0.6 - 0.3);
    state.ball.x = state.paddle.x + state.paddle.width / 2;
    state.ball.y = state.paddle.y - state.ball.radius - 2;
    state.ball.dx = Math.sin(angle) * speed;
    state.ball.dy = -Math.abs(Math.cos(angle) * speed);
    if (Math.abs(state.ball.dx) < 1.5) {
        state.ball.dx = state.ball.dx < 0 ? -1.5 : 1.5;
    }
}

export function resetServe(state, canvas) {
    state.paddle.x = canvas.width / 2 - state.paddle.width / 2;
    state.ball.x = canvas.width / 2;
    state.ball.y = state.paddle.y - state.ball.radius - 2;
    state.ball.dx = 0;
    state.ball.dy = 0;
    state.phase = "ready";
}

export function startLevel(state, canvas) {
    const pack = createBricks(state.level);
    state.bricks = pack.bricks;
    state.rows = pack.rows;
    resetServe(state, canvas);
}

export function createGameState(canvas) {
    const state = {
        score: 0,
        lives: 3,
        level: 1,
        highScore: 0,
        phase: "ready",
        rows: BRICKS.ROW_COUNT,
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
            dx: 0,
            dy: 0
        },
        bricks: []
    };

    startLevel(state, canvas);
    return state;
}

export function remainingBricks(state) {
    let count = 0;
    for (let c = 0; c < state.bricks.length; c++) {
        for (let r = 0; r < state.bricks[c].length; r++) {
            if (state.bricks[c][r].status === 1) count += 1;
        }
    }
    return count;
}
