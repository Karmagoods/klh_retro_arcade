console.log("KLH Retro Arcade Loaded");

const playBtn = document.getElementById("playBtn");

playBtn.addEventListener("click", () => {
    window.location.href = "games/breakout/index.html";
});