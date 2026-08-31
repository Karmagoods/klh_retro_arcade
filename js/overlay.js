export function drawOverlay(ctx, canvas, title, lines) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#00ffee";
    ctx.textAlign = "center";
    ctx.font = "28px 'Press Start 2P'";
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 40);

    ctx.fillStyle = "#ffffff";
    ctx.font = "12px 'Press Start 2P'";
    lines.forEach((line, index) => {
        ctx.fillText(line, canvas.width / 2, canvas.height / 2 + 10 + index * 28);
    });

    ctx.textAlign = "left";
}
