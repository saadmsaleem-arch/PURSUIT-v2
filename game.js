"use strict";

/* =====================================================
   VEHICLE ARTWORK
===================================================== */

const vehicleImages = {};

function loadVehicle(name, file) {
  const img = new Image();
  img.src = file;
  vehicleImages[name] = img;
}

loadVehicle("police", "police.png");
loadVehicle("suspect", "suspect.png");
loadVehicle("traffic1", "traffic1.png");
loadVehicle("traffic2", "traffic2.png");
loadVehicle("traffic3", "traffic3.png");
loadVehicle("truck", "truck.png");

/* =====================================================
   DOM
===================================================== */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const title = document.getElementById("title");
const subtitle = document.getElementById("subtitle");
const message = document.getElementById("message");
const startBtn = document.getElementById("startBtn");

const distanceValue = document.getElementById("distanceValue");
const speedValue = document.getElementById("speedValue");
const nitroFill = document.getElementById("nitroFill");
const nitroUI = document.getElementById("nitroUI");
const chaseStatus = document.getElementById("chaseStatus");

/* =====================================================
   SCREEN
===================================================== */

let W = 0;
let H = 0;
let DPR = 1;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);

  W = window.innerWidth;
  H = window.innerHeight;

  canvas.width = W * DPR;
  canvas.height = H * DPR;

  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

window.addEventListener("resize", resize);
resize();

/* =====================================================
   GAME STATE
===================================================== */

let running = false;
let lastTime = 0;
let roadScroll = 0;
let spawnTimer = 0;
let shake = 0;
let statusTimer = 0;

let player;
let robber;

let traffic = [];
let particles = [];

let distanceGap = 240;
let nitro = 0;
let nitroActive = 0;
let catchTimer = 0;
let elapsed = 0;
let score = 0;

/* =====================================================
   ROAD
===================================================== */

function roadInfo() {
  const width = Math.min(W * 0.78, 500);

  return {
    left: (W - width) / 2,
    right: (W + width) / 2,
    width
  };
}

/* =====================================================
   RESET
===================================================== */

function resetGame() {
  player = {
    x: W / 2,
    y: H * 0.84,
    targetX: W / 2,
    width: 72,
    height: 132,
    speed: 82,
    invincible: 0,
    image: "police"
  };

  robber = {
    x: W / 2,
    y: H * 0.16,
    width: 48,
    height: 92,
    phase: 0,
    image: "suspect"
  };

  traffic = [];
  particles = [];

  distanceGap = 240;
  nitro = 0;
  nitroActive = 0;
  catchTimer = 0;
  elapsed = 0;
  score = 0;
  spawnTimer = 0.5;
  roadScroll = 0;
  shake = 0;

  distanceValue.textContent = "240 m";
  speedValue.textContent = "0 km/h";
  nitroFill.style.width = "0%";
}

/* =====================================================
   START
===================================================== */

function startGame() {
  resetGame();

  overlay.style.display = "none";
  running = true;
  lastTime = performance.now();

  requestAnimationFrame(gameLoop);
}

startBtn.addEventListener("click", startGame);

/* =====================================================
   STEERING
===================================================== */

let pointerDown = false;

function steer(clientX) {
  if (!running) return;

  const road = roadInfo();

  player.targetX = Math.max(
    road.left + player.width / 2 + 10,
    Math.min(
      road.right - player.width / 2 - 10,
      clientX
    )
  );
}

canvas.addEventListener("pointerdown", event => {
  pointerDown = true;
  steer(event.clientX);
});

canvas.addEventListener("pointermove", event => {
  if (pointerDown) {
    steer(event.clientX);
  }
});

window.addEventListener("pointerup", () => {
  pointerDown = false;
});

/* =====================================================
   NITRO
===================================================== */

nitroUI.addEventListener("pointerdown", event => {
  event.preventDefault();

  if (running && nitro >= 100) {
    nitro = 0;
    nitroActive = 2.4;

    showStatus("NITRO BOOST!");

    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }
});

/* =====================================================
   TRAFFIC
===================================================== */

function spawnTraffic() {
  const road = roadInfo();

  const lanes = 4;
  const laneWidth = road.width / lanes;
  const lane = Math.floor(Math.random() * lanes);

  const roll = Math.random();

  let image;
  let width;
  let height;
  let ownSpeed;

  if (roll < 0.16) {
    image = "truck";
    width = 72;
    height = 155;
    ownSpeed = 22 + Math.random() * 22;
  } else {
    const trafficChoices = [
      "traffic1",
      "traffic2",
      "traffic3"
    ];

    image =
      trafficChoices[
        Math.floor(Math.random() * trafficChoices.length)
      ];

    width = 52;
    height = 98;
    ownSpeed = 28 + Math.random() * 35;
  }

  traffic.push({
    x:
      road.left +
      laneWidth * (lane + 0.5),

    y:
      -height - 30,

    width,
    height,
    ownSpeed,
    passed: false,
    image
  });
}

/* =====================================================
   COLLISION
===================================================== */

function overlap(a, b, padding = 0) {
  return (
    Math.abs(a.x - b.x) <
      (a.width + b.width) / 2 - padding &&
    Math.abs(a.y - b.y) <
      (a.height + b.height) / 2 - padding
  );
}

/* =====================================================
   STATUS
===================================================== */

function showStatus(text) {
  chaseStatus.textContent = text;
  chaseStatus.style.opacity = "1";
  statusTimer = 0.8;
}

/* =====================================================
   PARTICLES
===================================================== */

function createSparks(x, y) {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 170,
      vy: Math.random() * 170,
      life: 0.45 + Math.random() * 0.45
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

/* =====================================================
   FINISH
===================================================== */

function finish(win) {
  running = false;

  overlay.style.display = "flex";

  title.className = win ? "win" : "lose";
  title.textContent = win ? "CAPTURED!" : "ESCAPED";

  subtitle.textContent =
    win
      ? "MISSION COMPLETE"
      : "CHASE FAILED";

  if (win) {
    message.innerHTML = `
      Suspect captured.
      <br><br>
      <strong>Score:</strong>
      ${Math.round(score).toLocaleString()}
      <br>
      <strong>Time:</strong>
      ${elapsed.toFixed(1)} seconds
    `;
  } else {
    message.innerHTML = `
      The suspect got away.
      <br><br>
      Avoid collisions,
      build nitro with near misses,
      and keep closing the gap.
    `;
  }

  startBtn.textContent =
    win
      ? "CHASE AGAIN"
      : "TRY AGAIN";
}

/* =====================================================
   UPDATE
===================================================== */

function update(dt) {
  elapsed += dt;

  /* automatic acceleration */

  player.speed = Math.min(
    190,
    player.speed + 7.5 * dt
  );

  /* nitro */

  if (nitroActive > 0) {
    nitroActive -= dt;

    player.speed = Math.min(
      230,
      player.speed + 45 * dt
    );
  }

  /* steering */

  player.x +=
    (player.targetX - player.x) *
    Math.min(1, dt * 10);

  if (player.invincible > 0) {
    player.invincible -= dt;
  }

  roadScroll += player.speed * dt * 2.3;

  const road = roadInfo();

  /* suspect movement */

  robber.phase +=
    dt *
    (1.2 + player.speed / 220);

  const movement = Math.min(
    road.width * 0.27,
    120
  );

  let robberTargetX =
    W / 2 +
    Math.sin(robber.phase) *
    movement;

  if (distanceGap < 90) {
    robberTargetX +=
      Math.sin(robber.phase * 3.2) *
      25;
  }

  robber.x +=
    (robberTargetX - robber.x) *
    dt *
    (distanceGap < 60 ? 2.5 : 1.35);

  robber.x = Math.max(
    road.left + robber.width / 2 + 10,
    Math.min(
      road.right - robber.width / 2 - 10,
      robber.x
    )
  );

  /* suspect stays ahead */

  robber.y = H * 0.16;

  /* close the distance */

  let closingRate =
    4.3 +
    Math.max(
      0,
      player.speed - 100
    ) *
      0.038;

  if (nitroActive > 0) {
    closingRate += 18;
  }

  distanceGap -= closingRate * dt;

  /* =========================================
     VISUAL CHASE POSITION
     Police moves toward suspect as gap closes
  ========================================= */

  const gapRatio = Math.max(
    0,
    Math.min(
      1,
      distanceGap / 240
    )
  );

  const policeFarY = H * 0.84;
  const policeCloseY = H * 0.34;

  player.y =
    policeCloseY +
    gapRatio *
    (policeFarY - policeCloseY);

  /* traffic */

  spawnTimer -= dt;

  const spawnRate = Math.max(
    0.42,
    1.08 - player.speed / 290
  );

  if (spawnTimer <= 0) {
    spawnTraffic();

    spawnTimer =
      spawnRate *
      (0.7 + Math.random() * 0.7);
  }

  for (let i = traffic.length - 1; i >= 0; i--) {
    const car = traffic[i];

    car.y +=
      (
        player.speed * 0.84 -
        car.ownSpeed
      ) *
      dt *
      2.2;

    if (car.y > H + 180) {
      traffic.splice(i, 1);
      continue;
    }

    /* collision */

    if (
      player.invincible <= 0 &&
      overlap(player, car, 10)
    ) {
      player.speed = Math.max(
        70,
        player.speed - 55
      );

      distanceGap += 35;

      nitro = Math.max(
        0,
        nitro - 15
      );

      player.invincible = 0.9;
      shake = 18;

      createSparks(
        player.x,
        player.y
      );

      showStatus(
        "CRASH! SUSPECT PULLS AWAY"
      );

      if (navigator.vibrate) {
        navigator.vibrate([
          40,
          30,
          40
        ]);
      }
    }

    /* near miss */

    if (
      !car.passed &&
      car.y >
        player.y +
        player.height * 0.60
    ) {
      car.passed = true;

      const distance =
        Math.abs(
          car.x - player.x
        );

      const edge =
        (car.width + player.width) / 2;

      if (
        distance > edge - 4 &&
        distance < edge + 30
      ) {
        nitro = Math.min(
          100,
          nitro + 25
        );

        score += 250;

        showStatus(
          "NEAR MISS +250"
        );
      }
    }
  }

  distanceGap = Math.max(
    0,
    Math.min(
      420,
      distanceGap
    )
  );

  /* capture */

  if (distanceGap < 18) {
    catchTimer += dt;
  } else {
    catchTimer = Math.max(
      0,
      catchTimer - dt * 1.5
    );
  }

  if (distanceGap < 55) {
    showStatus("CLOSING IN!");
  }

  if (distanceGap < 25) {
    showStatus("STAY ON HIM!");
  }

  if (catchTimer > 1.4) {
    finish(true);
    return;
  }

  if (distanceGap >= 420) {
    finish(false);
    return;
  }

  score +=
    player.speed *
    dt *
    0.5;

  updateParticles(dt);

  distanceValue.textContent =
    Math.round(distanceGap) + " m";

  speedValue.textContent =
    Math.round(player.speed) + " km/h";

  nitroFill.style.width =
    nitro + "%";

  if (statusTimer > 0) {
    statusTimer -= dt;

    if (statusTimer <= 0) {
      chaseStatus.style.opacity = "0";
    }
  }

  shake *= 0.88;
}

/* =====================================================
   DRAW VEHICLE
===================================================== */

function drawVehicle(car) {
  const img = vehicleImages[car.image];

  if (!img || !img.complete) {
    return;
  }

  ctx.save();

  if (
    car.image === "police" &&
    player.invincible > 0 &&
    Math.floor(player.invincible * 12) % 2 === 0
  ) {
    ctx.globalAlpha = 0.35;
  }

  ctx.shadowColor = "rgba(0,0,0,.55)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 9;

  ctx.drawImage(
    img,
    car.x - car.width / 2,
    car.y - car.height / 2,
    car.width,
    car.height
  );

  ctx.restore();
}

/* =====================================================
   POLICE LIGHT GLOW
===================================================== */

function drawPoliceGlow() {
  const flash =
    Math.floor(
      performance.now() / 150
    ) %
      2 ===
    0;

  const redX =
    flash
      ? player.x - 24
      : player.x + 24;

  const blueX =
    flash
      ? player.x + 24
      : player.x - 24;

  const red =
    ctx.createRadialGradient(
      redX,
      player.y - 15,
      4,
      redX,
      player.y - 15,
      135
    );

  red.addColorStop(
    0,
    "rgba(255,20,50,.40)"
  );

  red.addColorStop(
    1,
    "rgba(255,20,50,0)"
  );

  ctx.fillStyle = red;

  ctx.fillRect(
    player.x - 160,
    player.y - 160,
    320,
    300
  );

  const blue =
    ctx.createRadialGradient(
      blueX,
      player.y - 15,
      4,
      blueX,
      player.y - 15,
      135
    );

  blue.addColorStop(
    0,
    "rgba(20,100,255,.44)"
  );

  blue.addColorStop(
    1,
    "rgba(20,100,255,0)"
  );

  ctx.fillStyle = blue;

  ctx.fillRect(
    player.x - 160,
    player.y - 160,
    320,
    300
  );
}

/* =====================================================
   PARTICLES
===================================================== */

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha =
      Math.min(
        1,
        p.life * 2
      );

    ctx.fillStyle = "#ffc04b";

    ctx.fillRect(
      p.x,
      p.y,
      3,
      9
    );
  }

  ctx.globalAlpha = 1;
}

/* =====================================================
   DRAW WORLD
===================================================== */

function draw() {
  ctx.clearRect(
    0,
    0,
    W,
    H
  );

  const road = roadInfo();

  /* background */

  const sky =
    ctx.createLinearGradient(
      0,
      0,
      0,
      H
    );

  sky.addColorStop(
    0,
    "#071521"
  );

  sky.addColorStop(
    0.55,
    "#142936"
  );

  sky.addColorStop(
    1,
    "#16281f"
  );

  ctx.fillStyle = sky;

  ctx.fillRect(
    0,
    0,
    W,
    H
  );

  /* city silhouettes */

  ctx.fillStyle = "#07111a";

  for (let x = 0; x < W; x += 34) {
    if (
      x > road.left - 20 &&
      x < road.right + 20
    ) {
      continue;
    }

    const height =
      40 +
      ((x * 17) % 120);

    ctx.fillRect(
      x,
      H * 0.27 - height,
      27,
      height
    );

    ctx.fillStyle =
      "rgba(255,210,90,.28)";

    ctx.fillRect(
      x + 7,
      H * 0.27 -
        height +
        12,
      4,
      5
    );

    ctx.fillStyle = "#07111a";
  }

  /* road */

  const roadGradient =
    ctx.createLinearGradient(
      road.left,
      0,
      road.right,
      0
    );

  roadGradient.addColorStop(
    0,
    "#1d2227"
  );

  roadGradient.addColorStop(
    0.5,
    "#34383c"
  );

  roadGradient.addColorStop(
    1,
    "#1d2227"
  );

  ctx.fillStyle = roadGradient;

  ctx.fillRect(
    road.left,
    0,
    road.width,
    H
  );

  /* shoulders */

  ctx.fillStyle = "#bec2c5";

  ctx.fillRect(
    road.left,
    0,
    5,
    H
  );

  ctx.fillRect(
    road.right - 5,
    0,
    5,
    H
  );

  /* lane markings */

  const lanes = 4;
  const laneWidth = road.width / lanes;
  const dashHeight = 42;
  const spacing = 34;

  ctx.fillStyle =
    "rgba(255,255,255,.72)";

  for (let lane = 1; lane < lanes; lane++) {
    const x =
      road.left +
      lane * laneWidth -
      2;

    for (
      let y =
        -(
          roadScroll %
          (dashHeight + spacing)
        );

      y < H;

      y +=
        dashHeight +
        spacing
    ) {
      ctx.fillRect(
        x,
        y,
        4,
        dashHeight
      );
    }
  }

  /* speed streaks */

  if (player.speed > 135) {
    ctx.strokeStyle =
      "rgba(255,255,255,.07)";

    ctx.lineWidth = 2;

    for (let i = 0; i < 18; i++) {
      const x =
        road.left +
        Math.random() *
        road.width;

      const y =
        Math.random() *
        H;

      ctx.beginPath();

      ctx.moveTo(x, y);

      ctx.lineTo(
        x,
        y +
          35 +
          player.speed * 0.15
      );

      ctx.stroke();
    }
  }

  /* suspect marker */

  ctx.fillStyle = "#fa1f34";

  ctx.fillRect(
    robber.x - 34,
    robber.y - robber.height / 2 - 34,
    68,
    24
  );

  ctx.fillStyle = "white";

  ctx.font = "900 11px Arial";
  ctx.textAlign = "center";

  ctx.fillText(
    "SUSPECT",
    robber.x,
    robber.y - robber.height / 2 - 18
  );

  drawPoliceGlow();

  drawVehicle(robber);

  for (const car of traffic) {
    drawVehicle(car);
  }

  drawVehicle(player);

  /* nitro flame */

  if (nitroActive > 0) {
    const gradient =
      ctx.createLinearGradient(
        player.x,
        player.y +
          player.height / 2,
        player.x,
        player.y +
          player.height / 2 +
          55
      );

    gradient.addColorStop(
      0,
      "#4de0ff"
    );

    gradient.addColorStop(
      0.35,
      "#3478ff"
    );

    gradient.addColorStop(
      1,
      "rgba(70,40,255,0)"
    );

    ctx.fillStyle = gradient;

    ctx.beginPath();

    ctx.moveTo(
      player.x - 13,
      player.y +
        player.height / 2 -
        5
    );

    ctx.lineTo(
      player.x,
      player.y +
        player.height / 2 +
        55 +
        Math.random() * 18
    );

    ctx.lineTo(
      player.x + 13,
      player.y +
        player.height / 2 -
        5
    );

    ctx.closePath();

    ctx.fill();
  }

  drawParticles();
}

/* =====================================================
   LOOP
===================================================== */

function gameLoop(time) {
  if (!running) return;

  let dt =
    (time - lastTime) / 1000;

  dt =
    Math.min(
      0.033,
      dt || 0.016
    );

  lastTime = time;

  update(dt);

  if (!running) return;

  ctx.save();

  if (shake > 1) {
    ctx.translate(
      (Math.random() - 0.5) * shake,
      (Math.random() - 0.5) * shake
    );
  }

  draw();

  ctx.restore();

  requestAnimationFrame(gameLoop);
}

/* =====================================================
   INITIAL DRAW
===================================================== */

resetGame();
draw();
