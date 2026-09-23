import { getBest, recordScore } from "../../js/highscores.js";
import { drawOverlay } from "../../js/overlay.js";
import { audio } from "../../js/sound.js";
import { bindTouchControls } from "../../js/touch.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const LANES = 4;
const LANE_W = (canvas.width - 160) / LANES;
const ROAD_X = 80;
const ROAD_W = canvas.width - 160;

const OBSTACLE_TYPES = {
    car:       { w: 52, h: 88, colors: ["#e74c3c", "#3498db", "#9b59b6", "#1abc9c", "#e67e22", "#ecf0f1"] },
    truck:     { w: 60, h: 130, colors: ["#95a5a6", "#34495e"] },
    barrier:   { w: 64, h: 22, colors: ["#f39c12"] },
    oil:       { w: 56, h: 40, colors: ["#2c3e50"] },
    coin:      { w: 28, h: 28, colors: ["#ffd700"] },
    boost_pad: { w: 44, h: 36, colors: ["#00ffee"] }
};

function createState() {
    return {
        phase: "ready",
        score: 0,
        distance: 0,
        speed: 4,
        highScore: getBest("bike"),
        bike: {
            x: canvas.width / 2,
            y: canvas.height - 110,
            w: 30,
            h: 64,
            tilt: 0,
            invincible: 0
        },
        obstacles: [],
        particles: [],
        scenery: [
            { y: 0, type: "tree" },
            { y: 150, type: "lamp" },
            { y: 300, type: "tree" },
            { y: 450, type: "lamp" }
        ],
        spawnTimer: 0,
        roadOffset: 0,
        boostTimer: 0,
        boostCooldown: 0,
        nearMissCount: 0,
        coinsCollected: 0,
        frame: 0
    };
}

let state = createState();
const input = { left: false, right: false, up: false, start: false, pause: false, menu: false, restart: false };

document.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(e.key)) e.preventDefault();
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") input.left = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") input.right = true;
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") input.up = true;
    if (e.key === " " || e.key === "Enter") {
        if (state.phase === "gameover") input.restart = true;
        else input.start = true;
    }
    if (e.key === "p" || e.key === "P") input.pause = true;
    if (e.key === "Escape") {
        if (state.phase === "playing") input.pause = true;
        else input.menu = true;
    }
    audio.unlock();
});

document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") input.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") input.right = false;
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") input.up = false;
});

bindTouchControls(input);

// Touch drag steering
function pointerX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * canvas.width;
}
canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    audio.unlock();
    state.bike.x = Math.max(ROAD_X + 20, Math.min(ROAD_X + ROAD_W - 20, pointerX(e.touches[0].clientX)));
    if (state.phase === "gameover") input.restart = true;
    else if (state.phase === "ready") input.start = true;
}, { passive: false });
canvas.addEventListener("touchmove", (e) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    state.bike.x = Math.max(ROAD_X + 20, Math.min(ROAD_X + ROAD_W - 20, pointerX(e.touches[0].clientX)));
}, { passive: false });

function spawnObstacle() {
    const lane = Math.floor(Math.random() * LANES);
    const laneCenter = ROAD_X + LANE_W * lane + LANE_W / 2;
    const types = ["car", "car", "car", "truck", "barrier", "oil", "coin", "coin", "boost_pad"];
    const type = types[Math.floor(Math.random() * types.length)];
    const def = OBSTACLE_TYPES[type];
    const color = def.colors[Math.floor(Math.random() * def.colors.length)];

    const canLaneSwitch = (type === "car" || type === "truck");
    const laneChangeIntervalMin = 120;
    const laneChangeIntervalMax = 240;

    state.obstacles.push({
        type,
        x: laneCenter,
        y: -120,
        w: def.w,
        h: def.h,
        color,
        speed: type === "truck" ? 0.55 : type === "car" ? 0.65 : 1.0,
        passed: false,
        wobble: 0,
        lane: canLaneSwitch ? lane : null,
        targetLane: null,
        laneChangeTimer: canLaneSwitch
            ? Math.floor(Math.random() * (laneChangeIntervalMax - laneChangeIntervalMin + 1)) + laneChangeIntervalMin
            : 0
    });
}

function addParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        state.particles.push({
            x, y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            life: 20 + Math.random() * 20,
            maxLife: 40,
            color,
            size: 2 + Math.random() * 4
        });
    }
}

function crash() {
    state.phase = "gameover";
    state.highScore = recordScore("bike", Math.floor(state.score));
    audio.play("crash");
    addParticles(state.bike.x, state.bike.y, "#ff6b35", 25);
    addParticles(state.bike.x, state.bike.y, "#ffd700", 15);
}

function update() {
    state.frame++;

    if (input.menu) {
        window.location.href = "../index.html";
        return;
    }
    if (input.restart || (state.phase === "gameover" && input.start)) {
        state = createState();
        input.restart = false;
        input.start = false;
        return;
    }
    if (input.pause) {
        if (state.phase === "playing") state.phase = "paused";
        else if (state.phase === "paused") state.phase = "playing";
        input.pause = false;
    }
    if (state.phase === "ready" && input.start) {
        state.phase = "playing";
        input.start = false;
        audio.play("vroom");
    }
    if (state.phase !== "playing") {
        input.start = false;
        return;
    }

    // Engine hum every second or so
    if (state.frame % 60 === 0) audio.play("engine");

    // Boost
    if (input.up && state.boostCooldown <= 0 && state.boostTimer <= 0) {
        state.boostTimer = 90;
        state.boostCooldown = 240;
        audio.play("boost");
    }
    if (state.boostTimer > 0) state.boostTimer--;
    if (state.boostCooldown > 0) state.boostCooldown--;

    const boostMult = state.boostTimer > 0 ? 1.6 : 1;
    state.speed = Math.min(10 + state.distance / 2000, 18) * boostMult;

    // Score from distance
    state.distance += state.speed;
    state.score += state.speed * 0.15;

    // Road scroll & Scenery scroll
    state.roadOffset = (state.roadOffset + state.speed) % 80;
    state.scenery.forEach((item) => {
        item.y += state.speed * 0.8;
        if (item.y > canvas.height + 60) item.y = -60;
    });

    // Steering
    const steerSpeed = 6 + state.speed * 0.15;
    if (input.left) {
        state.bike.x -= steerSpeed;
        state.bike.tilt = Math.max(-1, state.bike.tilt - 0.15);
    }
    if (input.right) {
        state.bike.x += steerSpeed;
        state.bike.tilt = Math.min(1, state.bike.tilt + 0.15);
    }
    if (!input.left && !input.right) {
        state.bike.tilt *= 0.85;
    }
    state.bike.x = Math.max(ROAD_X + 20, Math.min(ROAD_X + ROAD_W - 20, state.bike.x));

    // Spawn obstacles
    state.spawnTimer++;
    const spawnRate = Math.max(30, 65 - Math.floor(state.distance / 3000));
    if (state.spawnTimer >= spawnRate) {
        state.spawnTimer = 0;
        spawnObstacle();
    }

    // Move obstacles + lane-switching AI for cars/trucks
    state.obstacles.forEach((obs) => {
        obs.y += state.speed * obs.speed;
        obs.wobble += 0.05;

        // Lane-switching only for cars and trucks, once on screen
        if (obs.lane === null || obs.y < 0) return;

        if (obs.targetLane === null) {
            obs.laneChangeTimer--;
            if (obs.laneChangeTimer <= 0) {
                const choices = [];
                if (obs.lane > 0) choices.push(obs.lane - 1);
                if (obs.lane < LANES - 1) choices.push(obs.lane + 1);
                obs.targetLane = choices[Math.floor(Math.random() * choices.length)];
            }
        } else {
            const laneChangeSpeed = 0.45;
            const targetX = ROAD_X + LANE_W * obs.targetLane + LANE_W / 2;
            const dx = targetX - obs.x;
            if (Math.abs(dx) <= laneChangeSpeed + 0.5) {
                obs.x = targetX;
                obs.lane = obs.targetLane;
                obs.targetLane = null;
                obs.laneChangeTimer = Math.floor(Math.random() * 121) + 120; // 120–240 frames
            } else {
                obs.x += Math.sign(dx) * laneChangeSpeed;
            }
        }
    });

    // Check collisions & near misses
    const bike = state.bike;
    const bikeBox = { x: bike.x - bike.w / 2, y: bike.y - bike.h / 2, w: bike.w, h: bike.h };

    state.obstacles.forEach((obs) => {
        const obsBox = { x: obs.x - obs.w / 2, y: obs.y - obs.h / 2, w: obs.w, h: obs.h };

        // AABB collision
        const hit = bikeBox.x < obsBox.x + obsBox.w &&
                    bikeBox.x + bikeBox.w > obsBox.x &&
                    bikeBox.y < obsBox.y + obsBox.h &&
                    bikeBox.y + bikeBox.h > obsBox.y;

        if (hit && !obs.passed) {
            if (obs.type === "coin") {
                obs.passed = true;
                state.score += 150;
                state.coinsCollected++;
                audio.play("coin");
                addParticles(obs.x, obs.y, "#ffd700", 10);
                obs.y = canvas.height + 200;
            } else if (obs.type === "boost_pad") {
                obs.passed = true;
                state.boostTimer = 90;
                state.boostCooldown = 60;
                audio.play("powerup");
                addParticles(obs.x, obs.y, "#00ffee", 12);
                obs.y = canvas.height + 200;
            } else if (obs.type === "oil") {
                // Slide effect
                bike.x += (Math.random() - 0.5) * 30;
                addParticles(bike.x, bike.y + 20, "#555", 8);
                audio.play("skid");
                obs.passed = true;
                obs.y = canvas.height + 200;
            } else {
                crash();
            }
        }

        // Near miss bonus
        if (!obs.passed && obs.y > bike.y + bike.h / 2 + 10) {
            obs.passed = true;
            const dx = Math.abs(obs.x - bike.x);
            if (dx < 60 && obs.type !== "oil" && obs.type !== "coin" && obs.type !== "boost_pad") {
                state.nearMissCount++;
                state.score += 25;
                audio.play("ding");
                addParticles(bike.x, bike.y - 30, "#00ffee", 5);
            }
        }
    });

    // Remove off-screen
    state.obstacles = state.obstacles.filter((o) => o.y < canvas.height + 150);

    // Update particles
    state.particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;
        p.life--;
        p.dy += 0.1;
    });
    state.particles = state.particles.filter((p) => p.life > 0);
}

function drawScenery() {
    state.scenery.forEach((s) => {
        // Left roadside tree/lamp
        const lx = 35;
        // Right roadside tree/lamp
        const rx = canvas.width - 35;

        if (s.type === "tree") {
            // Tree left
            ctx.fillStyle = "#1e824c";
            ctx.beginPath();
            ctx.arc(lx, s.y, 18, 0, Math.PI * 2);
            ctx.fill();
            // Tree right
            ctx.beginPath();
            ctx.arc(rx, s.y, 18, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Street lamp left
            ctx.fillStyle = "#7f8c8d";
            ctx.fillRect(lx - 2, s.y - 12, 4, 24);
            ctx.fillStyle = "#f1c40f";
            ctx.beginPath();
            ctx.arc(lx + 4, s.y - 12, 5, 0, Math.PI * 2);
            ctx.fill();

            // Street lamp right
            ctx.fillStyle = "#7f8c8d";
            ctx.fillRect(rx - 2, s.y - 12, 4, 24);
            ctx.fillStyle = "#f1c40f";
            ctx.beginPath();
            ctx.arc(rx - 4, s.y - 12, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function drawRoad() {
    // Road surface
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(ROAD_X, 0, ROAD_W, canvas.height);

    // Road edges
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(ROAD_X - 6, 0, 6, canvas.height);
    ctx.fillRect(ROAD_X + ROAD_W, 0, 6, canvas.height);

    // Lane dividers
    ctx.fillStyle = "#f1c40f";
    for (let i = 1; i < LANES; i++) {
        const x = ROAD_X + LANE_W * i;
        for (let y = -80 + state.roadOffset; y < canvas.height; y += 80) {
            ctx.fillRect(x - 3, y, 6, 40);
        }
    }

    // Side grass / dirt
    ctx.fillStyle = "#0d5c2e";
    ctx.fillRect(0, 0, ROAD_X - 6, canvas.height);
    ctx.fillRect(ROAD_X + ROAD_W + 6, 0, canvas.width - ROAD_X - ROAD_W - 6, canvas.height);

    drawScenery();
}

function drawObstacle(obs) {
    const ox = obs.x - obs.w / 2;
    const oy = obs.y - obs.h / 2;

    if (obs.type === "coin") {
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffaa00";
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.w / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillText("$", obs.x - 3, obs.y + 4);
        return;
    }

    if (obs.type === "boost_pad") {
        ctx.fillStyle = "rgba(0, 255, 238, 0.4)";
        ctx.fillRect(ox, oy, obs.w, obs.h);
        ctx.fillStyle = "#00ffee";
        ctx.beginPath();
        ctx.moveTo(obs.x, oy + 4);
        ctx.lineTo(obs.x + obs.w / 2 - 4, oy + obs.h - 4);
        ctx.lineTo(obs.x - obs.w / 2 + 4, oy + obs.h - 4);
        ctx.closePath();
        ctx.fill();
        return;
    }

    if (obs.type === "oil") {
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.ellipse(obs.x, obs.y, obs.w / 2, obs.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(100,100,255,0.3)";
        ctx.beginPath();
        ctx.ellipse(obs.x - 5, obs.y - 3, obs.w / 4, obs.h / 4, 0, 0, Math.PI * 2);
        ctx.fill();
        return;
    }

    if (obs.type === "barrier") {
        // Striped barrier
        ctx.fillStyle = "#f39c12";
        ctx.fillRect(ox, oy, obs.w, obs.h);
        ctx.fillStyle = "#fff";
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(ox + i * 22, oy, 10, obs.h);
        }
        return;
    }

    // Car / truck body
    ctx.fillStyle = obs.color;
    ctx.fillRect(ox, oy, obs.w, obs.h);

    // Windshield
    ctx.fillStyle = "rgba(150, 200, 255, 0.7)";
    ctx.fillRect(ox + 6, oy + obs.h * 0.18, obs.w - 12, obs.h * 0.18);
    ctx.fillRect(ox + 6, oy + obs.h * 0.65, obs.w - 12, obs.h * 0.15);

    // Wheels
    ctx.fillStyle = "#222";
    const wheelW = 8;
    ctx.fillRect(ox - 2, oy + 10, wheelW, 18);
    ctx.fillRect(ox + obs.w - 6, oy + 10, wheelW, 18);
    ctx.fillRect(ox - 2, oy + obs.h - 28, wheelW, 18);
    ctx.fillRect(ox + obs.w - 6, oy + obs.h - 28, wheelW, 18);

    // Brake lights
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(ox + 4, oy + obs.h - 4, 8, 4);
    ctx.fillRect(ox + obs.w - 12, oy + obs.h - 4, 8, 4);

    // Amber turn indicator when lane-changing
    if (obs.targetLane !== null) {
        const blinkOn = Math.floor(Date.now() / 250) % 2 === 0;
        if (blinkOn) {
            ctx.fillStyle = "#ff8c00";
            const turningRight = obs.targetLane > obs.lane;
            const bx = turningRight ? ox + obs.w - 8 : ox;
            ctx.fillRect(bx, oy + 6, 8, 7);
        }
    }
}

function drawBike() {
    const b = state.bike;

    // Exhaust particles during boost
    if (state.boostTimer > 0 && state.frame % 3 === 0) {
        addParticles(b.x + (Math.random() - 0.5) * 10, b.y + b.h / 2, "#ff9500", 2);
    }

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.tilt * 0.25);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(-b.w / 2 + 3, -b.h / 2 + 5, b.w, b.h);

    // Wheels
    ctx.fillStyle = "#333";
    ctx.fillRect(-5, -b.h / 2, 10, 20);
    ctx.fillRect(-5, b.h / 2 - 20, 10, 20);

    // Body
    ctx.fillStyle = "#ff6b35";
    ctx.fillRect(-b.w / 2, -b.h / 2 + 15, b.w, b.h - 30);

    // Seat
    ctx.fillStyle = "#222";
    ctx.fillRect(-b.w / 2 + 4, b.h / 2 - 35, b.w - 8, 20);

    // Tank
    ctx.fillStyle = "#e55a2b";
    ctx.fillRect(-b.w / 2 + 3, -10, b.w - 6, 22);

    // Handlebars
    ctx.fillStyle = "#888";
    ctx.fillRect(-b.w / 2 - 2, -b.h / 2 + 14, b.w + 4, 5);

    // Headlight
    ctx.fillStyle = "#ffeb3b";
    ctx.fillRect(-6, -b.h / 2 + 15, 12, 6);

    // Rider
    ctx.fillStyle = "#00ffee";
    ctx.fillRect(-8, -15, 16, 18);
    ctx.fillStyle = "#fff";
    ctx.fillRect(-5, -b.h / 2 + 22, 10, 12);

    ctx.restore();
}

function drawParticles() {
    state.particles.forEach((p) => {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
}

function drawHUD() {
    ctx.font = "16px 'Press Start 2P'";
    ctx.fillStyle = "#00ffee";
    ctx.fillText("SCORE " + Math.floor(state.score), 16, 28);

    ctx.fillStyle = "#ff6b35";
    const kmh = Math.round(state.speed * 12);
    ctx.fillText(kmh + " KM/H", 16, 55);

    ctx.fillStyle = "#ffd700";
    ctx.fillText("NEAR MISS x" + state.nearMissCount, 16, 82);

    // Boost meter
    if (state.boostCooldown > 0) {
        const pct = 1 - state.boostCooldown / 240;
        ctx.fillStyle = "#333";
        ctx.fillRect(canvas.width - 180, 16, 150, 14);
        ctx.fillStyle = pct >= 1 ? "#00ffee" : "#ff6b35";
        ctx.fillRect(canvas.width - 180, 16, 150 * pct, 14);
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillStyle = "#fff";
        ctx.fillText("BOOST", canvas.width - 180, 46);
    } else {
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillStyle = "#00ffee";
        ctx.fillText("BOOST READY!", canvas.width - 180, 28);
    }
}

function draw() {
    ctx.fillStyle = "#050816";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawRoad();
    state.obstacles.forEach(drawObstacle);
    drawBike();
    drawParticles();
    drawHUD();

    if (state.phase === "ready") {
        drawOverlay(ctx, canvas, "MOTO DASH", [
            "STEER WITH ARROWS / A D",
            "HOLD UP / W TO BOOST",
            "NEAR MISS FOR BONUS POINTS",
            "SPACE TO START"
        ]);
    } else if (state.phase === "paused") {
        drawOverlay(ctx, canvas, "PAUSED", ["P TO CONTINUE"]);
    } else if (state.phase === "gameover") {
        drawOverlay(ctx, canvas, "CRASHED!", [
            "SCORE " + Math.floor(state.score),
            "NEAR MISSES " + state.nearMissCount,
            "BEST " + state.highScore,
            "SPACE TO RESTART"
        ]);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
