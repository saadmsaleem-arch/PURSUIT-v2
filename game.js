"use strict";
/* ================================
   VEHICLE ARTWORK
================================ */

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

const distanceValue =
  document.getElementById("distanceValue");

const speedValue =
  document.getElementById("speedValue");

const nitroFill =
  document.getElementById("nitroFill");

const nitroUI =
  document.getElementById("nitroUI");

const chaseStatus =
  document.getElementById("chaseStatus");

/* =====================================================
   SCREEN
===================================================== */

let W = 0;
let H = 0;
let DPR = 1;

function resize() {
  DPR = Math.min(
    window.devicePixelRatio || 1,
    2
  );

  W = window.innerWidth;
  H = window.innerHeight;

  canvas.width = W * DPR;
  canvas.height = H * DPR;

  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(
    DPR,
    0,
    0,
    DPR,
    0,
    0
  );
}

window.addEventListener(
  "resize",
  resize
);

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
  const width =
    Math.min(
      W * 0.84,
      540
    );

  return {
    left:
      (W - width) / 2,

    right:
      (W + width) / 2,

    width
  };
}

/* =====================================================
   RESET
===================================================== */

function resetGame() {
  player = {
    x: W / 2,
    y: H * 0.80,

    targetX: W / 2,

    width: 48,
    height: 88,

    speed: 82,

    invincible: 0
  };

  robber = {
    x: W / 2,
    y: H * 0.22,

    width: 45,
    height: 82,

    phase: 0
  };

  traffic = [];

  particles = [];

  distanceGap = 240;

  nitro = 0;

  nitroActive = 0;

  catchTimer = 0;

  elapsed = 0;

  score = 0;

  spawnTimer = 0.4;

  roadScroll = 0;

  shake = 0;
}

/* =====================================================
   START
===================================================== */

function startGame() {
  resetGame();

  overlay.style.display =
    "none";

  running = true;

  lastTime =
    performance.now();

  requestAnimationFrame(
    gameLoop
  );
}

startBtn.addEventListener(
  "click",
  startGame
);

/* =====================================================
   STEERING
===================================================== */

let pointerDown = false;

function steer(clientX) {
  if (!running) {
    return;
  }

  const road =
    roadInfo();

  player.targetX =
    Math.max(
      road.left +
        player.width / 2 +
        8,

      Math.min(
        road.right -
          player.width / 2 -
          8,

        clientX
      )
    );
}

canvas.addEventListener(
  "pointerdown",
  event => {
    pointerDown = true;
    steer(event.clientX);
  }
);

canvas.addEventListener(
  "pointermove",
  event => {
    if (pointerDown) {
      steer(event.clientX);
    }
  }
);

window.addEventListener(
  "pointerup",
  () => {
    pointerDown = false;
  }
);

/* =====================================================
   NITRO
===================================================== */

nitroUI.addEventListener(
  "pointerdown",
  event => {
    event.preventDefault();

    if (
      running &&
      nitro >= 100
    ) {
      nitro = 0;

      nitroActive =
        2.4;

      showStatus(
        "NITRO BOOST!"
      );

      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    }
  }
);

/* =====================================================
   TRAFFIC
===================================================== */

function spawnTraffic() {
  const road =
    roadInfo();

  const lanes = 4;

  const laneWidth =
    road.width / lanes;

  const lane =
    Math.floor(
      Math.random() *
      lanes
    );

  const type =
    Math.random() < 0.18
      ? "truck"
      : "car";

  const width =
    type === "truck"
      ? 52
      : 42;

  const height =
    type === "truck"
      ? 105
      : 78;

  const colors = [
    "#dcdfe4",
    "#d09b32",
    "#447a9c",
    "#739460",
    "#9b617d",
    "#404852",
    "#bc3f47"
  ];

  traffic.push({
    x:
      road.left +
      laneWidth *
        (lane + 0.5),

    y:
      -height - 30,

    width,
    height,

    ownSpeed:
      25 +
      Math.random() *
      35,

    passed: false,

    color:
      colors[
        Math.floor(
          Math.random() *
          colors.length
        )
      ],

    type
  });
}

/* =====================================================
   COLLISION
===================================================== */

function overlap(
  a,
  b,
  padding = 0
) {
  return (
    Math.abs(
      a.x - b.x
    ) <
      (
        a.width +
        b.width
      ) /
        2 -
        padding &&

    Math.abs(
      a.y - b.y
    ) <
      (
        a.height +
        b.height
      ) /
        2 -
        padding
  );
}

/* =====================================================
   STATUS
===================================================== */

function showStatus(text) {
  chaseStatus.textContent =
    text;

  chaseStatus.style.opacity =
    "1";

  statusTimer =
    0.8;
}

/* =====================================================
   PARTICLES
===================================================== */

function createSparks(
  x,
  y
) {
  for (
    let i = 0;
    i < 16;
    i++
  ) {
    particles.push({
      x,
      y,

      vx:
        (Math.random() - 0.5) *
        160,

      vy:
        Math.random() *
        150,

      life:
        0.5 +
        Math.random() *
        0.4
    });
  }
}

function updateParticles(dt) {
  for (
    let i =
      particles.length - 1;

    i >= 0;

    i--
  ) {
    const p =
      particles[i];

    p.x +=
      p.vx * dt;

    p.y +=
      p.vy * dt;

    p.life -=
      dt;

    if (
      p.life <= 0
    ) {
      particles.splice(
        i,
        1
      );
    }
  }
}

/* =====================================================
   FINISH
===================================================== */

function finish(win) {
  running = false;

  overlay.style.display =
    "flex";

  title.className =
    win
      ? "win"
      : "lose";

  title.textContent =
    win
      ? "CAPTURED!"
      : "ESCAPED";

  subtitle.textContent =
    win
      ? "MISSION COMPLETE"
      : "CHASE FAILED";

  if (win) {
    message.innerHTML =
      `
      Suspect captured.
      <br><br>
      <strong>Score:</strong>
      ${Math.round(score).toLocaleString()}
      <br>
      <strong>Time:</strong>
      ${elapsed.toFixed(1)} seconds
      `;
  } else {
    message.innerHTML =
      `
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

  player.speed =
    Math.min(
      190,

      player.speed +
        7.5 * dt
    );

  /* nitro */

  if (
    nitroActive > 0
  ) {
    nitroActive -=
      dt;

    player.speed =
      Math.min(
        230,
        player.speed +
          45 * dt
      );
  }

  /* steering smoothing */

  player.x +=
    (
      player.targetX -
      player.x
    ) *
    Math.min(
      1,
      dt * 10
    );

  if (
    player.invincible > 0
  ) {
    player.invincible -=
      dt;
  }

  roadScroll +=
    player.speed *
    dt *
    2.3;

  /* robber movement */

  robber.phase +=
    dt *
    (
      1.2 +
      player.speed /
        220
    );

  const road =
    roadInfo();

  let movement =
    Math.min(
      road.width * 0.27,
      125
    );

  let target =
    W / 2 +
    Math.sin(
      robber.phase
    ) *
      movement;

  /* robber panics when cop gets close */

  if (
    distanceGap < 90
  ) {
    target +=
      Math.sin(
        robber.phase *
          3.2
      ) *
      25;
  }

  robber.x +=
    (
      target -
      robber.x
    ) *
    dt *
    (
      distanceGap < 60
        ? 2.4
        : 1.25
    );

  robber.x =
    Math.max(
      road.left + 30,

      Math.min(
        road.right - 30,
        robber.x
      )
    );

  /* police catches robber slowly */

  let closingRate =
    4.3 +
    Math.max(
      0,
      player.speed - 100
    ) *
      0.038;

  if (
    nitroActive > 0
  ) {
    closingRate +=
      18;
  }

  distanceGap -=
    closingRate *
    dt;

  /* traffic spawning */

  spawnTimer -=
    dt;

  const spawnRate =
    Math.max(
      0.42,
      1.08 -
        player.speed /
          290
    );

  if (
    spawnTimer <= 0
  ) {
    spawnTraffic();

    spawnTimer =
      spawnRate *
      (
        0.7 +
        Math.random() *
          0.7
      );
  }

  /* traffic movement */

  for (
    let i =
      traffic.length - 1;

    i >= 0;

    i--
  ) {
    const car =
      traffic[i];

    car.y +=
      (
        player.speed *
          0.84 -
        car.ownSpeed
      ) *
      dt *
      2.2;

    if (
      car.y >
      H + 150
    ) {
      traffic.splice(
        i,
        1
      );

      continue;
    }

    /* collision */

    if (
      player.invincible <= 0 &&
      overlap(
        player,
        car,
        7
      )
    ) {
      player.speed =
        Math.max(
          70,
          player.speed -
            55
        );

      distanceGap +=
        30;

      nitro =
        Math.max(
          0,
          nitro - 15
        );

      player.invincible =
        0.9;

      shake =
        18;

      createSparks(
        player.x,
        player.y
      );

      showStatus(
        "CRASH! +30 m"
      );

      if (
        navigator.vibrate
      ) {
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
          player.height *
            0.60
    ) {
      car.passed = true;

      const distance =
        Math.abs(
          car.x -
          player.x
        );

      const edge =
        (
          car.width +
          player.width
        ) /
        2;

      if (
        distance >
          edge - 3 &&
        distance <
          edge + 28
      ) {
        nitro =
          Math.min(
            100,
            nitro + 25
          );

        score +=
          250;

        showStatus(
          "NEAR MISS +250"
        );
      }
    }
  }

  distanceGap =
    Math.max(
      0,
      Math.min(
        420,
        distanceGap
      )
    );

  /* catching suspect */

  if (
    distanceGap <
    16
  ) {
    catchTimer +=
      dt;
  } else {
    catchTimer =
      Math.max(
        0,
        catchTimer -
          dt * 1.5
      );
  }

  if (
    distanceGap <
    30
  ) {
    showStatus(
      "STAY CLOSE!"
    );
  }

  if (
    catchTimer >
    1.3
  ) {
    finish(true);
    return;
  }

  if (
    distanceGap >=
    420
  ) {
    finish(false);
    return;
  }

  score +=
    player.speed *
    dt *
    0.5;

  updateParticles(dt);

  distanceValue.textContent =
    Math.round(
      distanceGap
    ) +
    " m";

  speedValue.textContent =
    Math.round(
      player.speed
    ) +
    " km/h";

  nitroFill.style.width =
    nitro + "%";

  if (
    statusTimer > 0
  ) {
    statusTimer -=
      dt;

    if (
      statusTimer <= 0
    ) {
      chaseStatus.style.opacity =
        "0";
    }
  }

  shake *=
    0.88;
}

/* =====================================================
   DRAW HELPERS
===================================================== */

function roundedRect(
  x,
  y,
  width,
  height,
  radius
) {
  radius =
    Math.min(
      radius,
      width / 2,
      height / 2
    );

  ctx.beginPath();

  ctx.moveTo(
    x + radius,
    y
  );

  ctx.arcTo(
    x + width,
    y,
    x + width,
    y + height,
    radius
  );

  ctx.arcTo(
    x + width,
    y + height,
    x,
    y + height,
    radius
  );

  ctx.arcTo(
    x,
    y + height,
    x,
    y,
    radius
  );

  ctx.arcTo(
    x,
    y,
    x + width,
    y,
    radius
  );

  ctx.closePath();
}

/* =====================================================
   DRAW CAR
===================================================== */

function drawCar(
  car,
  color,
  police = false,
  suspect = false
) {
  ctx.save();

  ctx.translate(
    car.x,
    car.y
  );

  if (
    police &&
    player.invincible > 0 &&
    Math.floor(
      player.invincible *
      12
    ) %
      2 ===
      0
  ) {
    ctx.globalAlpha =
      0.35;
  }

  /* shadow */

  ctx.fillStyle =
    "rgba(0,0,0,.38)";

  roundedRect(
    -car.width / 2 + 5,
    -car.height / 2 + 9,
    car.width,
    car.height,
    10
  );

  ctx.fill();

  /* body */

  const bodyGradient =
    ctx.createLinearGradient(
      -car.width / 2,
      0,
      car.width / 2,
      0
    );

  bodyGradient.addColorStop(
    0,
    "#111820"
  );

  bodyGradient.addColorStop(
    0.20,
    color
  );

  bodyGradient.addColorStop(
    0.50,
    color
  );

  bodyGradient.addColorStop(
    0.80,
    color
  );

  bodyGradient.addColorStop(
    1,
    "#0e151c"
  );

  ctx.fillStyle =
    bodyGradient;

  roundedRect(
    -car.width / 2,
    -car.height / 2,
    car.width,
    car.height,
    11
  );

  ctx.fill();

  /* windshield */

  const glass =
    ctx.createLinearGradient(
      0,
      -30,
      0,
      20
    );

  glass.addColorStop(
    0,
    "#86aebe"
  );

  glass.addColorStop(
    1,
    "#182c36"
  );

  ctx.fillStyle =
    glass;

  roundedRect(
    -car.width * 0.31,
    -car.height * 0.28,
    car.width * 0.62,
    car.height * 0.25,
    5
  );

  ctx.fill();

  /* rear glass */

  ctx.fillStyle =
    "#172a33";

  roundedRect(
    -car.width * 0.31,
    car.height * 0.09,
    car.width * 0.62,
    car.height * 0.22,
    5
  );

  ctx.fill();

  /* headlights */

  ctx.fillStyle =
    "#fff7c6";

  ctx.fillRect(
    -car.width * 0.35,
    -car.height * 0.45,
    9,
    5
  );

  ctx.fillRect(
    car.width * 0.35 - 9,
    -car.height * 0.45,
    9,
    5
  );

  /* taillights */

  ctx.fillStyle =
    "#ff3444";

  ctx.fillRect(
    -car.width * 0.35,
    car.height * 0.41,
    9,
    6
  );

  ctx.fillRect(
    car.width * 0.35 - 9,
    car.height * 0.41,
    9,
    6
  );

  /* police */

  if (
    police
  ) {
    ctx.fillStyle =
      "#f4f4f4";

    ctx.fillRect(
      -car.width * 0.43,
      -8,
      car.width * 0.86,
      17
    );

    ctx.fillStyle =
      "#17364c";

    ctx.font =
      "900 8px Arial";

    ctx.textAlign =
      "center";

    ctx.fillText(
      "POLICE",
      0,
      4
    );

    const flash =
      Math.floor(
        performance.now() /
        160
      ) %
        2 ===
      0;

    ctx.shadowBlur =
      20;

    ctx.shadowColor =
      flash
        ? "#ff2343"
        : "#287cff";

    ctx.fillStyle =
      flash
        ? "#ff2343"
        : "#287cff";

    ctx.fillRect(
      -14,
      -16,
      13,
      6
    );

    ctx.shadowColor =
      flash
        ? "#287cff"
        : "#ff2343";

    ctx.fillStyle =
      flash
        ? "#287cff"
        : "#ff2343";

    ctx.fillRect(
      1,
      -16,
      13,
      6
    );

    ctx.shadowBlur = 0;
  }

  if (
    suspect
  ) {
    ctx.fillStyle =
      "#111";

    ctx.fillRect(
      -15,
      -6,
      30,
      9
    );
  }

  ctx.restore();
}

/* =====================================================
   POLICE LIGHT GLOW
===================================================== */

function drawPoliceGlow() {
  const flash =
    Math.floor(
      performance.now() /
      160
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
      player.y,
      4,
      redX,
      player.y,
      110
    );

  red.addColorStop(
    0,
    "rgba(255,20,50,.38)"
  );

  red.addColorStop(
    1,
    "rgba(255,20,50,0)"
  );

  ctx.fillStyle =
    red;

  ctx.fillRect(
    player.x - 145,
    player.y - 130,
    290,
    260
  );

  const blue =
    ctx.createRadialGradient(
      blueX,
      player.y,
      4,
      blueX,
      player.y,
      110
    );

  blue.addColorStop(
    0,
    "rgba(20,100,255,.42)"
  );

  blue.addColorStop(
    1,
    "rgba(20,100,255,0)"
  );

  ctx.fillStyle =
    blue;

  ctx.fillRect(
    player.x - 145,
    player.y - 130,
    290,
    260
  );
}

/* =====================================================
   PARTICLES DRAW
===================================================== */

function drawParticles() {
  for (
    const p of particles
  ) {
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
      8
    );
  }

  ctx.globalAlpha =
    1;
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

  const road =
    roadInfo();

  /* dark city background */

  const sky =
    ctx.createLinearGradient(
      0,
      0,
      0,
      H
    );

  sky.addColorStop(
    0,
    "#081b2b"
  );

  sky.addColorStop(
    0.50,
    "#122534"
  );

  sky.addColorStop(
    1,
    "#17261f"
  );

  ctx.fillStyle =
    sky;

  ctx.fillRect(
    0,
    0,
    W,
    H
  );

  /* buildings */

  ctx.fillStyle =
    "#08121b";

  for (
    let x = 0;
    x < W;
    x += 34
  ) {
    if (
      x >
        road.left - 20 &&
      x <
        road.right + 20
    ) {
      continue;
    }

    const height =
      40 +
      (
        (x * 17) %
        110
      );

    ctx.fillRect(
      x,
      H * 0.26 - height,
      27,
      height
    );

    ctx.fillStyle =
      "rgba(255,210,90,.3)";

    ctx.fillRect(
      x + 7,
      H * 0.26 -
        height +
        12,
      4,
      5
    );

    ctx.fillStyle =
      "#08121b";
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
    "#20252a"
  );

  roadGradient.addColorStop(
    0.5,
    "#34383d"
  );

  roadGradient.addColorStop(
    1,
    "#20252a"
  );

  ctx.fillStyle =
    roadGradient;

  ctx.fillRect(
    road.left,
    0,
    road.width,
    H
  );

  /* shoulders */

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

  /* lane lines */

  const lanes = 4;

  const laneWidth =
    road.width / lanes;

  const dashHeight =
    42;

  const spacing =
    34;

  ctx.fillStyle =
    "rgba(255,255,255,.7)";

  for (
    let lane = 1;
    lane < lanes;
    lane++
  ) {
    const x =
      road.left +
      lane *
        laneWidth -
      2;

    for (
      let y =
        -(
          roadScroll %
          (
            dashHeight +
            spacing
          )
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

  /* motion lines */

  if (
    player.speed >
    135
  ) {
    ctx.strokeStyle =
      "rgba(255,255,255,.07)";

    ctx.lineWidth =
      2;

    for (
      let i = 0;
      i < 18;
      i++
    ) {
      const x =
        road.left +
        Math.random() *
          road.width;

      const y =
        Math.random() *
        H;

      ctx.beginPath();

      ctx.moveTo(
        x,
        y
      );

      ctx.lineTo(
        x,
        y +
          35 +
          player.speed *
            0.15
      );

      ctx.stroke();
    }
  }

  /* robber marker */

  ctx.fillStyle =
    "#ff253c";

  roundedRect(
    robber.x - 34,
    robber.y - 60,
    68,
    24,
    5
  );

  ctx.fill();

  ctx.fillStyle =
    "white";

  ctx.font =
    "900 11px Arial";

  ctx.textAlign =
    "center";

  ctx.fillText(
    "SUSPECT",
    robber.x,
    robber.y - 44
  );

  /* police light reflections */

  drawPoliceGlow();

  /* cars */

  drawCar(
    robber,
    "#c52732",
    false,
    true
  );

  for (
    const car of traffic
  ) {
    drawCar(
      car,
      car.color,
      false,
      false
    );
  }

  drawCar(
    player,
    "#183f60",
    true,
    false
  );

  /* nitro flame */

  if (
    nitroActive > 0
  ) {
    const gradient =
      ctx.createLinearGradient(
        player.x,
        player.y +
          player.height /
            2,
        player.x,
        player.y +
          player.height /
            2 +
          45
      );

    gradient.addColorStop(
      0,
      "#43c8ff"
    );

    gradient.addColorStop(
      0.5,
      "#4169ff"
    );

    gradient.addColorStop(
      1,
      "rgba(73,70,255,0)"
    );

    ctx.fillStyle =
      gradient;

    ctx.beginPath();

    ctx.moveTo(
      player.x - 11,
      player.y +
        player.height /
          2
    );

    ctx.lineTo(
      player.x,
      player.y +
        player.height /
          2 +
        45 +
        Math.random() *
          16
    );

    ctx.lineTo(
      player.x + 11,
      player.y +
        player.height /
          2
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
  if (
    !running
  ) {
    return;
  }

  let dt =
    (
      time -
      lastTime
    ) /
    1000;

  dt =
    Math.min(
      0.033,
      dt || 0.016
    );

  lastTime =
    time;

  update(dt);

  if (
    !running
  ) {
    return;
  }

  ctx.save();

  if (
    shake > 1
  ) {
    ctx.translate(
      (Math.random() - 0.5) *
        shake,

      (Math.random() - 0.5) *
        shake
    );
  }

  draw();

  ctx.restore();

  requestAnimationFrame(
    gameLoop
  );
}

/* =====================================================
   INITIAL DRAW
===================================================== */

resetGame();
draw();
