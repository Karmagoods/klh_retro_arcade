// =============================
// Canvas Setup
// =============================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// =============================
// Paddle
// =============================

const paddle = {
    width: 120,
    height: 18,
    x: canvas.width / 2 - 60,
    y: canvas.height - 40,
    speed: 8
};

// =============================
// Ball
// =============================

const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    dx: 5,
    dy: -5
};

// =============================
// Bricks
// =============================

const brickRowCount = 5;
const brickColumnCount = 8;

const brickWidth = 85;
const brickHeight = 25;

const brickPadding = 10;

const brickOffsetTop = 60;
const brickOffsetLeft = 25;

const bricks = [];

for (let c = 0; c < brickColumnCount; c++) {

    bricks[c] = [];

    for (let r = 0; r < brickRowCount; r++) {

        bricks[c][r] = {
            x: 0,
            y: 0,
            status: 1
        };

    }

}

// =============================
// Score
// =============================

let score = 0;
// =============================
// Keyboard
// =============================

let rightPressed = false;
let leftPressed = false;

document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

function keyDown(e) {
    if (e.key === "ArrowRight") rightPressed = true;
    if (e.key === "ArrowLeft") leftPressed = true;
}

function keyUp(e) {
    if (e.key === "ArrowRight") rightPressed = false;
    if (e.key === "ArrowLeft") leftPressed = false;
}

// =============================
// Draw Paddle
// =============================

function drawPaddle() {
    ctx.fillStyle = "#00ffee";
    ctx.fillRect(
        paddle.x,
        paddle.y,
        paddle.width,
        paddle.height
    );
}

// =============================
// Draw Ball
// =============================

function drawBall() {
    ctx.beginPath();

    ctx.arc(
        ball.x,
        ball.y,
        ball.radius,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.closePath();
}

function drawBricks() {

    for (let c = 0; c < brickColumnCount; c++) {

        for (let r = 0; r < brickRowCount; r++) {

            if (bricks[c][r].status === 1) {

                const brickX =
                    c * (brickWidth + brickPadding) + brickOffsetLeft;

                const brickY =
                    r * (brickHeight + brickPadding) + brickOffsetTop;

                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;

                // Neon cyan brick
                ctx.fillStyle = "#00ffee";
                ctx.fillRect(brickX, brickY, brickWidth, brickHeight);

                // White highlight
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2;
                ctx.strokeRect(brickX, brickY, brickWidth, brickHeight);

            }

        }

    }

}
function drawScore() {

    ctx.font = "20px 'Press Start 2P'";
    ctx.fillStyle = "#00ffee";
    ctx.fillText("SCORE: " + score, 20, 30);

}
function collisionDetection() {

    for (let c = 0; c < brickColumnCount; c++) {

        for (let r = 0; r < brickRowCount; r++) {

            const b = bricks[c][r];

            if (b.status === 1) {

                if (
                    ball.x > b.x &&
                    ball.x < b.x + brickWidth &&
                    ball.y > b.y &&
                    ball.y < b.y + brickHeight
                ) {

                    ball.dy *= -1;

                    b.status = 0;

                    score++;

                }

            }

        }

    }

}
// =============================
// Update
// =============================

function update() {

    // Move paddle

    if (rightPressed && paddle.x < canvas.width - paddle.width)
        paddle.x += paddle.speed;

    if (leftPressed && paddle.x > 0)
        paddle.x -= paddle.speed;

    // Move ball

    ball.x += ball.dx;
    ball.y += ball.dy;
    collisionDetection();
    // =============================
    // Paddle Collision
    // =============================

    if (
        ball.y + ball.radius >= paddle.y &&
        ball.y - ball.radius <= paddle.y + paddle.height &&
        ball.x >= paddle.x &&
        ball.x <= paddle.x + paddle.width &&
        ball.dy > 0
    ) {

        // Calculate where the ball hit the paddle
        const hitPoint =
            (ball.x - (paddle.x + paddle.width / 2)) /
            (paddle.width / 2);

        // Change direction
        ball.dx = hitPoint * 6;
        ball.dy = -Math.abs(ball.dy);

        // Keep ball above paddle
        ball.y = paddle.y - ball.radius;

    }

    // =============================
    // Wall Collision
    // =============================

    // Left & Right walls
    if (
        ball.x <= ball.radius ||
        ball.x >= canvas.width - ball.radius
    ) {
        ball.dx *= -1;
    }

    // Top wall
    if (ball.y <= ball.radius) {
        ball.dy *= -1;
    }

    // Bottom wall
    if (ball.y > canvas.height + ball.radius) {

        // Reset ball
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;

        ball.dx = 5;
        ball.dy = -5;
    }

}

// =============================
// Draw
// =============================

function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawScore();
    drawBricks();
    drawBall();
    drawPaddle();

}

// =============================
// Game Loop
// =============================

function gameLoop() {

    update();
    draw();

    requestAnimationFrame(gameLoop);

}

gameLoop();