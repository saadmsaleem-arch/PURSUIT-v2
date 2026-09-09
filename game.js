"use strict";

/* =====================================================
   ASSETS
===================================================== */

const vehicleImages = {};
const environmentImages = {};

function loadImage(store, name, file) {
  const img = new Image();
  img.src = file;
  store[name] = img;
}

/* Vehicles */
loadImage(vehicleImages, "police", "police.png");
loadImage(vehicleImages, "suspect", "suspect.png");
loadImage(vehicleImages, "traffic1", "traffic1.png");
loadImage(vehicleImages, "traffic2", "traffic2.png");
loadImage(vehicleImages, "traffic3", "traffic3.png");
loadImage(vehicleImages, "truck", "truck.png");

/* Environments */
loadImage(environmentImages, "city", "city.jpg");
loadImage(environmentImages, "highway", "highway.jpg");
loadImage(environmentImages, "rain", "rain.jpg");
loadImage(environmentImages, "snow", "snow.jpg");
loadImage(environmentImages, "desert", "desert.jpg");
loadImage(environmentImages, "tunnel", "tunnel.jpg");

/* =====================================================
   SOUND
===================================================== */

const sounds = {
  siren: new Audio("siren.mp3"),
  engine: new Audio("engine.mp3"),
  crash: new Audio("crash.mp3"),
  nitro: new Audio("nitro.mp3"),
  nearMiss: new Audio("near-miss.mp3"),
  capture: new Audio("capture.mp3")
};

sounds.siren.loop = true;
sounds.engine.loop = true;

sounds.siren.volume = 0.30;
sounds.engine.volume = 0.24;
sounds.crash.volume = 0.75;
sounds.nitro.volume = 0.75;
sounds.nearMiss.volume = 0.55;
sounds.capture.volume = 0.80;

let soundEnabled = true;

function playSound(sound) {
  if (!soundEnabled) return;

  try {
    sound.currentTime = 0;
    sound.play().catch(() => {});
  } catch (error) {}
}

function startDrivingSounds() {
  if (!soundEnabled) return;

  sounds.siren.currentTime = 0;
  sounds.engine.currentTime = 0;

  sounds.siren.play().catch(() => {});
  sounds.engine.play().catch(() => {});
}

function stopDrivingSounds() {
  sounds.siren.pause();
  sounds.engine.pause();
}

/* =====================================================
   ENVIRONMENTS
===================================================== */

const environments = {
  city: {
    name: "CITY NIGHT",
    grip: 1.00,
    trafficRate: 1.00,
    weather: "clear"
  },

  highway: {
    name: "HIGHWAY DAY",
    grip: 1.05,
    trafficRate: 0.82,
    weather: "clear"
  },

  rain: {
    name: "HEAVY RAIN",
    grip: 0.82,
    trafficRate: 0.92,
    weather: "rain"
  },

  snow: {
    name: "SNOW",
    grip: 0.72,
    trafficRate: 0.76,
    weather: "snow"
  },

  desert: {
    name: "DESERT",
    grip: 0.92,
    trafficRate: 0.72,
    weather: "dust"
  },

  tunnel: {
    name: "TUNNEL",
    grip: 1.00,
    trafficRate: 1.05,
    weather: "tunnel"
  }
};

let selectedEnvironment = "city";

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
const soundToggle = document.getElementById("soundToggle");

const distanceValue = document.getElementById("distanceValue");
const speedValue = document.getElementById("speedValue");

const environmentBadge = document.getElementById("environmentBadge");

const chaseStatus = document.getElementById("chaseStatus");

const nitroUI = document.getElementById("nitroUI");
const nitroFill = document.getElementById("nitroFill");
const nitroState = document.getElementById("nitroState");

const envButtons = document.querySelectorAll(".envButton");

/* =====================================================
   ENVIRONMENT BUTTONS
===================================================== */

envButtons.forEach(button => {
  button.addEventListener("click", () => {
    envButtons.forEach(btn => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    selectedEnvironment = button.dataset.env;

    message.innerHTML =
      `<strong>${environments[selectedEnvironment].name}</strong><br>
      Catch the suspect before they escape.`;
  });
});

/* =====================================================
   SOUND TOGGLE
===================================================== */

soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;

  soundToggle.textContent =
    soundEnabled ? "🔊" : "🔇";

  if (!soundEnabled) {
    stopDrivingSounds();
  } else if (running) {
    startDrivingSounds();
  }
});

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

  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);

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

let elapsed = 0;
let score = 0;

let shake = 0;
let statusTimer = 0;

let spawnTimer = 0;
let roadScroll = 0;

let policeWorldY = 1000;
let suspectWorldY = 650;

let nearMisses = 0;

/* =====================================================
   WEATHER PARTICLES
===================================================== */

let rainDrops = [];
let snowFlakes = [];
let dustParticles = [];

function createWeatherParticles() {
  rainDrops = [];
  snowFlakes = [];
  dustParticles = [];

  for (let i = 0; i < 110; i++) {
    rainDrops.push({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 650 + Math.random() * 450,
      length: 16 + Math.random() * 22
    });
  }

  for (let i = 0; i < 85; i++) {
    snowFlakes.push({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 45 + Math.random() * 85,
      drift: -18 + Math.random() * 36,
      size: 1 + Math.random() * 3
    });
  }

  for (let i = 0; i < 50; i++) {
    dustParticles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 80 + Math.random() * 120,
      length: 25 + Math.random() * 55
    });
  }
}

/* =====================================================
   ROAD / LANES
===================================================== */

function roadInfo() {
  const width = Math.min(
    W * 0.78,
    500
  );

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
  policeWorldY = 1000;
  suspectWorldY = 650;

  player = {
    x: W / 2,
    screenY: H * 0.76,

    targetX: W / 2,

    width: 72,
    height: 132,

    speed: 130,

    invincible: 0,

    image: "police"
  };

  robber = {
    x: W / 2,
    screenY: H * 0.27,

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

  nearMisses = 0;

  distanceValue.textContent =
    getDistance() + " m";

  speedValue.textContent =
    "130 km/h";

  environmentBadge.textContent =
    environments[selectedEnvironment].name;

  nitroFill.style.width = "0%";

  nitroState.textContent = "BUILDING";
  nitroUI.classList.remove("ready");

  createWeatherParticles();
}

/* =====================================================
   DISTANCE
===================================================== */

function getDistance() {
  return Math.max(
    0,
    Math.round(
      (policeWorldY - suspectWorldY) *
      0.7
    )
  );
}

/* =====================================================
   START
===================================================== */

function startGame() {
  resetGame();

  title.className = "";

  overlay.style.display = "none";

  running = true;

  lastTime = performance.now();

  startDrivingSounds();

  requestAnimationFrame(gameLoop);
}

startBtn.addEventListener("click", startGame);

/* =====================================================
   TOUCH / MOUSE CONTROLS
===================================================== */

let pointerDown = false;

let gestureStartX = 0;
let gestureStartY = 0;
let gestureStartTime = 0;

function steer(clientX) {
  if (!running) return;

  const road = roadInfo();

  player.targetX = Math.max(
    road.left +
      player.width / 2 +
      10,

    Math.min(
      road.right -
        player.width / 2 -
        10,

      clientX
    )
  );
}

canvas.addEventListener("pointerdown", event => {
  if (!running) return;

  pointerDown = true;

  gestureStartX = event.clientX;
  gestureStartY = event.clientY;
  gestureStartTime = performance.now();

  steer(event.clientX);
});

canvas.addEventListener("pointermove", event => {
  if (!pointerDown || !running) return;

  steer(event.clientX);
});

window.addEventListener("pointerup", event => {
  if (!pointerDown) return;

  pointerDown = false;

  if (!running) return;

  const dx =
    event.clientX - gestureStartX;

  const dy =
    event.clientY - gestureStartY;

  const duration =
    performance.now() - gestureStartTime;

  const verticalEnough =
    Math.abs(dy) >
    Math.abs(dx) * 1.15;

  const swipeUp =
    dy < -55 &&
    verticalEnough &&
    duration < 700;

  if (swipeUp) {
    activateNitro();
  }
});

/* =====================================================
   NITRO
===================================================== */

function activateNitro() {
  if (!running) return;

  if (nitro < 100) {
    showStatus("NITRO NOT READY");

    return;
  }

  nitro = 0;
  nitroActive = 2.25;

  nitroUI.classList.remove("ready");

  nitroState.textContent = "BOOSTING";

  playSound(sounds.nitro);

  showStatus("NITRO BOOST!");

  if (navigator.vibrate) {
    navigator.vibrate(30);
  }
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
   TRAFFIC
===================================================== */

function spawnTraffic() {
  const road = roadInfo();

  const lanes = 4;
  const laneWidth = road.width / lanes;

  const lane =
    Math.floor(
      Math.random() * lanes
    );

  const roll = Math.random();

  let image;
  let width;
  let height;
  let speed;

  if (roll < 0.16) {
    image = "truck";

    width = 72;
    height = 155;

    speed =
      82 +
      Math.random() * 14;
  } else {
    const choices = [
      "traffic1",
      "traffic2",
      "traffic3"
    ];

    image =
      choices[
        Math.floor(
          Math.random() *
          choices.length
        )
      ];

    width = 52;
    height = 98;

    speed =
      90 +
      Math.random() * 18;
  }

  let spawnWorldY =
    policeWorldY -
    470 -
    Math.random() * 700;

  /*
    Reduce vehicles spawning directly
    on top of one another.
  */

  const tooClose =
    traffic.some(car =>
      Math.abs(
        car.worldY -
        spawnWorldY
      ) < 130 &&
      Math.abs(
        car.x -
        (
          road.left +
          laneWidth *
          (lane + 0.5)
        )
      ) < laneWidth * 0.55
    );

  if (tooClose) return;

  traffic.push({
    x:
      road.left +
      laneWidth *
      (lane + 0.5),

    worldY: spawnWorldY,

    screenY: -100,

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
      (a.width + b.width) / 2 -
        9 &&

    Math.abs(
      a.screenY -
      b.screenY
    ) <
      (a.height + b.height) / 2 -
        12
  );
}

/* =====================================================
   PARTICLES
===================================================== */

function createSparks(x, y) {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x,
      y,

      vx:
        (Math.random() - 0.5) *
        190,

      vy:
        Math.random() *
        180,

      life:
        0.45 +
        Math.random() *
        0.4
    });
  }
}

function updateParticles(dt) {
  for (
    let i = particles.length - 1;
    i >= 0;
    i--
  ) {
    const p = particles[i];

    p.x +=
      p.vx * dt;

    p.y +=
      p.vy * dt;

    p.life -= dt;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

/* =====================================================
   CAMERA
===================================================== */

function worldToScreenY(worldY) {
  const midpoint =
    (
      policeWorldY +
      suspectWorldY
    ) / 2;

  return (
    H * 0.50 +
    (
      worldY -
      midpoint
    ) * 0.75
  );
}

/* =====================================================
   END GAME
===================================================== */

function finish(win) {
  running = false;

  stopDrivingSounds();

  if (win) {
    playSound(sounds.capture);
  }

  overlay.style.display = "flex";

  title.className =
    win ? "win" : "lose";

  title.textContent =
    win
      ? "CAPTURED!"
      : "ESCAPED";

  subtitle.textContent =
    win
      ? "MISSION COMPLETE"
      : "CHASE FAILED";

  if (win) {
    message.innerHTML = `
      <strong>${environments[selectedEnvironment].name}</strong>
      <br><br>

      Score:
      <strong>${Math.round(score).toLocaleString()}</strong>

      &nbsp; • &nbsp;

      Near Misses:
      <strong>${nearMisses}</strong>

      <br>

      Time:
      <strong>${elapsed.toFixed(1)} sec</strong>
    `;
  } else {
    message.innerHTML = `
      The suspect got away.
      <br><br>
      Pick a location and try again.
    `;
  }

  startBtn.textContent =
    win
      ? "NEXT CHASE"
      : "TRY AGAIN";
}

/* =====================================================
   UPDATE
===================================================== */

function update(dt) {
  elapsed += dt;

  const environment =
    environments[selectedEnvironment];

  const suspectSpeed =
    robber.speed;

  let policeSpeed =
    player.speed;

  if (nitroActive > 0) {
    nitroActive -= dt;

    policeSpeed += 46;

    if (nitroActive <= 0) {
      nitroState.textContent =
        "BUILDING";
    }
  }

  /*
    Both chase vehicles genuinely travel
    forward/up the road.
  */

  suspectWorldY -=
    suspectSpeed * dt;

  policeWorldY -=
    policeSpeed * dt;

  roadScroll +=
    policeSpeed *
    dt *
    2.2;

  /* Engine pitch */

  sounds.engine.playbackRate =
    Math.max(
      0.85,
      Math.min(
        1.30,
        policeSpeed / 130
      )
    );

  /* Steering */

  player.x +=
    (
      player.targetX -
      player.x
    ) *
    Math.min(
      1,
      dt *
      10 *
      environment.grip
    );

  /* Suspect movement */

  robber.phase +=
    dt * 1.45;

  const road =
    roadInfo();

  const movement =
    Math.min(
      road.width * 0.26,
      115
    );

  let targetX =
    W / 2 +
    Math.sin(
      robber.phase
    ) *
      movement;

  /*
    Suspect becomes more erratic
    as police closes in.
  */

  if (getDistance() < 100) {
    targetX +=
      Math.sin(
        robber.phase * 3.2
      ) *
        28;
  }

  robber.x +=
    (
      targetX -
      robber.x
    ) *
    dt *
    1.7;

  robber.x =
    Math.max(
      road.left + 35,

      Math.min(
        road.right - 35,
        robber.x
      )
    );

  /*
    Screen position follows world position.
  */

  player.screenY =
    worldToScreenY(
      policeWorldY
    );

  robber.screenY =
    worldToScreenY(
      suspectWorldY
    );

  player.screenY =
    Math.max(
      H * 0.57,

      Math.min(
        H * 0.79,
        player.screenY
      )
    );

  robber.screenY =
    Math.max(
      H * 0.15,

      Math.min(
        H * 0.40,
        robber.screenY
      )
    );

  /* Traffic */

  spawnTimer -= dt;

  if (spawnTimer <= 0) {
    spawnTraffic();

    spawnTimer =
      (
        0.42 +
        Math.random() *
        0.45
      ) /
      environment.trafficRate;
  }

  for (
    let i = traffic.length - 1;
    i >= 0;
    i--
  ) {
    const car = traffic[i];

    car.worldY -=
      car.speed * dt;

    car.screenY =
      worldToScreenY(
        car.worldY
      );

    if (
      car.screenY >
        H + 190 ||
      car.screenY <
        -210
    ) {
      traffic.splice(i, 1);

      continue;
    }

    /* Crash */

    if (
      player.invincible <= 0 &&
      overlapScreen(
        player,
        car
      )
    ) {
      player.speed =
        Math.max(
          105,
          player.speed - 28
        );

      /*
        Police loses ground.
      */

      policeWorldY += 85;

      player.invincible = 0.9;

      shake = 19;

      nitro =
        Math.max(
          0,
          nitro - 20
        );

      createSparks(
        player.x,
        player.screenY
      );

      playSound(
        sounds.crash
      );

      showStatus(
        "CRASH! SUSPECT PULLS AWAY"
      );

      if (navigator.vibrate) {
        navigator.vibrate([
          45,
          30,
          45
        ]);
      }
    }

    /* Near miss */

    if (
      !car.passed &&
      car.screenY >
        player.screenY +
        player.height * 0.52
    ) {
      car.passed = true;

      const horizontalGap =
        Math.abs(
          car.x -
          player.x
        );

      const edge =
        (
          car.width +
          player.width
        ) / 2;

      if (
        horizontalGap >
          edge - 4 &&
        horizontalGap <
          edge + 32
      ) {
        nitro =
          Math.min(
            100,
            nitro + 25
          );

        nearMisses++;

        score += 250;

        playSound(
          sounds.nearMiss
        );

        showStatus(
          "NEAR MISS +250"
        );
      }
    }
  }

  if (player.invincible > 0) {
    player.invincible -= dt;
  }

  /*
    Police gradually accelerates
    and remains slightly faster.
  */

  player.speed =
    Math.min(
      150,
      player.speed +
        2.4 * dt
    );

  const distance =
    getDistance();

  /* Nitro UI */

  nitroFill.style.width =
    nitro + "%";

  if (
    nitro >= 100 &&
    nitroActive <= 0
  ) {
    nitroState.textContent =
      "SWIPE UP";

    nitroUI.classList.add(
      "ready"
    );
  } else if (
    nitroActive <= 0
  ) {
    nitroState.textContent =
      "BUILDING";

    nitroUI.classList.remove(
      "ready"
    );
  }

  /* Capture */

  if (distance <= 18) {
    finish(true);

    return;
  }

  /* Escape */

  if (distance >= 520) {
    finish(false);

    return;
  }

  if (distance < 90) {
    showStatus(
      "CLOSING IN!"
    );
  }

  if (distance < 45) {
    showStatus(
      "STAY ON HIM!"
    );
  }

  score +=
    policeSpeed *
    dt *
    0.5;

  updateParticles(dt);

  updateWeather(dt);

  distanceValue.textContent =
    distance + " m";

  speedValue.textContent =
    Math.round(
      policeSpeed
    ) +
    " km/h";

  if (statusTimer > 0) {
    statusTimer -= dt;

    if (statusTimer <= 0) {
      chaseStatus.style.opacity =
        "0";
    }
  }

  shake *= 0.88;
}

/* =====================================================
   WEATHER UPDATE
===================================================== */

function updateWeather(dt) {
  if (
    selectedEnvironment ===
    "rain"
  ) {
    for (const drop of rainDrops) {
      drop.y +=
        drop.speed * dt;

      drop.x -=
        85 * dt;

      if (
        drop.y > H + 30
      ) {
        drop.y = -30;
        drop.x = Math.random() * W;
      }

      if (drop.x < -20) {
        drop.x = W + 20;
      }
    }
  }

  if (
    selectedEnvironment ===
    "snow"
  ) {
    for (const flake of snowFlakes) {
      flake.y +=
        flake.speed * dt;

      flake.x +=
        flake.drift * dt;

      if (flake.y > H + 10) {
        flake.y = -10;
        flake.x = Math.random() * W;
      }
    }
  }

  if (
    selectedEnvironment ===
    "desert"
  ) {
    for (const dust of dustParticles) {
      dust.x +=
        dust.speed * dt;

      if (dust.x > W + 80) {
        dust.x = -80;
        dust.y = Math.random() * H;
      }
    }
  }
}

/* =====================================================
   DRAW BACKGROUND
===================================================== */

function drawBackground() {
  const img =
    environmentImages[
      selectedEnvironment
    ];

  if (
    img &&
    img.complete &&
    img.naturalWidth > 0
  ) {
    /*
      Cover entire screen while maintaining
      background image aspect ratio.
    */

    const imageRatio =
      img.naturalWidth /
      img.naturalHeight;

    const screenRatio =
      W / H;

    let drawWidth;
    let drawHeight;
    let drawX;
    let drawY;

    if (
      imageRatio >
      screenRatio
    ) {
      drawHeight = H;

      drawWidth =
        H * imageRatio;

      drawX =
        (W - drawWidth) / 2;

      drawY = 0;
    } else {
      drawWidth = W;

      drawHeight =
        W / imageRatio;

      drawX = 0;

      drawY =
        (H - drawHeight) / 2;
    }

    ctx.drawImage(
      img,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    );
  } else {
    ctx.fillStyle =
      "#20272e";

    ctx.fillRect(
      0,
      0,
      W,
      H
    );
  }
}

/* =====================================================
   MOVEMENT OVERLAY

   Background artwork contains the road.
   These subtle streaks make it feel alive
   without drawing another road on top.
===================================================== */

function drawRoadMotion() {
  const road =
    roadInfo();

  const speedFactor =
    Math.max(
      0,
      player.speed - 110
    ) / 40;

  if (speedFactor <= 0) return;

  ctx.save();

  ctx.globalAlpha =
    0.07 +
    speedFactor * 0.04;

  ctx.strokeStyle =
    "white";

  ctx.lineWidth = 2;

  for (let i = 0; i < 14; i++) {
    const x =
      road.left +
      Math.random() *
      road.width;

    const y =
      Math.random() * H;

    ctx.beginPath();

    ctx.moveTo(
      x,
      y
    );

    ctx.lineTo(
      x,
      y +
        30 +
        speedFactor * 30
    );

    ctx.stroke();
  }

  ctx.restore();
}

/* =====================================================
   VEHICLE DRAW
===================================================== */

function drawVehicle(car) {
  const img =
    vehicleImages[
      car.image
    ];

  if (
    !img ||
    !img.complete
  ) return;

  /*
    Perspective scaling:
    vehicles near top look smaller.
  */

  const depth =
    Math.max(
      0,
      Math.min(
        1,
        car.screenY / H
      )
    );

  const perspectiveScale =
    0.72 +
    depth * 0.35;

  const width =
    car.width *
    perspectiveScale;

  const height =
    car.height *
    perspectiveScale;

  ctx.save();

  ctx.translate(
    car.x,
    car.screenY
  );

  /*
    Source artwork faces down.
    Rotate so vehicles face forward/up-road.
  */

  ctx.rotate(
    Math.PI
  );

  if (
    car.image ===
      "police" &&
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

  ctx.shadowColor =
    "rgba(0,0,0,.55)";

  ctx.shadowBlur =
    13;

  ctx.shadowOffsetY =
    7;

  ctx.drawImage(
    img,
    -width / 2,
    -height / 2,
    width,
    height
  );

  ctx.restore();
}

/* =====================================================
   POLICE LIGHTS
===================================================== */

function drawPoliceGlow() {
  const flash =
    Math.floor(
      performance.now() /
      150
    ) %
      2 ===
      0;

  const redX =
    flash
      ? player.x - 25
      : player.x + 25;

  const blueX =
    flash
      ? player.x + 25
      : player.x - 25;

  const red =
    ctx.createRadialGradient(
      redX,
      player.screenY,
      5,
      redX,
      player.screenY,
      125
    );

  red.addColorStop(
    0,
    "rgba(255,20,50,.42)"
  );

  red.addColorStop(
    1,
    "rgba(255,20,50,0)"
  );

  ctx.fillStyle = red;

  ctx.fillRect(
    player.x - 150,
    player.screenY - 135,
    300,
    270
  );

  const blue =
    ctx.createRadialGradient(
      blueX,
      player.screenY,
      5,
      blueX,
      player.screenY,
      125
    );

  blue.addColorStop(
    0,
    "rgba(20,100,255,.46)"
  );

  blue.addColorStop(
    1,
    "rgba(20,100,255,0)"
  );

  ctx.fillStyle =
    blue;

  ctx.fillRect(
    player.x - 150,
    player.screenY - 135,
    300,
    270
  );
}

/* =====================================================
   NITRO EFFECT
===================================================== */

function drawNitro() {
  if (nitroActive <= 0) {
    return;
  }

  const gradient =
    ctx.createLinearGradient(
      player.x,
      player.screenY +
        player.height / 2,

      player.x,
      player.screenY +
        player.height / 2 +
        70
    );

  gradient.addColorStop(
    0,
    "#8ff6ff"
  );

  gradient.addColorStop(
    0.25,
    "#38baff"
  );

  gradient.addColorStop(
    0.55,
    "#4168ff"
  );

  gradient.addColorStop(
    1,
    "rgba(70,40,255,0)"
  );

  ctx.fillStyle =
    gradient;

  ctx.beginPath();

  ctx.moveTo(
    player.x - 15,
    player.screenY +
      player.height / 2 -
      5
  );

  ctx.lineTo(
    player.x,
    player.screenY +
      player.height / 2 +
      62 +
      Math.random() *
      20
  );

  ctx.lineTo(
    player.x + 15,
    player.screenY +
      player.height / 2 -
      5
  );

  ctx.closePath();

  ctx.fill();
}

/* =====================================================
   WEATHER DRAW
===================================================== */

function drawWeather() {
  if (
    selectedEnvironment ===
    "rain"
  ) {
    ctx.save();

    ctx.strokeStyle =
      "rgba(210,230,255,.55)";

    ctx.lineWidth = 1.2;

    for (const drop of rainDrops) {
      ctx.beginPath();

      ctx.moveTo(
        drop.x,
        drop.y
      );

      ctx.lineTo(
        drop.x - 8,
        drop.y +
          drop.length
      );

      ctx.stroke();
    }

    /*
      Slight cool darkening overlay.
    */

    ctx.fillStyle =
      "rgba(20,55,85,.07)";

    ctx.fillRect(
      0,
      0,
      W,
      H
    );

    ctx.restore();
  }

  if (
    selectedEnvironment ===
    "snow"
  ) {
    ctx.save();

    ctx.fillStyle =
      "rgba(255,255,255,.88)";

    for (
      const flake of snowFlakes
    ) {
      ctx.beginPath();

      ctx.arc(
        flake.x,
        flake.y,
        flake.size,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    ctx.restore();
  }

  if (
    selectedEnvironment ===
    "desert"
  ) {
    ctx.save();

    ctx.strokeStyle =
      "rgba(235,185,120,.20)";

    ctx.lineWidth = 2;

    for (
      const dust of dustParticles
    ) {
      ctx.beginPath();

      ctx.moveTo(
        dust.x,
        dust.y
      );

      ctx.lineTo(
        dust.x +
          dust.length,
        dust.y + 5
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  if (
    selectedEnvironment ===
    "tunnel"
  ) {
    /*
      Periodic tunnel light flash.
    */

    const pulse =
      (
        Math.sin(
          roadScroll * 0.035
        ) +
        1
      ) / 2;

    ctx.fillStyle =
      `rgba(255,205,120,${
        0.015 +
        pulse * 0.025
      })`;

    ctx.fillRect(
      0,
      0,
      W,
      H
    );
  }
}

/* =====================================================
   SPARKS
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

  drawBackground();

  drawRoadMotion();

  /*
    Suspect marker
  */

  ctx.fillStyle =
    "#fb2036";

  const labelY =
    robber.screenY -
    robber.height *
      0.48 -
    33;

  ctx.fillRect(
    robber.x - 35,
    labelY,
    70,
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
    labelY + 16
  );

  /*
    Traffic
  */

  for (
    const car of traffic
  ) {
    drawVehicle(car);
  }

  drawVehicle(robber);

  drawPoliceGlow();

  drawNitro();

  drawVehicle(player);

  drawParticles();

  /*
    Rain/snow/dust renders over cars.
  */

  drawWeather();
}

/* =====================================================
   GAME LOOP
===================================================== */

function gameLoop(time) {
  if (!running) return;

  let dt =
    (
      time -
      lastTime
    ) / 1000;

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
      (
        Math.random() -
        0.5
      ) * shake,

      (
        Math.random() -
        0.5
      ) * shake
    );
  }

  draw();

  ctx.restore();

  requestAnimationFrame(
    gameLoop
  );
}

/* =====================================================
   INITIAL DISPLAY
===================================================== */

resetGame();
draw();
