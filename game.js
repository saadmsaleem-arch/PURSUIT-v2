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


/* Backgrounds */

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

    sound
      .play()
      .catch(() => {});

  } catch (error) {}
}


function startDrivingSounds() {
  if (!soundEnabled) return;

  sounds.siren.currentTime = 0;
  sounds.engine.currentTime = 0;

  sounds.siren
    .play()
    .catch(() => {});

  sounds.engine
    .play()
    .catch(() => {});
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

  tunnel: {
    name: "TUNNEL",
    grip: 1.00,
    trafficRate: 0.96
  },

  rain: {
    name: "RAIN",
    grip: 0.84,
    trafficRate: 0.92
  },

  desert: {
    name: "DESERT",
    grip: 0.94,
    trafficRate: 0.82
  },

  snow: {
    name: "SNOW",
    grip: 0.76,
    trafficRate: 0.82
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
   DIFFICULTY
===================================================== */

const difficultySettings = {

  easy: {
    label: "EASY",

    trafficMultiplier: 1.00,

    stalledMinTime: Infinity,
    stalledMaxTime: Infinity,

    doubleStallChance: 0,

    stalledTruckChance: 0,

    crashSpeedLoss: 12,

    suspectAggression: 1.00,

    nitroMultiplier: 1.00,

    scoreMultiplier: 1.00
  },


  medium: {
    label: "MEDIUM",

    trafficMultiplier: 1.08,

    stalledMinTime: 12,
    stalledMaxTime: 18,

    doubleStallChance: 0.12,

    stalledTruckChance: 0.15,

    crashSpeedLoss: 16,

    suspectAggression: 1.20,

    nitroMultiplier: 0.95,

    scoreMultiplier: 1.50
  },


  hard: {
    label: "HARD",

    trafficMultiplier: 1.16,

    stalledMinTime: 6,
    stalledMaxTime: 10,

    /*
      Two stalled lanes sometimes.
      NEVER more than two.
    */

    doubleStallChance: 0.38,

    stalledTruckChance: 0.35,

    crashSpeedLoss: 20,

    suspectAggression: 1.50,

    nitroMultiplier: 0.85,

    scoreMultiplier: 2.00
  }

};


let selectedDifficulty = "easy";


/* =====================================================
   DOM
===================================================== */

const canvas =
  document.getElementById("game");

const ctx =
  canvas.getContext("2d");


const overlay =
  document.getElementById("overlay");


const title =
  document.getElementById("title");

const subtitle =
  document.getElementById("subtitle");

const message =
  document.getElementById("message");


const startBtn =
  document.getElementById("startBtn");

const soundToggle =
  document.getElementById("soundToggle");


const quickModeBtn =
  document.getElementById("quickModeBtn");

const longModeBtn =
  document.getElementById("longModeBtn");


const duration30Btn =
  document.getElementById("duration30Btn");

const duration60Btn =
  document.getElementById("duration60Btn");


const easyBtn =
  document.getElementById("easyBtn");

const mediumBtn =
  document.getElementById("mediumBtn");

const hardBtn =
  document.getElementById("hardBtn");


const distanceValue =
  document.getElementById("distanceValue");

const speedValue =
  document.getElementById("speedValue");


const heartsValue =
  document.getElementById("heartsValue");


const scoreValue =
  document.getElementById("scoreValue");

const bestScoreValue =
  document.getElementById("bestScoreValue");


const environmentBadge =
  document.getElementById("environmentBadge");

const stageTimer =
  document.getElementById("stageTimer");

const chaseStatus =
  document.getElementById("chaseStatus");


const nitroUI =
  document.getElementById("nitroUI");

const nitroFill =
  document.getElementById("nitroFill");

const nitroState =
  document.getElementById("nitroState");


const envButtons =
  document.querySelectorAll(".envButton");


/* =====================================================
   HIGH SCORE
===================================================== */

const HIGH_SCORE_KEY =
  "pursuitHighScore";


let highScore = 0;


try {

  highScore =
    Number(
      localStorage.getItem(
        HIGH_SCORE_KEY
      )
    ) || 0;

} catch (error) {

  highScore = 0;
}


function saveHighScore() {

  const rounded =
    Math.round(score);


  if (
    rounded <= highScore
  ) {

    return;
  }


  highScore = rounded;


  try {

    localStorage.setItem(
      HIGH_SCORE_KEY,
      String(highScore)
    );

  } catch (error) {}
}


/* =====================================================
   MENU SETTINGS
===================================================== */

let gameMode = "quick";

let selectedStageDuration = 60;


function updateMenuText() {

  const modeText =
    gameMode === "long"
      ? "LONG"
      : "QUICK";


  const timeText =
    selectedStageDuration === 30
      ? "30 SEC"
      : "1 MIN";


  const difficulty =
    difficultySettings[
      selectedDifficulty
    ];


  const multiplier =
    difficulty.scoreMultiplier;


  message.textContent =

    `${modeText} • ${timeText} • ` +

    `${difficulty.label} • ` +

    `×${multiplier} SCORE • 5 LIVES`;
}


/* =====================================================
   MODE
===================================================== */

function setGameMode(mode) {

  gameMode = mode;


  quickModeBtn
    .classList
    .toggle(
      "active",
      mode === "quick"
    );


  longModeBtn
    .classList
    .toggle(
      "active",
      mode === "long"
    );


  updateMenuText();
}


quickModeBtn.addEventListener(
  "click",
  () => setGameMode("quick")
);


longModeBtn.addEventListener(
  "click",
  () => setGameMode("long")
);


/* =====================================================
   LEVEL LENGTH
===================================================== */

function setStageDuration(seconds) {

  selectedStageDuration =
    seconds;


  duration30Btn
    .classList
    .toggle(
      "active",
      seconds === 30
    );


  duration60Btn
    .classList
    .toggle(
      "active",
      seconds === 60
    );


  updateMenuText();
}


duration30Btn.addEventListener(
  "click",
  () => setStageDuration(30)
);


duration60Btn.addEventListener(
  "click",
  () => setStageDuration(60)
);


/* =====================================================
   DIFFICULTY
===================================================== */

function setDifficulty(level) {

  selectedDifficulty =
    level;


  easyBtn
    .classList
    .toggle(
      "active",
      level === "easy"
    );


  mediumBtn
    .classList
    .toggle(
      "active",
      level === "medium"
    );


  hardBtn
    .classList
    .toggle(
      "active",
      level === "hard"
    );


  updateMenuText();
}


easyBtn.addEventListener(
  "click",
  () => setDifficulty("easy")
);


mediumBtn.addEventListener(
  "click",
  () => setDifficulty("medium")
);


hardBtn.addEventListener(
  "click",
  () => setDifficulty("hard")
);


/* =====================================================
   ENVIRONMENT MENU
===================================================== */

envButtons.forEach(button => {

  button.addEventListener(
    "click",
    () => {

      envButtons.forEach(btn => {

        btn
          .classList
          .remove("active");
      });


      button
        .classList
        .add("active");


      selectedEnvironment =
        button.dataset.env;


      updateMenuText();
    }
  );
});


soundToggle.addEventListener(
  "click",
  () => {

    soundEnabled =
      !soundEnabled;


    soundToggle.textContent =
      soundEnabled
        ? "🔊"
        : "🔇";


    if (!soundEnabled) {

      stopDrivingSounds();

    } else if (running) {

      startDrivingSounds();
    }
  }
);


/* =====================================================
   SCREEN
===================================================== */

let W = 0;
let H = 0;
let DPR = 1;


function resize() {

  DPR =
    Math.min(
      window.devicePixelRatio || 1,
      2
    );


  W =
    window.innerWidth;

  H =
    window.innerHeight;


  canvas.width =
    Math.round(
      W * DPR
    );


  canvas.height =
    Math.round(
      H * DPR
    );


  canvas.style.width =
    W + "px";


  canvas.style.height =
    H + "px";


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
   STATE
===================================================== */

let running = false;

let lastTime = 0;


let player;
let robber;


let traffic = [];
let particles = [];


let elapsed = 0;
let stageElapsed = 0;


let score = 0;

let displayedSpeed = 136;


let nearMisses = 0;

let combo = 0;
let bestCombo = 0;
let comboTimer = 0;


const MAX_HEARTS = 5;

let hearts = MAX_HEARTS;


let nitro = 0;
let nitroActive = 0;


let spawnTimer = 0;

let stalledSpawnTimer = Infinity;


let shake = 0;

let statusTimer = 0;

let roadScroll = 0;


let policeWorldY = 1100;
let suspectWorldY = 650;


/* =====================================================
   TRANSITION STATE
===================================================== */

let environmentSequence = [];

let environmentStage = 0;


let stageEscape = false;

let stageTauntStarted = false;

let cinematic = false;

let switchingEnvironment = false;


let transitionCardTimer = 0;

let transitionTitle = "";

let transitionSubtitle = "";


let tauntTimer = 0;

let tauntText = "";


/* =====================================================
   BALANCE
===================================================== */

const TRAFFIC_BASE_SPEED = 285;

const TRAFFIC_RELATIVE_MULTIPLIER = 2.4;

const TRAFFIC_MAX_SPEED = 430;


const NITRO_DURATION = 2.7;

const NITRO_SPEED_BONUS = 38;


const MIN_CRASH_SPEED = 104;


/*
  About 2 km/h recovery per second.
*/

const SPEED_RECOVERY_RATE = 2.0;


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


  for (
    let i = 0;
    i < 110;
    i++
  ) {

    rainDrops.push({

      x:
        Math.random() * W,

      y:
        Math.random() * H,

      speed:
        650 +
        Math.random() * 450,

      length:
        18 +
        Math.random() * 25

    });
  }


  for (
    let i = 0;
    i < 85;
    i++
  ) {

    snowFlakes.push({

      x:
        Math.random() * W,

      y:
        Math.random() * H,

      speed:
        45 +
        Math.random() * 90,

      drift:
        -20 +
        Math.random() * 40,

      size:
        1 +
        Math.random() * 3

    });
  }


  for (
    let i = 0;
    i < 50;
    i++
  ) {

    dustParticles.push({

      x:
        Math.random() * W,

      y:
        Math.random() * H,

      speed:
        80 +
        Math.random() * 130

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

  const frame =
    backgroundFrameWidth();


  const width =
    Math.min(
      frame * 0.80,
      550
    );


  return {

    left:
      (W - width) / 2,

    right:
      (W + width) / 2,

    width,

    lanes: 4

  };
}


function laneCenter(lane) {

  const road =
    roadInfo();


  return (

    road.left +

    (
      road.width /
      road.lanes
    ) *

    (
      lane + 0.5
    )

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


  if (
    gameMode === "quick"
  ) {

    environmentSequence = [
      selectedEnvironment
    ];

  } else {

    environmentSequence = [];


    for (
      let i = 0;
      i < environmentOrder.length;
      i++
    ) {

      environmentSequence.push(

        environmentOrder[
          (
            startIndex + i
          ) %
          environmentOrder.length
        ]

      );
    }
  }


  environmentStage = 0;


  activeEnvironment =
    environmentSequence[0];
}


/* =====================================================
   TRANSITION TIMING

   Relative to selected level length.
===================================================== */

function getTauntTime() {

  return Math.max(
    5,
    selectedStageDuration - 8
  );
}


function getEscapeTime() {

  return Math.max(
    7,
    selectedStageDuration - 5
  );
}


function getCinematicTime() {

  return Math.max(
    9,
    selectedStageDuration - 3
  );
}


/* =====================================================
   TAUNTS
===================================================== */

function environmentTaunt(environment) {

  const taunts = {

    city:
      "BACK TO THE CITY. TRY TO KEEP UP!",

    highway:
      "CAN'T CATCH ME THAT FAST! LET'S OPEN IT UP ON THE HIGHWAY!",

    tunnel:
      "STILL THERE? TRY CATCHING ME IN THE TUNNEL!",

    rain:
      "LET'S SEE HOW YOU DO IN THE RAIN!",

    desert:
      "LET'S SEE YOU HANDLE THE DESERT!",

    snow:
      "YOU MADE IT THIS FAR? LET'S SEE HOW YOU DO IN THE SNOW!"

  };


  return (
    taunts[environment] ||
    "CAN'T CATCH ME THAT FAST!"
  );
}


/* =====================================================
   HEART HUD
===================================================== */

function updateHeartsHUD() {

  let output = "";


  for (
    let i = 0;
    i < MAX_HEARTS;
    i++
  ) {

    output +=
      i < hearts
        ? "❤️"
        : "🖤";


    if (
      i < MAX_HEARTS - 1
    ) {

      output += " ";
    }
  }


  heartsValue.textContent =
    output;
}


/* =====================================================
   SCORE HUD
===================================================== */

function updateScoreHUD() {

  const rounded =
    Math.round(score);


  scoreValue.textContent =
    rounded.toLocaleString();


  bestScoreValue.textContent =

    Math.max(
      highScore,
      rounded
    )
    .toLocaleString();
}


/* =====================================================
   STALLED VEHICLE TIMER
===================================================== */

function resetStalledTimer() {

  const settings =
    difficultySettings[
      selectedDifficulty
    ];


  if (
    !Number.isFinite(
      settings.stalledMinTime
    )
  ) {

    stalledSpawnTimer =
      Infinity;

    return;
  }


  stalledSpawnTimer =

    settings.stalledMinTime +

    Math.random() *

    (
      settings.stalledMaxTime -
      settings.stalledMinTime
    );
}


/* =====================================================
   RESET
===================================================== */

function resetGame() {

  buildEnvironmentSequence();


  activeEnvironment =
    environmentSequence[0];


  policeWorldY = 1100;

  suspectWorldY = 650;


  player = {

    x:
      W / 2,

    targetX:
      W / 2,

    screenY:
      H * 0.73,

    width: 76,

    height: 138,

    speed: 136,

    invincible: 0,

    image: "police"

  };


  robber = {

    x:
      laneCenter(1),

    screenY:
      H * 0.27,

    width: 56,

    height: 103,

    speed: 131,

    targetLane: 1,

    laneTimer: 1.5,

    image: "suspect"

  };


  traffic = [];

  particles = [];


  elapsed = 0;

  stageElapsed = 0;


  score = 0;

  displayedSpeed = 136;


  hearts = MAX_HEARTS;


  nearMisses = 0;

  combo = 0;

  bestCombo = 0;

  comboTimer = 0;


  nitro = 0;

  nitroActive = 0;


  spawnTimer = 1.1;


  resetStalledTimer();


  shake = 0;

  statusTimer = 0;

  roadScroll = 0;


  stageEscape = false;

  stageTauntStarted = false;

  cinematic = false;

  switchingEnvironment = false;


  transitionCardTimer = 0;

  tauntTimer = 0;


  nitroFill.style.width = "0%";

  nitroState.textContent =
    "BUILDING";


  nitroUI
    .classList
    .remove("ready");


  updateHeartsHUD();

  updateScoreHUD();


  createWeatherParticles();


  createTrafficCar(
    0,
    H * 0.10
  );


  createTrafficCar(
    3,
    -120
  );


  updateHUD();
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


  title.className =
    "logo";


  title.textContent =
    "PURSUIT";


  subtitle.textContent =
    "CATCH THE CRIMINAL";


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
===================================================== */

let pointerDown = false;

let gestureStartX = 0;
let gestureStartY = 0;

let gestureStartTime = 0;


function steer(clientX) {

  if (!running) return;


  const road =
    roadInfo();


  player.targetX =
    Math.max(

      road.left +
      player.width / 2,

      Math.min(

        road.right -
        player.width / 2,

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


    const swipeUp =

      dy < -45 &&

      Math.abs(dy) >
      Math.abs(dx) * 1.05 &&

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

  if (
    nitro < 100
  ) {

    showStatus(
      "NITRO NOT READY"
    );

    return;
  }


  nitro = 0;

  nitroActive =
    NITRO_DURATION;


  playSound(
    sounds.nitro
  );


  showStatus(
    "NITRO BOOST!"
  );


  shake = 7;


  if (
    navigator.vibrate
  ) {

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


  statusTimer = 1.0;
}


/* =====================================================
   NORMAL TRAFFIC
===================================================== */

function createTrafficCar(
  lane,
  screenY
) {

  const road =
    roadInfo();


  const laneWidth =
    road.width / 4;


  const isTruck =
    Math.random() < 0.06;


  let image;
  let width;
  let height;
  let speed;


  if (isTruck) {

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


  let x =

    laneCenter(lane) +

    (
      Math.random() -
      0.5
    ) *

    laneWidth *
    0.10;


  x =
    Math.max(

      road.left +
      width / 2,

      Math.min(

        road.right -
        width / 2,

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

    passed: false,

    stalled: false

  });
}


/* =====================================================
   STALLED VEHICLES
===================================================== */

function createStalledVehicle(
  lane,
  screenY
) {

  const settings =
    difficultySettings[
      selectedDifficulty
    ];


  const useTruck =

    Math.random() <

    settings
      .stalledTruckChance;


  let image;
  let width;
  let height;


  if (useTruck) {

    image = "truck";

    width = 68;
    height = 144;

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


    width = 50;
    height = 94;
  }


  traffic.push({

    x:
      laneCenter(lane),

    lane,

    screenY,

    width,

    height,

    /*
      Stationary vehicle.
    */

    speed: 0,

    image,

    passed: false,

    stalled: true

  });
}


function spawnStalledFormation() {

  const settings =
    difficultySettings[
      selectedDifficulty
    ];


  if (
    selectedDifficulty ===
    "easy"
  ) {

    return;
  }


  const lanes = [
    0,
    1,
    2,
    3
  ];


  /*
    Shuffle lanes.
  */

  for (
    let i =
      lanes.length - 1;

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
    ] =
    [
      lanes[j],
      lanes[i]
    ];
  }


  /*
    Medium mostly 1 stalled lane.

    Hard sometimes 2.

    Never 3 or 4.
  */

  const count =

    Math.random() <
    settings.doubleStallChance

      ? 2
      : 1;


  for (
    let i = 0;
    i < count;
    i++
  ) {

    createStalledVehicle(

      lanes[i],

      -120 -
      Math.random() * 45

    );
  }


  showStatus(
    count === 2
      ? "⚠️ ROAD HAZARD!"
      : "⚠️ STALLED VEHICLE!"
  );
}


/* =====================================================
   TRAFFIC GROUP
===================================================== */

function spawnTrafficGroup() {

  const lanes = [
    0,
    1,
    2,
    3
  ];


  for (
    let i =
      lanes.length - 1;

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
    ] =
    [
      lanes[j],
      lanes[i]
    ];
  }


  /*
    Preserve our playable traffic balance.
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

      -90 -
      Math.random() * 60

    );
  }
}


/* =====================================================
   COLLISION
===================================================== */

function overlap(a, b) {

  const aw =
    a.image === "police"
      ? a.width * 0.56
      : a.width * 0.70;


  const bw =
    b.image === "police"
      ? b.width * 0.56
      : b.width * 0.70;


  const ah =
    a.image === "police"
      ? a.height * 0.64
      : a.height * 0.74;


  const bh =
    b.image === "police"
      ? b.height * 0.64
      : b.height * 0.74;


  return (

    Math.abs(
      a.x -
      b.x
    ) <
    (
      aw + bw
    ) / 2

    &&

    Math.abs(
      a.screenY -
      b.screenY
    ) <
    (
      ah + bh
    ) / 2

  );
}


/* =====================================================
   CRASH
===================================================== */

function handleCrash() {

  if (
    player.invincible > 0
  ) return;


  const settings =
    difficultySettings[
      selectedDifficulty
    ];


  hearts--;


  updateHeartsHUD();


  /*
    Difficulty-based speed penalty.

    EASY   -12
    MEDIUM -16
    HARD   -20
  */

  player.speed =
    Math.max(

      MIN_CRASH_SPEED,

      player.speed -
      settings.crashSpeedLoss

    );


  displayedSpeed =
    player.speed;


  /*
    Suspect gains ground.
  */

  policeWorldY += 35;


  /*
    Combo lost.
  */

  combo = 0;

  comboTimer = 0;


  /*
    Lose some Nitro.
  */

  nitro =
    Math.max(
      0,
      nitro - 15
    );


  player.invincible = 1.25;


  shake = 12;


  createSparks(
    player.x,
    player.screenY
  );


  playSound(
    sounds.crash
  );


  if (
    navigator.vibrate
  ) {

    navigator.vibrate([
      45,
      30,
      45
    ]);
  }


  if (
    hearts <= 0
  ) {

    finishGame(
      false,
      "VEHICLE DISABLED"
    );

    return;
  }


  showStatus(

    `CRASH! ${hearts} ${
      hearts === 1
        ? "LIFE"
        : "LIVES"
    } LEFT`

  );
}


/* =====================================================
   PARTICLES
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
        Math.random() * 180,

      life:
        0.35 +
        Math.random() * 0.4

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
   CAMERA
===================================================== */

function worldToScreenY(worldY) {

  const midpoint =

    (
      policeWorldY +
      suspectWorldY
    ) / 2;


  return (

    H * 0.5 +

    (
      worldY -
      midpoint
    ) * 0.78

  );
}


/* =====================================================
   LONG CHASE TRANSITION
===================================================== */

function startStageEscape() {

  if (stageEscape) return;


  stageEscape = true;


  traffic = [];


  const next =
    environmentSequence[
      environmentStage + 1
    ];


  if (next) {

    tauntText =
      environmentTaunt(next);


    tauntTimer = 7;
  }


  showStatus(
    "SUSPECT IS MAKING A BREAK FOR IT!"
  );
}


function switchToNextEnvironment() {

  if (
    switchingEnvironment
  ) return;


  switchingEnvironment = true;


  const nextStage =
    environmentStage + 1;


  if (
    nextStage >=
    environmentSequence.length
  ) {

    switchingEnvironment = false;

    return;
  }


  const settings =
    difficultySettings[
      selectedDifficulty
    ];


  /*
    Stage completion bonus.
  */

  score +=
    Math.round(
      750 *
      settings.scoreMultiplier
    );


  environmentStage =
    nextStage;


  activeEnvironment =
    environmentSequence[
      environmentStage
    ];


  stageElapsed = 0;


  stageEscape = false;

  stageTauntStarted = false;

  cinematic = false;


  traffic = [];


  spawnTimer = 1;


  resetStalledTimer();


  /*
    Fresh suspect lead.
  */

  policeWorldY =
    suspectWorldY + 430;


  transitionTitle =
    environments[
      activeEnvironment
    ].name;


  transitionSubtitle =

    "STAGE " +

    (
      environmentStage + 1
    ) +

    " OF " +

    environmentSequence.length;


  transitionCardTimer = 2.2;


  createWeatherParticles();


  updateScoreHUD();


  switchingEnvironment = false;
}


/* =====================================================
   UPDATE
===================================================== */

function update(dt) {

  /*
    Transition card pauses gameplay.
  */

  if (
    transitionCardTimer > 0
  ) {

    transitionCardTimer -= dt;


    updateWeather(dt);

    updateHUD();


    return;
  }


  elapsed += dt;

  stageElapsed += dt;


  const isLong =
    gameMode === "long";


  const isFinalStage =

    environmentStage ===

    environmentSequence.length - 1;


  const difficulty =
    difficultySettings[
      selectedDifficulty
    ];


  /* ===================================================
     LONG CHASE TIMING
  =================================================== */

  if (
    isLong &&
    !isFinalStage
  ) {

    if (
      stageElapsed >=
      getTauntTime() &&
      !stageTauntStarted
    ) {

      stageTauntStarted = true;


      const next =
        environmentSequence[
          environmentStage + 1
        ];


      tauntText =
        environmentTaunt(next);


      tauntTimer = 8;
    }


    if (
      stageElapsed >=
      getEscapeTime() &&
      !stageEscape
    ) {

      startStageEscape();
    }


    if (
      stageElapsed >=
      getCinematicTime()
    ) {

      cinematic = true;
    }


    if (
      stageElapsed >=
      selectedStageDuration
    ) {

      switchToNextEnvironment();

      return;
    }
  }


  if (
    tauntTimer > 0
  ) {

    tauntTimer -= dt;
  }


  /* ===================================================
     COMBO
  =================================================== */

  if (
    comboTimer > 0
  ) {

    comboTimer -= dt;


    if (
      comboTimer <= 0
    ) {

      combo = 0;
    }
  }


  /* ===================================================
     SPEED
  =================================================== */

  let policeSpeed =
    player.speed;


  let suspectSpeed =
    robber.speed;


  if (
    nitroActive > 0
  ) {

    nitroActive -= dt;


    policeSpeed +=
      NITRO_SPEED_BONUS;
  }


  /*
    Transition escape.
  */

  if (
    isLong &&
    stageEscape &&
    !isFinalStage
  ) {

    policeSpeed += 28;

    suspectSpeed += 47;


    if (cinematic) {

      policeSpeed += 17;

      suspectSpeed += 26;
    }
  }


  displayedSpeed =
    policeSpeed;


  suspectWorldY -=
    suspectSpeed * dt;


  policeWorldY -=
    policeSpeed * dt;


  roadScroll +=

    policeSpeed *

    dt *

    (
      cinematic
        ? 4
        : 2.4
    );


  sounds.engine.playbackRate =
    Math.min(

      1.6,

      Math.max(
        0.82,
        policeSpeed / 135
      )

    );


  /* ===================================================
     STEERING
  =================================================== */

  const environment =
    environments[
      activeEnvironment
    ];


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

    const choices = [
      0,
      1,
      2,
      3
    ].filter(

      lane =>
        lane !==
        robber.targetLane

    );


    robber.targetLane =

      choices[

        Math.floor(
          Math.random() *
          choices.length
        )

      ];


    const baseDelay =

      stageElapsed >
      selectedStageDuration * 0.70

        ?

        0.65 +
        Math.random() * 0.65

        :

        1.2 +
        Math.random() * 1.0;


    /*
      Hard suspect changes lanes faster.
    */

    robber.laneTimer =

      baseDelay /

      difficulty.suspectAggression;
  }


  robber.x +=

    (
      laneCenter(
        robber.targetLane
      ) -
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

      H * 0.57,

      Math.min(
        H * 0.78,
        player.screenY
      )

    );


  robber.screenY =
    Math.max(

      H * 0.15,

      Math.min(
        H * 0.39,
        robber.screenY
      )

    );


  let distance =
    getDistance();


  /* ===================================================
     CAPTURE LOCK
  =================================================== */

  if (isLong) {

    const captureUnlocked =

      isFinalStage &&

      stageElapsed >=
      selectedStageDuration;


    if (!captureUnlocked) {

      let minimumDistance = 75;


      if (stageEscape) {

        minimumDistance = 150;
      }


      if (cinematic) {

        minimumDistance = 220;
      }


      if (
        distance <
        minimumDistance
      ) {

        policeWorldY =

          suspectWorldY +

          minimumDistance / 0.7;


        distance =
          getDistance();
      }
    }


    /*
      No automatic Long Chase failure
      from distance.
    */

    if (
      distance > 560
    ) {

      policeWorldY =

        suspectWorldY +

        560 / 0.7;


      distance =
        getDistance();
    }

  } else {

    /*
      Quick chase lasts selected time.
    */

    if (
      elapsed <
      selectedStageDuration &&
      distance < 42
    ) {

      policeWorldY =
        suspectWorldY + 60;


      distance =
        getDistance();
    }
  }


  /* ===================================================
     NORMAL TRAFFIC SPAWN
  =================================================== */

  spawnTimer -= dt;


  if (
    spawnTimer <= 0
  ) {

    const allowTraffic =

      !(
        isLong &&
        stageEscape &&
        !isFinalStage
      );


    if (allowTraffic) {

      spawnTrafficGroup();
    }


    let spawnDelay;


    if (
      stageElapsed < 10
    ) {

      spawnDelay =
        1.15 +
        Math.random() * 0.30;

    } else if (
      stageElapsed < 25
    ) {

      spawnDelay =
        0.85 +
        Math.random() * 0.30;

    } else {

      spawnDelay =
        0.70 +
        Math.random() * 0.25;
    }


    /*
      Higher difficulty =
      slightly more ordinary traffic.
    */

    spawnTimer =

      spawnDelay /

      (
        environment.trafficRate *

        difficulty.trafficMultiplier
      );
  }


  /* ===================================================
     STALLED VEHICLE SPAWN
  =================================================== */

  if (
    !stageEscape
  ) {

    stalledSpawnTimer -= dt;


    if (
      stalledSpawnTimer <= 0
    ) {

      spawnStalledFormation();


      resetStalledTimer();
    }
  }


  /* ===================================================
     TRAFFIC UPDATE
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


    let movement =

      TRAFFIC_BASE_SPEED +

      relativeSpeed *
      TRAFFIC_RELATIVE_MULTIPLIER;


    /*
      Stalled cars feel faster
      because they have zero road speed.
    */

    if (
      car.stalled
    ) {

      movement += 35;
    }


    if (
      car.image === "truck" &&
      !car.stalled
    ) {

      movement -= 25;
    }


    if (
      nitroActive > 0
    ) {

      movement += 55;
    }


    movement =
      Math.min(
        TRAFFIC_MAX_SPEED + 45,
        movement
      );


    car.screenY +=
      movement * dt;


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


    /* Collision */

    if (
      player.invincible <= 0 &&
      overlap(
        player,
        car
      )
    ) {

      handleCrash();


      if (!running) {

        return;
      }
    }


    /* Near miss */

    if (

      !car.passed &&

      car.screenY >

      player.screenY +

      player.height * 0.48

    ) {

      car.passed = true;


      const gap =
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

        gap >
        edge - 8 &&

        gap <
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


        comboTimer = 3;


        /*
          Hard charges Nitro slightly slower.
        */

        nitro =
          Math.min(

            100,

            nitro +

            (
              22 +
              combo * 6
            ) *

            difficulty.nitroMultiplier

          );


        /*
          EASY:
          300 / 600 / 900 / ...

          MEDIUM:
          450 / 900 / 1350 / ...

          HARD:
          600 / 1200 / 1800 / ...
        */

        const reward =
          Math.round(

            300 *

            combo *

            difficulty.scoreMultiplier

          );


        score += reward;


        updateScoreHUD();


        playSound(
          sounds.nearMiss
        );


        showStatus(

          combo === 1

            ?

            `NEAR MISS +${reward}`

            :

            `NEAR MISS x${combo} +${reward}`

        );
      }
    }
  }


  /* ===================================================
     INVINCIBILITY
  =================================================== */

  if (
    player.invincible > 0
  ) {

    player.invincible -= dt;
  }


  /* ===================================================
     SPEED RECOVERY
  =================================================== */

  player.speed =
    Math.min(

      141,

      player.speed +

      SPEED_RECOVERY_RATE * dt

    );


  /* ===================================================
     NITRO HUD
  =================================================== */

  nitroFill.style.width =
    nitro + "%";


  if (
    nitro >= 100 &&
    nitroActive <= 0
  ) {

    nitroState.textContent =
      "SWIPE UP";


    nitroUI
      .classList
      .add("ready");

  } else if (
    nitroActive > 0
  ) {

    nitroState.textContent =
      "BOOSTING";

  } else {

    nitroState.textContent =
      "BUILDING";


    nitroUI
      .classList
      .remove("ready");
  }


  /* ===================================================
     WIN
  =================================================== */

  if (
    gameMode === "quick"
  ) {

    if (
      elapsed >=
      selectedStageDuration &&

      distance <= 18
    ) {

      finishGame(true);

      return;
    }

  } else {

    const finalCaptureUnlocked =

      isFinalStage &&

      stageElapsed >=
      selectedStageDuration;


    if (
      finalCaptureUnlocked &&
      distance <= 18
    ) {

      finishGame(true);

      return;
    }
  }


  /* ===================================================
     QUICK MODE ESCAPE
  =================================================== */

  if (
    gameMode === "quick" &&
    distance >= 650
  ) {

    finishGame(
      false,
      "SUSPECT ESCAPED"
    );

    return;
  }


  /* ===================================================
     FINAL PURSUIT
  =================================================== */

  if (
    isLong &&
    isFinalStage
  ) {

    if (
      stageElapsed >=
      selectedStageDuration - 10 &&
      stageElapsed <
      selectedStageDuration - 3
    ) {

      showStatus(
        "FINAL PURSUIT!"
      );
    }


    if (
      stageElapsed >=
      selectedStageDuration - 3 &&
      distance < 110
    ) {

      showStatus(
        "TAKE HIM DOWN!"
      );
    }
  }


  /* ===================================================
     DRIVING SCORE
  =================================================== */

  score +=

    policeSpeed *

    dt *

    0.10 *

    difficulty.scoreMultiplier;


  updateParticles(dt);

  updateWeather(dt);

  updateHUD();


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
   HUD
===================================================== */

function getEnvironmentHudText() {

  if (
    gameMode === "long"
  ) {

    return (

      environments[
        activeEnvironment
      ].name +

      " • " +

      (
        environmentStage + 1
      ) +

      "/" +

      environmentSequence.length

    );
  }


  return environments[
    activeEnvironment
  ].name;
}


function updateHUD() {

  distanceValue.textContent =
    getDistance() + " m";


  speedValue.textContent =

    Math.round(
      displayedSpeed
    ) +

    " km/h";


  environmentBadge.textContent =
    getEnvironmentHudText();


  const seconds =
    Math.max(

      0,

      Math.ceil(
        selectedStageDuration -
        stageElapsed
      )

    );


  if (
    gameMode === "long"
  ) {

    stageTimer.textContent =

      "STAGE " +

      (
        environmentStage + 1
      ) +

      "/" +

      environmentSequence.length +

      " • " +

      seconds +

      "s";

  } else {

    stageTimer.textContent =
      seconds + "s";
  }


  updateScoreHUD();
}


/* =====================================================
   WEATHER UPDATE
===================================================== */

function updateWeather(dt) {

  if (
    activeEnvironment === "rain"
  ) {

    rainDrops.forEach(drop => {

      drop.y +=
        drop.speed * dt;


      drop.x -=
        85 * dt;


      if (
        drop.y > H + 30
      ) {

        drop.y = -30;


        drop.x =
          Math.random() * W;
      }
    });
  }


  if (
    activeEnvironment === "snow"
  ) {

    snowFlakes.forEach(flake => {

      flake.y +=
        flake.speed * dt;


      flake.x +=
        flake.drift * dt;


      if (
        flake.y > H + 10
      ) {

        flake.y = -10;


        flake.x =
          Math.random() * W;
      }
    });
  }


  if (
    activeEnvironment === "desert"
  ) {

    dustParticles.forEach(dust => {

      dust.x +=
        dust.speed * dt;


      if (
        dust.x > W + 80
      ) {

        dust.x = -80;


        dust.y =
          Math.random() * H;
      }
    });
  }
}


/* =====================================================
   FINISH
===================================================== */

function finishGame(
  win,
  reason = ""
) {

  running = false;


  stopDrivingSounds();


  const difficulty =
    difficultySettings[
      selectedDifficulty
    ];


  if (win) {

    /*
      Remaining-heart bonus.
    */

    score +=

      hearts *

      500 *

      difficulty.scoreMultiplier;


    playSound(
      sounds.capture
    );
  }


  const roundedScore =
    Math.round(score);


  if (
    roundedScore > highScore
  ) {

    highScore = roundedScore;


    try {

      localStorage.setItem(
        HIGH_SCORE_KEY,
        String(highScore)
      );

    } catch (error) {}
  }


  overlay.style.display =
    "flex";


  title.className =
    win
      ? "logo win"
      : "logo lose";


  title.textContent =
    win
      ? "CAPTURED!"
      : "ESCAPED";


  subtitle.textContent =
    win
      ? "MISSION COMPLETE"
      : (
          reason ===
          "VEHICLE DISABLED"
            ? "VEHICLE DISABLED"
            : "CHASE FAILED"
        );


  const heartResults =

    "❤️".repeat(hearts) +

    "🖤".repeat(
      MAX_HEARTS -
      hearts
    );


  message.innerHTML = `

    <strong>
      SCORE ${roundedScore.toLocaleString()}
    </strong>

    &nbsp; • &nbsp;

    BEST ${highScore.toLocaleString()}

    <br>

    ${difficulty.label}
    ×${difficulty.scoreMultiplier}

    &nbsp; • &nbsp;

    NEAR MISSES ${nearMisses}

    <br>

    BEST COMBO
    x${Math.max(1,bestCombo)}

    &nbsp; • &nbsp;

    ${heartResults}

    <br>

    CHASE TIME
    ${elapsed.toFixed(1)} SEC

    ${
      reason
        ? `<br><br>${reason}`
        : ""
    }

  `;


  startBtn.textContent =
    win
      ? "CHASE AGAIN"
      : "TRY AGAIN";
}


/* =====================================================
   BACKGROUND
===================================================== */

function drawBackground() {

  const img =
    environmentImages[
      activeEnvironment
    ];


  ctx.fillStyle =
    "#020910";


  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  if (
    !img ||
    !img.complete ||
    !img.naturalWidth
  ) {

    return;
  }


  const frameWidth =
    backgroundFrameWidth();


  const frameHeight =
    H;


  const imgRatio =
    img.naturalWidth /
    img.naturalHeight;


  const frameRatio =
    frameWidth /
    frameHeight;


  let drawWidth;
  let drawHeight;


  if (
    imgRatio >
    frameRatio
  ) {

    drawHeight =
      frameHeight;


    drawWidth =
      drawHeight *
      imgRatio;

  } else {

    drawWidth =
      frameWidth;


    drawHeight =
      drawWidth /
      imgRatio;
  }


  let zoom = 1;


  if (cinematic) {

    const progress =
      Math.min(

        1,

        (
          stageElapsed -
          getCinematicTime()
        ) /

        (
          selectedStageDuration -
          getCinematicTime()
        )

      );


    zoom =
      1 +
      progress * 0.12;
  }


  const frameX =
    (W - frameWidth) / 2;


  const drawX =

    frameX +

    (
      frameWidth -
      drawWidth
    ) / 2;


  const drawY =
    (H - drawHeight) / 2;


  ctx.save();


  ctx.beginPath();


  ctx.rect(
    frameX,
    0,
    frameWidth,
    H
  );


  ctx.clip();


  ctx.translate(
    W / 2,
    H / 2
  );


  ctx.scale(
    zoom,
    zoom
  );


  ctx.translate(
    -W / 2,
    -H / 2
  );


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
  ) {

    return;
  }


  const depth =
    Math.max(

      0,

      Math.min(
        1,
        car.screenY / H
      )

    );


  let scale =
    0.68 +
    depth * 0.37;


  if (cinematic) {

    scale *= 1.05;
  }


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
    "rgba(0,0,0,.65)";


  ctx.shadowBlur = 13;

  ctx.shadowOffsetY = 7;


  ctx.drawImage(

    img,

    -width / 2,

    -height / 2,

    width,

    height

  );


  ctx.restore();


  /*
    Hazard lights for stalled cars.
  */

  if (
    car.stalled
  ) {

    drawHazardLights(
      car,
      width,
      height
    );
  }
}


/* =====================================================
   STALLED HAZARD LIGHTS
===================================================== */

function drawHazardLights(
  car,
  width,
  height
) {

  const on =

    Math.floor(
      performance.now() / 280
    ) % 2 === 0;


  if (!on) return;


  const lightY =

    car.screenY +

    height * 0.20;


  const spacing =
    width * 0.27;


  ctx.save();


  ctx.shadowColor =
    "#ffb11f";


  ctx.shadowBlur = 18;


  ctx.fillStyle =
    "#ffc32b";


  ctx.beginPath();

  ctx.arc(
    car.x - spacing,
    lightY,
    5,
    0,
    Math.PI * 2
  );

  ctx.fill();


  ctx.beginPath();

  ctx.arc(
    car.x + spacing,
    lightY,
    5,
    0,
    Math.PI * 2
  );

  ctx.fill();


  ctx.restore();
}


/* =====================================================
   POLICE LIGHTS
===================================================== */

function drawPoliceGlow() {

  const flash =

    Math.floor(
      performance.now() / 140
    ) % 2 === 0;


  const lights =

    flash

      ? [
          [
            player.x - 27,
            "255,25,55"
          ],

          [
            player.x + 27,
            "35,110,255"
          ]
        ]

      : [
          [
            player.x + 27,
            "255,25,55"
          ],

          [
            player.x - 27,
            "35,110,255"
          ]
        ];


  lights.forEach(light => {

    const gradient =
      ctx.createRadialGradient(

        light[0],
        player.screenY,
        5,

        light[0],
        player.screenY,
        145

      );


    gradient.addColorStop(
      0,
      `rgba(${light[1]},.48)`
    );


    gradient.addColorStop(
      1,
      `rgba(${light[1]},0)`
    );


    ctx.fillStyle =
      gradient;


    ctx.fillRect(

      player.x - 170,

      player.screenY - 160,

      340,

      320

    );
  });
}


/* =====================================================
   NITRO
===================================================== */

function drawNitro() {

  if (
    nitroActive <= 0
  ) {

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
      90

    );


  gradient.addColorStop(
    0,
    "#d5ffff"
  );

  gradient.addColorStop(
    .22,
    "#45dfff"
  );

  gradient.addColorStop(
    .55,
    "#4775ff"
  );

  gradient.addColorStop(
    1,
    "rgba(75,40,255,0)"
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
    80 +
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
      "rgba(220,240,255,.5)";


    ctx.lineWidth = 1.2;


    rainDrops.forEach(drop => {

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
    });


    ctx.restore();
  }


  if (
    activeEnvironment === "snow"
  ) {

    ctx.save();


    ctx.fillStyle =
      "rgba(255,255,255,.9)";


    snowFlakes.forEach(flake => {

      ctx.beginPath();


      ctx.arc(

        flake.x,

        flake.y,

        flake.size,

        0,

        Math.PI * 2

      );


      ctx.fill();
    });


    ctx.restore();
  }


  if (
    activeEnvironment === "desert"
  ) {

    ctx.save();


    ctx.strokeStyle =
      "rgba(238,190,120,.20)";


    ctx.lineWidth = 2;


    dustParticles.forEach(dust => {

      ctx.beginPath();


      ctx.moveTo(
        dust.x,
        dust.y
      );


      ctx.lineTo(

        dust.x + 40,

        dust.y + 5

      );


      ctx.stroke();
    });


    ctx.restore();
  }
}


/* =====================================================
   PARTICLES DRAW
===================================================== */

function drawParticles() {

  particles.forEach(p => {

    ctx.globalAlpha =
      Math.min(
        1,
        p.life * 2
      );


    ctx.fillStyle =
      "#ffc653";


    ctx.fillRect(
      p.x,
      p.y,
      3,
      8
    );
  });


  ctx.globalAlpha = 1;
}


/* =====================================================
   SUSPECT LABEL
===================================================== */

function drawSuspectMarker() {

  const y =

    robber.screenY -

    robber.height * 0.48 -

    34;


  ctx.fillStyle =
    "#ee203c";


  ctx.fillRect(

    robber.x - 42,

    y,

    84,

    26

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

    y + 18

  );
}


/* =====================================================
   SPEED LINES
===================================================== */

function drawSpeedLines() {

  if (!cinematic) return;


  const progress =
    Math.min(

      1,

      (
        stageElapsed -
        getCinematicTime()
      ) /

      (
        selectedStageDuration -
        getCinematicTime()
      )

    );


  ctx.save();


  ctx.strokeStyle =

    `rgba(
      255,
      255,
      255,
      ${0.14 + progress * 0.36}
    )`;


  ctx.lineWidth = 2;


  const lines =
    20 +
    Math.floor(
      progress * 30
    );


  for (
    let i = 0;
    i < lines;
    i++
  ) {

    const x =
      Math.random() * W;


    const y =
      Math.random() * H;


    const length =
      40 +
      Math.random() * 130;


    ctx.beginPath();


    ctx.moveTo(
      x,
      y
    );


    ctx.lineTo(
      x,
      y + length
    );


    ctx.stroke();
  }


  ctx.restore();
}


/* =====================================================
   TEXT WRAP
===================================================== */

function wrapText(
  text,
  maxChars
) {

  const words =
    text.split(" ");


  const lines = [];


  let current = "";


  words.forEach(word => {

    const test =

      current

        ? current + " " + word

        : word;


    if (
      test.length >
      maxChars &&
      current
    ) {

      lines.push(current);

      current = word;

    } else {

      current = test;
    }
  });


  if (current) {

    lines.push(current);
  }


  return lines;
}


/* =====================================================
   TAUNT
===================================================== */

function drawTaunt() {

  if (
    tauntTimer <= 0
  ) {

    return;
  }


  const lines =
    wrapText(

      tauntText,

      W < 600
        ? 27
        : 42

    );


  ctx.save();


  ctx.textAlign =
    "center";


  ctx.shadowColor =
    "rgba(0,0,0,.95)";


  ctx.shadowBlur = 14;


  ctx.fillStyle =
    "#ff4054";


  ctx.font =
    "900 13px Arial";


  ctx.fillText(

    "SUSPECT",

    W / 2,

    H * 0.30

  );


  const fontSize =
    W < 600
      ? 21
      : 28;


  ctx.font =
    `900 ${fontSize}px Arial`;


  ctx.fillStyle =
    "white";


  lines.forEach(
    (
      line,
      index
    ) => {

      ctx.fillText(

        line,

        W / 2,

        H * 0.35 +

        index *
        (
          fontSize + 6
        )

      );
    }
  );


  ctx.restore();
}


/* =====================================================
   TRANSITION CARD
===================================================== */

function drawTransitionCard() {

  if (
    transitionCardTimer <= 0
  ) {

    return;
  }


  ctx.save();


  ctx.fillStyle =
    "rgba(1,6,12,.92)";


  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  ctx.textAlign =
    "center";


  ctx.fillStyle =
    "#ff4054";


  ctx.font =
    "900 14px Arial";


  ctx.fillText(

    "CHASE CONTINUES",

    W / 2,

    H * 0.40

  );


  ctx.fillStyle =
    "white";


  ctx.font =

    W < 600

      ? "900 35px Arial"

      : "900 48px Arial";


  ctx.fillText(

    transitionTitle,

    W / 2,

    H * 0.50

  );


  ctx.fillStyle =
    "rgba(255,255,255,.70)";


  ctx.font =
    "800 13px Arial";


  ctx.fillText(

    transitionSubtitle,

    W / 2,

    H * 0.56

  );


  ctx.restore();
}


/* =====================================================
   CINEMATIC FADE
===================================================== */

function drawCinematicFade() {

  if (!cinematic) return;


  const progress =
    Math.min(

      1,

      (
        stageElapsed -
        getCinematicTime()
      ) /

      (
        selectedStageDuration -
        getCinematicTime()
      )

    );


  ctx.fillStyle =

    `rgba(
      0,
      0,
      0,
      ${progress * 0.34}
    )`;


  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  if (
    progress > 0.82
  ) {

    const flash =

      (
        progress -
        0.82
      ) /
      0.18;


    ctx.fillStyle =

      `rgba(
        255,
        255,
        255,
        ${flash * 0.78}
      )`;


    ctx.fillRect(
      0,
      0,
      W,
      H
    );
  }
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


  traffic.forEach(
    drawVehicle
  );


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


  drawSpeedLines();


  drawCinematicFade();


  drawTaunt();


  drawTransitionCard();
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
   INITIAL
===================================================== */

setGameMode("quick");

setStageDuration(60);

setDifficulty("easy");


resetGame();

updateMenuText();

draw();
