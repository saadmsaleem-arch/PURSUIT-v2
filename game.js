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

sounds.siren.volume = 0.27;
sounds.engine.volume = 0.21;
sounds.crash.volume = 0.72;
sounds.nitro.volume = 0.78;
sounds.nearMiss.volume = 0.55;
sounds.capture.volume = 0.80;

let soundEnabled = true;

function playSound(sound) {
  if (!soundEnabled) return;

  try {
    sound.currentTime = 0;
    sound.play().catch(() => {});
  } catch (e) {}
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
    trafficRate: 1.00
  },

  highway: {
    name: "HIGHWAY",
    grip: 1.05,
    trafficRate: 0.90
  },

  rain: {
    name: "HEAVY RAIN",
    grip: 0.84,
    trafficRate: 0.92
  },

  snow: {
    name: "SNOW",
    grip: 0.76,
    trafficRate: 0.82
  },

  desert: {
    name: "DESERT",
    grip: 0.94,
    trafficRate: 0.82
  },

  tunnel: {
    name: "TUNNEL",
    grip: 1.00,
    trafficRate: 0.96
  }
};

const environmentOrder = [
  "city",
  "highway",
  "tunnel",
  "rain",
  "desert",
  "snow"
];

let selectedEnvironment = "city";
let activeEnvironment = "city";

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
   MENU
===================================================== */

envButtons.forEach(button => {
  button.addEventListener("click", () => {

    envButtons.forEach(btn => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    selectedEnvironment = button.dataset.env;

    message.innerHTML = `
      <strong>${environments[selectedEnvironment].name}</strong>
      <br>
      Catch the suspect before they escape.
    `;
  });
});

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
let nearMisses = 0;

let combo = 0;
let bestCombo = 0;
let comboTimer = 0;

let shake = 0;
let statusTimer = 0;

let spawnTimer = 0;
let roadScroll = 0;

let policeWorldY = 1100;
let suspectWorldY = 650;

/* =====================================================
   CHASE LENGTH
===================================================== */

/*
   Capture cannot happen before 58 seconds.
*/

const MIN_CHASE_TIME = 58;

/*
   Environment transitions happen at 20 and 40 sec.
*/

const ENVIRONMENT_CHANGE_1 = 20;
const ENVIRONMENT_CHANGE_2 = 40;

let environmentStage = 0;
let environmentSequence = [];

let transitionFlash = 0;
let transitionText = "";
let transitionTextTimer = 0;

/* =====================================================
   GAME BALANCE
===================================================== */

const TRAFFIC_BASE_SCREEN_SPEED = 285;
const TRAFFIC_RELATIVE_MULTIPLIER = 2.4;
const TRAFFIC_MAX_SCREEN_SPEED = 430;

const NITRO_DURATION = 2.7;
const NITRO_SPEED_BONUS = 38;

const COMBO_WINDOW = 3.0;

/* =====================================================
   WEATHER
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
      length: 18 + Math.random() * 25
    });
  }

  for (let i = 0; i < 85; i++) {

    snowFlakes.push({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 45 + Math.random() * 90,
      drift: -20 + Math.random() * 40,
      size: 1 + Math.random() * 3
    });
  }

  for (let i = 0; i < 50; i++) {

    dustParticles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 80 + Math.random() * 130,
      length: 30 + Math.random() * 60
    });
  }
}

/* =====================================================
   ROAD
===================================================== */

function backgroundFrameWidth() {

  if (W > H) {

    return Math.min(
      W * 0.48,
      H * 0.82
    );
  }

  return W;
}

function roadInfo() {

  const frameWidth = backgroundFrameWidth();

  const width = Math.min(
    frameWidth * 0.80,
    550
  );

  return {
    left: (W - width) / 2,
    right: (W + width) / 2,
    width,
    lanes: 4
  };
}

function laneCenter(lane) {

  const road = roadInfo();

  const laneWidth =
    road.width / road.lanes;

  return (
    road.left +
    laneWidth * (lane + 0.5)
  );
}

/* =====================================================
   ENVIRONMENT SEQUENCE
===================================================== */

function buildEnvironmentSequence() {

  const startIndex =
    environmentOrder.indexOf(
      selectedEnvironment
    );

  environmentSequence = [
    environmentOrder[
      startIndex
    ],

    environmentOrder[
      (startIndex + 1) %
      environmentOrder.length
    ],

    environmentOrder[
      (startIndex + 2) %
      environmentOrder.length
    ]
  ];

  activeEnvironment =
    environmentSequence[0];

  environmentStage = 0;
}

/* =====================================================
   ENVIRONMENT CHANGE + SUSPECT TAUNTS
===================================================== */

function changeEnvironment(stage) {

  if (
    stage <= environmentStage ||
    !environmentSequence[stage]
  ) {
    return;
  }

  environmentStage = stage;

  const nextEnvironment =
    environmentSequence[stage];

  /*
     Environment-specific suspect messages.
  */

  const environmentTaunts = {

    snow:
      "LET'S SEE HOW YOU DO IN THE SNOW!",

    rain:
      "CAN YOU KEEP UP IN THE RAIN?",

    tunnel:
      "TRY CATCHING ME IN THE TUNNEL!",

    desert:
      "LET'S SEE YOU HANDLE THE DESERT!",

    highway:
      "LET'S OPEN THIS THING UP!",

    city:
      "TRY TO KEEP UP IN THE CITY!"
  };

  transitionText =
    environmentTaunts[
      nextEnvironment
    ] ||
    "CAN'T CATCH ME THAT FAST!";

  transitionTextTimer = 2.4;

  /*
     Flash transition.
  */

  transitionFlash = 1;

  activeEnvironment =
    nextEnvironment;

  environmentBadge.textContent =
    environments[
      activeEnvironment
    ].name;

  /*
     Remove old traffic during transition.
  */

  traffic = [];

  spawnTimer = 0.75;

  createWeatherParticles();
}

/* =====================================================
   RESET
===================================================== */

function resetGame() {

  policeWorldY = 1100;
  suspectWorldY = 650;

  buildEnvironmentSequence();

  player = {

    x: W / 2,

    screenY: H * 0.76,

    targetX: W / 2,

    width: 76,
    height: 138,

    speed: 136,

    invincible: 0,

    image: "police"
  };

  robber = {

    x: laneCenter(1),

    screenY: H * 0.27,

    width: 56,
    height: 103,

    speed: 131,

    targetLane: 1,

    laneTimer: 1.5,

    image: "suspect"
  };

  traffic = [];
  particles = [];

  nitro = 0;
  nitroActive = 0;

  elapsed = 0;

  score = 0;
  nearMisses = 0;

  combo = 0;
  bestCombo = 0;
  comboTimer = 0;

  shake = 0;
  statusTimer = 0;

  transitionFlash = 0;
  transitionText = "";
  transitionTextTimer = 0;

  spawnTimer = 1.25;

  roadScroll = 0;

  distanceValue.textContent =
    getDistance() + " m";

  speedValue.textContent =
    "136 km/h";

  environmentBadge.textContent =
    environments[
      activeEnvironment
    ].name;

  nitroFill.style.width = "0%";

  nitroState.textContent =
    "BUILDING";

  nitroUI.classList.remove(
    "ready"
  );

  createWeatherParticles();

  createTrafficCar(
    0,
    H * 0.12
  );

  createTrafficCar(
    3,
    -130
  );
}

/* =====================================================
   DISTANCE
===================================================== */

function getDistance() {

  return Math.max(
    0,

    Math.round(
      (
        policeWorldY -
        suspectWorldY
      ) * 0.7
    )
  );
}

/* =====================================================
   START
===================================================== */

function startGame() {

  resetGame();

  title.className = "";

  overlay.style.display =
    "none";

  running = true;

  lastTime =
    performance.now();

  startDrivingSounds();

  requestAnimationFrame(
    gameLoop
  );
}

startBtn.addEventListener(
  "click",
  startGame
);

/* =====================================================
   CONTROLS

   Drag = steer
   Swipe UP anywhere = Nitro
===================================================== */

let pointerDown = false;

let gestureStartX = 0;
let gestureStartY = 0;
let gestureStartTime = 0;

function steer(clientX) {

  if (!running) return;

  const road = roadInfo();

  player.targetX =
    Math.max(
      road.left +
      player.width / 2 +
      4,

      Math.min(
        road.right -
        player.width / 2 -
        4,

        clientX
      )
    );
}

window.addEventListener(
  "pointerdown",
  event => {

    if (!running) return;

    pointerDown = true;

    gestureStartX =
      event.clientX;

    gestureStartY =
      event.clientY;

    gestureStartTime =
      performance.now();

    steer(
      event.clientX
    );
  }
);

window.addEventListener(
  "pointermove",
  event => {

    if (
      !pointerDown ||
      !running
    ) return;

    steer(
      event.clientX
    );
  }
);

window.addEventListener(
  "pointerup",
  event => {

    if (!pointerDown) return;

    pointerDown = false;

    if (!running) return;

    const dx =
      event.clientX -
      gestureStartX;

    const dy =
      event.clientY -
      gestureStartY;

    const duration =
      performance.now() -
      gestureStartTime;

    const vertical =
      Math.abs(dy) >
      Math.abs(dx) * 1.05;

    const swipeUp =
      dy < -45 &&
      vertical &&
      duration < 800;

    if (swipeUp) {
      activateNitro();
    }
  }
);

/* =====================================================
   NITRO
===================================================== */

function activateNitro() {

  if (!running) return;

  if (nitro < 100) {

    showStatus(
      "NITRO NOT READY"
    );

    return;
  }

  nitro = 0;

  nitroActive =
    NITRO_DURATION;

  nitroUI.classList.remove(
    "ready"
  );

  nitroState.textContent =
    "BOOSTING";

  playSound(
    sounds.nitro
  );

  showStatus(
    "NITRO BOOST!"
  );

  shake = 6;

  if (navigator.vibrate) {
    navigator.vibrate(35);
  }
}

/* =====================================================
   STATUS
===================================================== */

function showStatus(text) {

  chaseStatus.textContent =
    text;

  chaseStatus.style.opacity =
    "1";

  statusTimer = 0.8;
}

/* =====================================================
   TRAFFIC
===================================================== */

function createTrafficCar(
  lane,
  screenY
) {

  const road = roadInfo();

  const laneWidth =
    road.width / road.lanes;

  const roll =
    Math.random();

  let image;
  let width;
  let height;
  let speed;

  if (roll < 0.06) {

    image = "truck";

    width = 66;
    height = 140;

    speed =
      96 +
      Math.random() * 9;

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

    width = 49;
    height = 92;

    speed =
      105 +
      Math.random() * 14;
  }

  const jitter =
    (
      Math.random() -
      0.5
    ) *
    laneWidth *
    0.10;

  let x =
    laneCenter(lane) +
    jitter;

  const minX =
    road.left +
    width * 0.55;

  const maxX =
    road.right -
    width * 0.55;

  x =
    Math.max(
      minX,

      Math.min(
        maxX,
        x
      )
    );

  traffic.push({
    x,
    lane,
    screenY,
    width,
    height,
    speed,
    image,
    passed: false
  });
}

/* =====================================================
   TRAFFIC GROUPS
===================================================== */

function spawnTrafficGroup() {

  const lanes = [
    0,
    1,
    2,
    3
  ];

  for (
    let i = lanes.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );

    [
      lanes[i],
      lanes[j]
    ] = [
      lanes[j],
      lanes[i]
    ];
  }

  /*
     Usually one vehicle.
     Sometimes two.
  */

  const count =
    Math.random() < 0.70
      ? 1
      : 2;

  for (
    let i = 0;
    i < count;
    i++
  ) {

    createTrafficCar(
      lanes[i],

      -80 -
      Math.random() * 50
    );
  }
}

/* =====================================================
   COLLISION
===================================================== */

function overlapScreen(a, b) {

  const aHitWidth =
    a.image === "police"
      ? a.width * 0.56
      : a.width * 0.70;

  const bHitWidth =
    b.image === "police"
      ? b.width * 0.56
      : b.width * 0.70;

  const aHitHeight =
    a.image === "police"
      ? a.height * 0.64
      : a.height * 0.74;

  const bHitHeight =
    b.image === "police"
      ? b.height * 0.64
      : b.height * 0.74;

  return (
    Math.abs(
      a.x -
      b.x
    ) <
    (
      aHitWidth +
      bHitWidth
    ) / 2

    &&

    Math.abs(
      a.screenY -
      b.screenY
    ) <
    (
      aHitHeight +
      bHitHeight
    ) / 2
  );
}

/* =====================================================
   SPARKS
===================================================== */

function createSparks(x, y) {

  for (
    let i = 0;
    i < 18;
    i++
  ) {

    particles.push({

      x,
      y,

      vx:
        (
          Math.random() -
          0.5
        ) * 180,

      vy:
        Math.random() * 170,

      life:
        0.4 +
        Math.random() * 0.35
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

    p.life -= dt;

    if (p.life <= 0) {

      particles.splice(
        i,
        1
      );
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
    ) * 0.78
  );
}

/* =====================================================
   FINISH
===================================================== */

function finish(win) {

  running = false;

  stopDrivingSounds();

  if (win) {

    playSound(
      sounds.capture
    );
  }

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

    message.innerHTML = `
      <strong>
        ${environments[activeEnvironment].name}
      </strong>

      <br><br>

      Score:
      <strong>
        ${Math.round(score).toLocaleString()}
      </strong>

      &nbsp; • &nbsp;

      Near Misses:
      <strong>
        ${nearMisses}
      </strong>

      <br>

      Best Combo:
      <strong>
        x${Math.max(1, bestCombo)}
      </strong>

      <br>

      Chase Time:
      <strong>
        ${elapsed.toFixed(1)} sec
      </strong>
    `;

  } else {

    message.innerHTML = `
      The suspect got away.

      <br><br>

      Select a location and try again.
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

  /* ===================================================
     ENVIRONMENT PROGRESSION
  =================================================== */

  if (
    elapsed >= ENVIRONMENT_CHANGE_1 &&
    environmentStage === 0
  ) {

    changeEnvironment(1);
  }

  if (
    elapsed >= ENVIRONMENT_CHANGE_2 &&
    environmentStage === 1
  ) {

    changeEnvironment(2);
  }

  if (transitionFlash > 0) {

    transitionFlash -=
      dt * 2.2;

    transitionFlash =
      Math.max(
        0,
        transitionFlash
      );
  }

  if (
    transitionTextTimer > 0
  ) {

    transitionTextTimer -= dt;
  }

  const environment =
    environments[
      activeEnvironment
    ];

  const suspectSpeed =
    robber.speed;

  let policeSpeed =
    player.speed;

  /* ===================================================
     COMBO
  =================================================== */

  if (comboTimer > 0) {

    comboTimer -= dt;

    if (comboTimer <= 0) {
      combo = 0;
    }
  }

  /* ===================================================
     NITRO
  =================================================== */

  if (nitroActive > 0) {

    nitroActive -= dt;

    policeSpeed +=
      NITRO_SPEED_BONUS;

    if (
      nitroActive <= 0
    ) {

      nitroState.textContent =
        "BUILDING";
    }
  }

  /* ===================================================
     CHASE MOVEMENT
  =================================================== */

  suspectWorldY -=
    suspectSpeed * dt;

  policeWorldY -=
    policeSpeed * dt;

  roadScroll +=
    policeSpeed *
    dt *
    2.4;

  sounds.engine.playbackRate =
    Math.max(
      0.85,

      Math.min(
        1.35,
        policeSpeed / 135
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
      11 *
      environment.grip
    );

  /* ===================================================
     SUSPECT AI
  =================================================== */

  robber.laneTimer -= dt;

  if (
    robber.laneTimer <= 0
  ) {

    const choices = [];

    for (
      let lane = 0;
      lane < 4;
      lane++
    ) {

      if (
        lane !==
        robber.targetLane
      ) {

        choices.push(lane);
      }
    }

    robber.targetLane =
      choices[
        Math.floor(
          Math.random() *
          choices.length
        )
      ];

    const distance =
      getDistance();

    /*
       Suspect gets more evasive
       toward end of chase.
    */

    if (
      elapsed > 45 ||
      distance < 80
    ) {

      robber.laneTimer =
        0.55 +
        Math.random() * 0.55;

    } else {

      robber.laneTimer =
        1.20 +
        Math.random() * 1.0;
    }
  }

  const robberTargetX =
    laneCenter(
      robber.targetLane
    );

  robber.x +=
    (
      robberTargetX -
      robber.x
    ) *
    Math.min(
      1,
      dt * 2.5
    );

  /* ===================================================
     SCREEN POSITIONS
  =================================================== */

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
      H * 0.58,

      Math.min(
        H * 0.78,
        player.screenY
      )
    );

  robber.screenY =
    Math.max(
      H * 0.16,

      Math.min(
        H * 0.39,
        robber.screenY
      )
    );

  let distance =
    getDistance();

  /* ===================================================
     MINIMUM CHASE LENGTH

     If player catches suspect before 58 sec,
     suspect keeps just enough distance.
  =================================================== */

  if (
    elapsed < MIN_CHASE_TIME &&
    distance < 42
  ) {

    policeWorldY =
      suspectWorldY +
      60;

    distance =
      getDistance();

    if (
      elapsed < 48
    ) {

      showStatus(
        "HE'S PULLING AWAY!"
      );
    }
  }

  /* ===================================================
     TRAFFIC SPAWN
  =================================================== */

  spawnTimer -= dt;

  if (
    spawnTimer <= 0
  ) {

    /*
       Final pursuit gets a little cleaner.
    */

    if (
      distance > 110
    ) {

      spawnTrafficGroup();
    }

    let spawnDelay;

    if (
      elapsed < 10
    ) {

      spawnDelay =
        1.15 +
        Math.random() * 0.30;

    } else if (
      elapsed < 25
    ) {

      spawnDelay =
        0.85 +
        Math.random() * 0.30;

    } else {

      spawnDelay =
        0.70 +
        Math.random() * 0.25;
    }

    if (
      distance < 180
    ) {

      spawnDelay *= 1.5;
    }

    spawnTimer =
      spawnDelay /
      environment.trafficRate;
  }

  /* ===================================================
     TRAFFIC MOVEMENT
  =================================================== */

  for (
    let i =
      traffic.length - 1;

    i >= 0;

    i--
  ) {

    const car =
      traffic[i];

    const relativeSpeed =
      Math.max(
        0,
        policeSpeed -
        car.speed
      );

    let trafficScreenSpeed =
      TRAFFIC_BASE_SCREEN_SPEED +
      relativeSpeed *
      TRAFFIC_RELATIVE_MULTIPLIER;

    if (
      car.image === "truck"
    ) {

      trafficScreenSpeed -= 25;
    }

    if (
      nitroActive > 0
    ) {

      trafficScreenSpeed += 55;
    }

    trafficScreenSpeed =
      Math.min(
        TRAFFIC_MAX_SCREEN_SPEED,
        trafficScreenSpeed
      );

    car.screenY +=
      trafficScreenSpeed * dt;

    if (
      car.screenY >
      H + 180
    ) {

      traffic.splice(
        i,
        1
      );

      continue;
    }

    /* =================================================
       COLLISION
    ================================================= */

    if (
      player.invincible <= 0 &&
      overlapScreen(
        player,
        car
      )
    ) {

      player.speed =
        Math.max(
          126,
          player.speed - 9
        );

      policeWorldY += 28;

      player.invincible = 1.2;

      shake = 10;

      nitro =
        Math.max(
          0,
          nitro - 10
        );

      combo = 0;
      comboTimer = 0;

      createSparks(
        player.x,
        player.screenY
      );

      playSound(
        sounds.crash
      );

      showStatus(
        "HIT! COMBO LOST"
      );

      if (
        navigator.vibrate
      ) {

        navigator.vibrate([
          25,
          20,
          25
        ]);
      }
    }

    /* =================================================
       NEAR MISS
    ================================================= */

    if (
      !car.passed &&
      car.screenY >
      player.screenY +
      player.height * 0.48
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
        edge - 8 &&
        horizontalGap <
        edge + 40
      ) {

        nearMisses++;

        combo =
          Math.min(
            5,
            combo + 1
          );

        bestCombo =
          Math.max(
            bestCombo,
            combo
          );

        comboTimer =
          COMBO_WINDOW;

        const nitroReward =
          24 +
          combo * 6;

        nitro =
          Math.min(
            100,
            nitro +
            nitroReward
          );

        const comboScore =
          200 * combo;

        score +=
          comboScore;

        playSound(
          sounds.nearMiss
        );

        if (
          combo === 1
        ) {

          showStatus(
            "NEAR MISS +200"
          );

        } else {

          showStatus(
            `NEAR MISS x${combo} +${comboScore}`
          );
        }
      }
    }
  }

  if (
    player.invincible > 0
  ) {

    player.invincible -= dt;
  }

  /* ===================================================
     POLICE ACCELERATION

     Deliberately slow so chase lasts.
  =================================================== */

  player.speed =
    Math.min(
      141,

      player.speed +
      0.12 * dt
    );

  /* ===================================================
     NITRO UI
  =================================================== */

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

  /* ===================================================
     WIN

     Capture is impossible before 58 seconds.
  =================================================== */

  if (
    distance <= 18 &&
    elapsed >= MIN_CHASE_TIME
  ) {

    finish(true);
    return;
  }

  /* ===================================================
     LOSE
  =================================================== */

  if (
    distance >= 650
  ) {

    finish(false);
    return;
  }

  /* ===================================================
     FINAL CHASE MESSAGES
  =================================================== */

  if (
    elapsed >= 48 &&
    elapsed < 55
  ) {

    showStatus(
      "FINAL PURSUIT!"
    );
  }

  if (
    elapsed >= 55 &&
    distance < 100
  ) {

    showStatus(
      "TAKE HIM DOWN!"
    );
  }

  score +=
    policeSpeed *
    dt *
    0.50;

  updateParticles(dt);
  updateWeather(dt);

  distanceValue.textContent =
    distance + " m";

  speedValue.textContent =
    Math.round(
      policeSpeed
    ) + " km/h";

  if (
    statusTimer > 0
  ) {

    statusTimer -= dt;

    if (
      statusTimer <= 0
    ) {

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
    activeEnvironment === "rain"
  ) {

    for (
      const drop of rainDrops
    ) {

      drop.y +=
        drop.speed * dt;

      drop.x -=
        85 * dt;

      if (
        drop.y >
        H + 30
      ) {

        drop.y = -30;

        drop.x =
          Math.random() * W;
      }

      if (
        drop.x < -30
      ) {

        drop.x =
          W + 30;
      }
    }
  }

  if (
    activeEnvironment === "snow"
  ) {

    for (
      const flake of snowFlakes
    ) {

      flake.y +=
        flake.speed * dt;

      flake.x +=
        flake.drift * dt;

      if (
        flake.y >
        H + 10
      ) {

        flake.y = -10;

        flake.x =
          Math.random() * W;
      }
    }
  }

  if (
    activeEnvironment === "desert"
  ) {

    for (
      const dust of dustParticles
    ) {

      dust.x +=
        dust.speed * dt;

      if (
        dust.x >
        W + 80
      ) {

        dust.x = -80;

        dust.y =
          Math.random() * H;
      }
    }
  }
}

/* =====================================================
   BACKGROUND
===================================================== */

function drawBackground() {

  const img =
    environmentImages[
      activeEnvironment
    ];

  const outer =
    ctx.createLinearGradient(
      0,
      0,
      W,
      0
    );

  outer.addColorStop(
    0,
    "#02070c"
  );

  outer.addColorStop(
    0.5,
    "#09131c"
  );

  outer.addColorStop(
    1,
    "#02070c"
  );

  ctx.fillStyle = outer;

  ctx.fillRect(
    0,
    0,
    W,
    H
  );

  if (
    !img ||
    !img.complete ||
    img.naturalWidth <= 0
  ) {

    return;
  }

  const frameWidth =
    backgroundFrameWidth();

  const frameHeight = H;

  const imageRatio =
    img.naturalWidth /
    img.naturalHeight;

  const frameRatio =
    frameWidth /
    frameHeight;

  let drawWidth;
  let drawHeight;

  if (
    imageRatio >
    frameRatio
  ) {

    drawHeight =
      frameHeight;

    drawWidth =
      drawHeight *
      imageRatio;

  } else {

    drawWidth =
      frameWidth;

    drawHeight =
      drawWidth /
      imageRatio;
  }

  const frameX =
    (
      W -
      frameWidth
    ) / 2;

  const drawX =
    frameX +
    (
      frameWidth -
      drawWidth
    ) / 2;

  const drawY =
    (
      H -
      drawHeight
    ) / 2;

  ctx.save();

  ctx.beginPath();

  ctx.rect(
    frameX,
    0,
    frameWidth,
    H
  );

  ctx.clip();

  ctx.drawImage(
    img,
    drawX,
    drawY,
    drawWidth,
    drawHeight
  );

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

  const depth =
    Math.max(
      0,

      Math.min(
        1,
        car.screenY / H
      )
    );

  const scale =
    0.68 +
    depth * 0.37;

  const width =
    car.width * scale;

  const height =
    car.height * scale;

  ctx.save();

  ctx.translate(
    car.x,
    car.screenY
  );

  ctx.rotate(
    Math.PI
  );

  if (
    car.image === "police" &&
    player.invincible > 0 &&
    Math.floor(
      player.invincible * 12
    ) % 2 === 0
  ) {

    ctx.globalAlpha = 0.35;
  }

  ctx.shadowColor =
    "rgba(0,0,0,.6)";

  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 8;

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
      performance.now() / 150
    ) % 2 === 0;

  const redX =
    flash
      ? player.x - 28
      : player.x + 28;

  const blueX =
    flash
      ? player.x + 28
      : player.x - 28;

  const red =
    ctx.createRadialGradient(
      redX,
      player.screenY,
      5,
      redX,
      player.screenY,
      145
    );

  red.addColorStop(
    0,
    "rgba(255,20,50,.46)"
  );

  red.addColorStop(
    1,
    "rgba(255,20,50,0)"
  );

  ctx.fillStyle = red;

  ctx.fillRect(
    player.x - 170,
    player.screenY - 160,
    340,
    320
  );

  const blue =
    ctx.createRadialGradient(
      blueX,
      player.screenY,
      5,
      blueX,
      player.screenY,
      145
    );

  blue.addColorStop(
    0,
    "rgba(20,100,255,.48)"
  );

  blue.addColorStop(
    1,
    "rgba(20,100,255,0)"
  );

  ctx.fillStyle = blue;

  ctx.fillRect(
    player.x - 170,
    player.screenY - 160,
    340,
    320
  );
}

/* =====================================================
   NITRO VISUAL
===================================================== */

function drawNitro() {

  if (
    nitroActive <= 0
  ) return;

  const gradient =
    ctx.createLinearGradient(
      player.x,

      player.screenY +
      player.height / 2,

      player.x,

      player.screenY +
      player.height / 2 +
      85
    );

  gradient.addColorStop(
    0,
    "#c5fcff"
  );

  gradient.addColorStop(
    0.22,
    "#44d9ff"
  );

  gradient.addColorStop(
    0.55,
    "#346fff"
  );

  gradient.addColorStop(
    1,
    "rgba(80,40,255,0)"
  );

  ctx.fillStyle =
    gradient;

  ctx.beginPath();

  ctx.moveTo(
    player.x - 16,

    player.screenY +
    player.height / 2 -
    5
  );

  ctx.lineTo(
    player.x,

    player.screenY +
    player.height / 2 +
    78 +
    Math.random() * 18
  );

  ctx.lineTo(
    player.x + 16,

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
    activeEnvironment === "rain"
  ) {

    ctx.save();

    ctx.strokeStyle =
      "rgba(215,235,255,.54)";

    ctx.lineWidth = 1.2;

    for (
      const drop of rainDrops
    ) {

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

    ctx.restore();
  }

  if (
    activeEnvironment === "snow"
  ) {

    ctx.save();

    ctx.fillStyle =
      "rgba(255,255,255,.9)";

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
    activeEnvironment === "desert"
  ) {

    ctx.save();

    ctx.strokeStyle =
      "rgba(240,190,120,.20)";

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
}

/* =====================================================
   PARTICLES
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
      "#ffc34d";

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
   SUSPECT LABEL
===================================================== */

function drawSuspectMarker() {

  const width = 80;
  const height = 25;

  const y =
    robber.screenY -
    robber.height * 0.48 -
    35;

  ctx.fillStyle =
    "#ed2038";

  ctx.fillRect(
    robber.x -
    width / 2,

    y,

    width,
    height
  );

  ctx.fillStyle = "#fff";

  ctx.font =
    "900 11px Arial";

  ctx.textAlign =
    "center";

  ctx.fillText(
    "SUSPECT",
    robber.x,
    y + 17
  );
}

/* =====================================================
   ENVIRONMENT TRANSITION + TAUNT
===================================================== */

function drawTransition() {

  /*
     Brief flash.
  */

  if (
    transitionFlash > 0
  ) {

    ctx.fillStyle =
      `rgba(255,255,255,${
        transitionFlash * 0.55
      })`;

    ctx.fillRect(
      0,
      0,
      W,
      H
    );
  }

  /*
     Suspect dialogue.
  */

  if (
    transitionTextTimer > 0
  ) {

    ctx.save();

    ctx.textAlign =
      "center";

    ctx.font =
      "900 14px Arial";

    ctx.fillStyle =
      "#ff3b4f";

    ctx.shadowColor =
      "rgba(0,0,0,.95)";

    ctx.shadowBlur = 10;

    ctx.fillText(
      "SUSPECT",
      W / 2,
      H * 0.42 - 38
    );

    ctx.font =
      "900 25px Arial";

    ctx.fillStyle =
      "#ffffff";

    ctx.fillText(
      transitionText,
      W / 2,
      H * 0.42
    );

    ctx.restore();
  }
}

/* =====================================================
   VIGNETTE
===================================================== */

function drawVignette() {

  const gradient =
    ctx.createRadialGradient(
      W / 2,
      H / 2,

      Math.min(
        W,
        H
      ) * 0.18,

      W / 2,
      H / 2,

      Math.max(
        W,
        H
      ) * 0.7
    );

  gradient.addColorStop(
    0,
    "rgba(0,0,0,0)"
  );

  gradient.addColorStop(
    1,
    "rgba(0,0,0,.34)"
  );

  ctx.fillStyle =
    gradient;

  ctx.fillRect(
    0,
    0,
    W,
    H
  );
}

/* =====================================================
   DRAW
===================================================== */

function draw() {

  ctx.clearRect(
    0,
    0,
    W,
    H
  );

  drawBackground();

  for (
    const car of traffic
  ) {

    drawVehicle(car);
  }

  drawSuspectMarker();

  drawVehicle(
    robber
  );

  drawPoliceGlow();

  drawNitro();

  drawVehicle(
    player
  );

  drawParticles();

  drawWeather();

  drawVignette();

  /*
     Draw last so taunt appears
     over everything.
  */

  drawTransition();
}

/* =====================================================
   LOOP
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

  if (
    shake > 1
  ) {

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
