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

let player;
let robber;

let traffic = [];
let particles = [];

let nitro = 0;
let nitroActive = 0;

let score = 0;
let elapsed = 0;

let shake = 0;
let statusTimer = 0;

let spawnTimer = 0;
let roadScroll = 0;

/* world position:
   lower number = farther up road
*/
let policeWorldY = 1000;
let suspectWorldY = 650;

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
  const road = roadInfo();

  policeWorldY = 1000;
  suspectWorldY = 650;

  player = {
    x: W / 2,
    screenY: H * 0.78,
    targetX: W / 2,
    width: 72,
    height: 132,
    speed: 130,
    invincible: 0,
    image: "police"
  };

  robber = {
    x: W / 2,
    screenY: H * 0.28,
    width: 54,
    height: 102,
    speed: 122,
    phase: 0,
    image: "suspect"
  };

  traffic = [];
  particles = [];

  nitro = 0;
  nitroActive = 0;
  score = 0;
  elapsed = 0;

  shake = 0;
  statusTimer = 0;

  spawnTimer = 0.45;
  roadScroll = 0;

  distanceValue.textContent = getDistance() + " m";
  speedValue.textContent = "130 km/h";
  nitroFill.style.width = "0%";

  player.targetX = Math.max(
    road.left + 40,
    Math.min(road.right - 40, player.targetX)
  );
}

/* =====================================================
   DISTANCE
===================================================== */

function getDistance() {
  return Math.max(
    0,
    Math.round((policeWorldY - suspectWorldY) * 0.7)
  );
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
    nitroActive = 2.2;

    showStatus("NITRO BOOST!");

    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }
});

/* =====================================================
   STATUS
===================================================== */

function showStatus(text) {
  chaseStatus.textContent = text;
  chaseStatus.style.opacity = "1";
  statusTimer = 0.8;
}

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
  let speed;

  if (roll < 0.16) {
    image = "truck";
    width = 72;
    height = 155;
    speed = 82 + Math.random() * 14;
  } else {
    const choices = [
      "traffic1",
      "traffic2",
      "traffic3"
    ];

    image =
      choices[
        Math.floor(Math.random() * choices.length)
      ];

    width = 52;
    height = 98;
    speed = 90 + Math.random() * 18;
  }

  /* create traffic ahead of police */
  const worldY =
    policeWorldY -
    500 -
    Math.random() * 700;

  traffic.push({
    x:
      road.left +
      laneWidth * (lane + 0.5),

    worldY,
    width,
    height,
    speed,
    image,
    passed: false
  });
}

/* =====================================================
   COLLISION
===================================================== */

function overlapScreen(a, b) {
  return (
    Math.abs(a.x - b.x) <
      (a.width + b.width) / 2 - 8 &&
    Math.abs(a.screenY - b.screenY) <
      (a.height + b.height) / 2 - 10
  );
}

/* =====================================================
   PARTICLES
===================================================== */

function createSparks(x, y) {
  for (let i = 0; i < 18; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 180,
      vy: Math.random() * 170,
      life: 0.5 + Math.random() * 0.35
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
   CAMERA / SCREEN POSITION
===================================================== */

function worldToScreenY(worldY) {
  const midpoint =
    (policeWorldY + suspectWorldY) / 2;

  const pixelsPerWorldUnit = 0.75;

  return (
    H * 0.5 +
    (worldY - midpoint) *
      pixelsPerWorldUnit
  );
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
      Avoid traffic and use nitro to close the gap.
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

  /* speeds */

  const suspectSpeed = robber.speed;

  let policeSpeed = player.speed;

  if (nitroActive > 0) {
    nitroActive -= dt;
    policeSpeed += 42;
  }

  /* both cars move UP the road */

  suspectWorldY -= suspectSpeed * dt;
  policeWorldY -= policeSpeed * dt;

  /* visually move road */

  roadScroll += policeSpeed * dt * 2.0;

  /* player steering */

  player.x +=
    (player.targetX - player.x) *
    Math.min(1, dt * 10);

  /* robber lane weaving */

  robber.phase += dt * 1.5;

  const road = roadInfo();

  const movement =
    Math.min(
      road.width * 0.26,
      115
    );

  let targetX =
    W / 2 +
    Math.sin(robber.phase) *
      movement;

  /* more aggressive when cop gets close */

  if (getDistance() < 100) {
    targetX +=
      Math.sin(robber.phase * 3.1) *
      26;
  }

  robber.x +=
    (targetX - robber.x) *
    dt *
    1.7;

  robber.x = Math.max(
    road.left + 35,
    Math.min(
      road.right - 35,
      robber.x
    )
  );

  /* calculate screen positions from world */

  player.screenY =
    worldToScreenY(policeWorldY);

  robber.screenY =
    worldToScreenY(suspectWorldY);

  /* keep chase framed nicely */

  const minPoliceY = H * 0.56;
  const maxPoliceY = H * 0.80;

  const minSuspectY = H * 0.16;
  const maxSuspectY = H * 0.42;

  player.screenY = Math.max(
    minPoliceY,
    Math.min(
      maxPoliceY,
      player.screenY
    )
  );

  robber.screenY = Math.max(
    minSuspectY,
    Math.min(
      maxSuspectY,
      robber.screenY
    )
  );

  /* traffic spawning */

  spawnTimer -= dt;

  if (spawnTimer <= 0) {
    spawnTraffic();

    spawnTimer =
      0.42 +
      Math.random() * 0.45;
  }

  /* move traffic UP too */

  for (let i = traffic.length - 1; i >= 0; i--) {
    const car = traffic[i];

    car.worldY -= car.speed * dt;

    car.screenY =
      worldToScreenY(car.worldY);

    /* remove cars far behind */
    if (car.screenY > H + 180) {
      traffic.splice(i, 1);
      continue;
    }

    /* remove cars too far ahead */
    if (car.screenY < -200) {
      traffic.splice(i, 1);
      continue;
    }

    /* collision with police */

    if (
      player.invincible <= 0 &&
      overlapScreen(player, car)
    ) {
      player.speed =
        Math.max(
          105,
          player.speed - 28
        );

      policeWorldY += 85;

      player.invincible = 0.9;
      shake = 18;

      nitro = Math.max(
        0,
        nitro - 20
      );

      createSparks(
        player.x,
        player.screenY
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
      car.screenY >
        player.screenY +
        player.height * 0.55
    ) {
      car.passed = true;

      const horizontalGap =
        Math.abs(
          car.x - player.x
        );

      const edge =
        (car.width + player.width) / 2;

      if (
        horizontalGap > edge - 3 &&
        horizontalGap < edge + 30
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

  if (player.invincible > 0) {
    player.invincible -= dt;
  }

  /* police slowly accelerates */

  player.speed = Math.min(
    150,
    player.speed + 2.4 * dt
  );

  const distance =
    getDistance();

  /* capture */

  if (distance <= 18) {
    finish(true);
    return;
  }

  /* escape condition */

  if (distance >= 520) {
    finish(false);
    return;
  }

  if (distance < 90) {
    showStatus("CLOSING IN!");
  }

  if (distance < 45) {
    showStatus("STAY ON HIM!");
  }

  score +=
    policeSpeed *
    dt *
    0.5;

  updateParticles(dt);

  distanceValue.textContent =
    distance + " m";

  speedValue.textContent =
    Math.round(policeSpeed) + " km/h";

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
  const img =
    vehicleImages[car.image];

  if (!img || !img.complete) {
    return;
  }

  ctx.save();

  ctx.translate(
    car.x,
    car.screenY
  );

  /* artwork faces down, rotate it upward */
  ctx.rotate(Math.PI);

  if (
    car.image === "police" &&
    player.invincible > 0 &&
    Math.floor(player.invincible * 12) % 2 === 0
  ) {
    ctx.globalAlpha = 0.35;
  }

  ctx.shadowColor =
    "rgba(0,0,0,.55)";

  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 8;

  ctx.drawImage(
    img,
    -car.width / 2,
    -car.height / 2,
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
      player.screenY,
      5,
      redX,
      player.screenY,
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
    player.screenY - 150,
    320,
    300
  );

  const blue =
    ctx.createRadialGradient(
      blueX,
      player.screenY,
      5,
      blueX,
      player.screenY,
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
    player.screenY - 150,
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

    ctx.fillStyle =
      "#ffc04b";

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

  ctx.fillStyle =
    "#07111a";

  for (
    let x = 0;
    x < W;
    x += 34
  ) {
    if (
      x > road.left - 20 &&
      x < road.right + 20
    ) {
      continue;
    }

    const buildingHeight =
      40 +
      ((x * 17) % 120);

    ctx.fillRect(
      x,
      H * 0.27 -
        buildingHeight,
      27,
      buildingHeight
    );

    ctx.fillStyle =
      "rgba(255,210,90,.28)";

    ctx.fillRect(
      x + 7,
      H * 0.27 -
        buildingHeight +
        12,
      4,
      5
    );

    ctx.fillStyle =
      "#07111a";
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

  ctx.fillStyle =
    roadGradient;

  ctx.fillRect(
    road.left,
    0,
    road.width,
    H
  );

  /* road edges */

  ctx.fillStyle =
    "#bec2c5";

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
  const laneWidth =
    road.width / lanes;

  const dashHeight = 42;
  const spacing = 34;

  ctx.fillStyle =
    "rgba(255,255,255,.72)";

  for (
    let lane = 1;
    lane < lanes;
    lane++
  ) {
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

  /* suspect label */

  ctx.fillStyle =
    "#fa1f34";

  ctx.fillRect(
    robber.x - 34,
    robber.screenY -
      robber.height / 2 -
      34,
    68,
    24
  );

  ctx.fillStyle =
    "white";

  ctx.font =
    "900 11px Arial";

  ctx.textAlign =
    "center";

  ctx.fillText(
    "SUSPECT",
    robber.x,
    robber.screenY -
      robber.height / 2 -
      18
  );

  /* traffic first */

  for (const car of traffic) {
    drawVehicle(car);
  }

  /* suspect */

  drawVehicle(robber);

  /* police light glow */

  drawPoliceGlow();

  /* police */

  drawVehicle(player);

  /* nitro flame */

  if (nitroActive > 0) {
    const gradient =
      ctx.createLinearGradient(
        player.x,
        player.screenY +
          player.height / 2,
        player.x,
        player.screenY +
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

    ctx.fillStyle =
      gradient;

    ctx.beginPath();

    ctx.moveTo(
      player.x - 13,
      player.screenY +
        player.height / 2 -
        4
    );

    ctx.lineTo(
      player.x,
      player.screenY +
        player.height / 2 +
        55 +
        Math.random() * 18
    );

    ctx.lineTo(
      player.x + 13,
      player.screenY +
        player.height / 2 -
        4
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

  dt = Math.min(
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
