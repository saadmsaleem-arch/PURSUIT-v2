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

sounds.siren.volume = 0.28;
sounds.engine.volume = 0.22;
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
    trafficRate: 1.10,
    weather: "clear"
  },

  highway: {
    name: "HIGHWAY DAY",
    grip: 1.05,
    trafficRate: 1.00,
    weather: "clear"
  },

  rain: {
    name: "HEAVY RAIN",
    grip: 0.82,
    trafficRate: 1.06,
    weather: "rain"
  },

  snow: {
    name: "SNOW",
    grip: 0.72,
    trafficRate: 0.94,
    weather: "snow"
  },

  desert: {
    name: "DESERT",
    grip: 0.92,
    trafficRate: 0.96,
    weather: "dust"
  },

  tunnel: {
    name: "TUNNEL",
    grip: 1.00,
    trafficRate: 1.18,
    weather: "tunnel"
  }
};

let selectedEnvironment = "city";

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

const distanceValue =
  document.getElementById("distanceValue");

const speedValue =
  document.getElementById("speedValue");

const environmentBadge =
  document.getElementById("environmentBadge");

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
   MENU
===================================================== */

envButtons.forEach(button => {

  button.addEventListener("click", () => {

    envButtons.forEach(btn => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    selectedEnvironment =
      button.dataset.env;

    message.innerHTML = `
      <strong>${environments[selectedEnvironment].name}</strong>
      <br>
      Catch the suspect before they escape.
    `;
  });

});

soundToggle.addEventListener("click", () => {

  soundEnabled =
    !soundEnabled;

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

  canvas.width =
    Math.round(W * DPR);

  canvas.height =
    Math.round(H * DPR);

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

let shake = 0;
let statusTimer = 0;

let spawnTimer = 0;
let roadScroll = 0;

let policeWorldY = 1000;
let suspectWorldY = 650;

/* =====================================================
   TRAFFIC FEEL
===================================================== */

const TRAFFIC_BASE_SCREEN_SPEED = 340;
const TRAFFIC_RELATIVE_MULTIPLIER = 4.2;
const TRAFFIC_MAX_SCREEN_SPEED = 540;

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

      speed:
        650 +
        Math.random() * 450,

      length:
        18 +
        Math.random() * 25
    });

  }

  for (let i = 0; i < 85; i++) {

    snowFlakes.push({
      x: Math.random() * W,
      y: Math.random() * H,

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

  for (let i = 0; i < 50; i++) {

    dustParticles.push({
      x: Math.random() * W,
      y: Math.random() * H,

      speed:
        80 +
        Math.random() * 130,

      length:
        30 +
        Math.random() * 60
    });

  }

}

/* =====================================================
   BACKGROUND FRAME
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

/* =====================================================
   PLAYABLE ROAD
===================================================== */

function roadInfo() {

  const frameWidth =
    backgroundFrameWidth();

  const width =
    Math.min(
      frameWidth * 0.74,
      520
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

  const laneWidth =
    road.width /
    road.lanes;

  return (
    road.left +
    laneWidth *
    (lane + 0.5)
  );
}

/* =====================================================
   RESET
===================================================== */

function resetGame() {

  policeWorldY = 1000;
  suspectWorldY = 650;

  player = {

    x: W / 2,

    screenY:
      H * 0.76,

    targetX:
      W / 2,

    width:
      78,

    height:
      142,

    speed:
      132,

    invincible:
      0,

    image:
      "police"
  };

  robber = {

    x:
      laneCenter(1),

    screenY:
      H * 0.27,

    width:
      58,

    height:
      106,

    speed:
      123,

    targetLane:
      1,

    laneTimer:
      1.0,

    image:
      "suspect"
  };

  traffic = [];
  particles = [];

  nitro = 0;
  nitroActive = 0;

  elapsed = 0;
  score = 0;

  nearMisses = 0;

  shake = 0;
  statusTimer = 0;

  spawnTimer = 0.10;
  roadScroll = 0;

  distanceValue.textContent =
    getDistance() + " m";

  speedValue.textContent =
    "132 km/h";

  environmentBadge.textContent =
    environments[
      selectedEnvironment
    ].name;

  nitroFill.style.width =
    "0%";

  nitroState.textContent =
    "BUILDING";

  nitroUI.classList.remove(
    "ready"
  );

  createWeatherParticles();

  /*
    Start with LOTS of traffic already visible / nearby.
  */

  for (
    let i = 0;
    i < 15;
    i++
  ) {

    spawnTraffic(
      -20 -
      i * 70
    );

  }
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
      ) *
      0.7
    )

  );
}

/* =====================================================
   START
===================================================== */

function startGame() {

  resetGame();

  title.className =
    "";

  overlay.style.display =
    "none";

  running =
    true;

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

    if (!running) return;

    pointerDown =
      true;

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

canvas.addEventListener(
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

    pointerDown =
      false;

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
      Math.abs(dx) *
      1.1;

    const swipeUp =
      dy < -50 &&
      vertical &&
      duration < 700;

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
    2.35;

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

  shake =
    Math.max(
      shake,
      7
    );

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

  statusTimer =
    0.8;
}

/* =====================================================
   TRAFFIC SPAWN

   IMPORTANT CHANGE:
   Civilian traffic is NOT locked to lanes.
===================================================== */

function spawnTraffic(
  forcedY = null
) {

  const road =
    roadInfo();

  const roll =
    Math.random();

  let image;
  let width;
  let height;
  let speed;

  if (
    roll <
    0.13
  ) {

    image =
      "truck";

    width =
      70;

    height =
      148;

    speed =
      92 +
      Math.random() *
      12;

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

    width =
      52;

    height =
      96;

    speed =
      102 +
      Math.random() *
      18;
  }

  /*
    Instead of exact lane centers,
    cars can appear anywhere across the road.
  */

  const sidePadding =
    width * 0.65;

  const minX =
    road.left +
    sidePadding;

  const maxX =
    road.right -
    sidePadding;

  let trafficX =
    minX +
    Math.random() *
    (
      maxX -
      minX
    );

  /*
    Small bias toward center road so
    we get more middle traffic.
  */

  if (
    Math.random() <
    0.48
  ) {

    const center =
      W / 2;

    trafficX =
      center +
      (
        Math.random() -
        0.5
      ) *
      road.width *
      0.52;
  }

  trafficX =
    Math.max(
      minX,
      Math.min(
        maxX,
        trafficX
      )
    );

  const startY =
    forcedY !== null
      ? forcedY
      : -30 -
        Math.random() *
        260;

  /*
    Only reject if another car is
    ACTUALLY too close horizontally + vertically.
  */

  const overlapRisk =
    traffic.some(car => {

      const horizontal =
        Math.abs(
          car.x -
          trafficX
        );

      const vertical =
        Math.abs(
          car.screenY -
          startY
        );

      return (

        horizontal <
        (
          car.width +
          width
        ) *
        0.55

        &&

        vertical <
        (
          car.height +
          height
        ) *
        0.60

      );

    });

  /*
    During initial population, allow
    another random attempt rather than simply failing.
  */

  if (
    overlapRisk &&
    forcedY !== null
  ) {

    for (
      let attempt = 0;
      attempt < 8;
      attempt++
    ) {

      const alternativeX =
        minX +
        Math.random() *
        (
          maxX -
          minX
        );

      const alternativeBlocked =
        traffic.some(car => {

          const horizontal =
            Math.abs(
              car.x -
              alternativeX
            );

          const vertical =
            Math.abs(
              car.screenY -
              startY
            );

          return (

            horizontal <
            (
              car.width +
              width
            ) *
            0.55

            &&

            vertical <
            (
              car.height +
              height
            ) *
            0.60

          );

        });

      if (
        !alternativeBlocked
      ) {

        trafficX =
          alternativeX;

        traffic.push({

          x:
            trafficX,

          screenY:
            startY,

          width,
          height,

          speed,

          image,

          passed:
            false
        });

        return;
      }
    }

    return;
  }

  if (
    overlapRisk
  ) {

    return;
  }

  traffic.push({

    x:
      trafficX,

    screenY:
      startY,

    width,
    height,

    speed,

    image,

    passed:
      false
  });
}

/* =====================================================
   COLLISION
===================================================== */

function overlapScreen(
  a,
  b
) {

  return (

    Math.abs(
      a.x -
      b.x
    ) <
    (
      a.width +
      b.width
    ) /
    2 -
    10

    &&

    Math.abs(
      a.screenY -
      b.screenY
    ) <
    (
      a.height +
      b.height
    ) /
    2 -
    14
  );
}

/* =====================================================
   SPARKS
===================================================== */

function createSparks(
  x,
  y
) {

  for (
    let i = 0;
    i < 20;
    i++
  ) {

    particles.push({

      x,
      y,

      vx:
        (
          Math.random() -
          0.5
        ) *
        200,

      vy:
        Math.random() *
        190,

      life:
        0.45 +
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
      p.vx *
      dt;

    p.y +=
      p.vy *
      dt;

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
   CAMERA
===================================================== */

function worldToScreenY(
  worldY
) {

  const midpoint =
    (
      policeWorldY +
      suspectWorldY
    ) /
    2;

  return (
    H *
    0.50
    +
    (
      worldY -
      midpoint
    ) *
    0.78
  );
}

/* =====================================================
   FINISH
===================================================== */

function finish(win) {

  running =
    false;

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
        ${environments[selectedEnvironment].name}
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

      Time:
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

  elapsed +=
    dt;

  const environment =
    environments[
      selectedEnvironment
    ];

  const suspectSpeed =
    robber.speed;

  let policeSpeed =
    player.speed;

  /* Nitro */

  if (
    nitroActive >
    0
  ) {

    nitroActive -=
      dt;

    policeSpeed +=
      48;

    if (
      nitroActive <=
      0
    ) {

      nitroState.textContent =
        "BUILDING";
    }
  }

  /* Chase movement */

  suspectWorldY -=
    suspectSpeed *
    dt;

  policeWorldY -=
    policeSpeed *
    dt;

  roadScroll +=
    policeSpeed *
    dt *
    2.4;

  sounds.engine.playbackRate =
    Math.max(

      0.85,

      Math.min(
        1.35,
        policeSpeed /
        130
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

  /* ===================================================
     SUSPECT AI
  =================================================== */

  robber.laneTimer -=
    dt;

  if (
    robber.laneTimer <=
    0
  ) {

    const current =
      robber.targetLane;

    const laneChoices =
      [];

    for (
      let lane = 0;
      lane < 4;
      lane++
    ) {

      if (
        lane !==
        current
      ) {

        laneChoices.push(
          lane
        );
      }
    }

    robber.targetLane =
      laneChoices[
        Math.floor(
          Math.random() *
          laneChoices.length
        )
      ];

    robber.laneTimer =
      0.75 +
      Math.random() *
      1.15;
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
      dt *
      2.8
    );

  /* Chase screen positions */

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

      H *
      0.58,

      Math.min(
        H *
        0.78,
        player.screenY
      )
    );

  robber.screenY =
    Math.max(

      H *
      0.16,

      Math.min(
        H *
        0.39,
        robber.screenY
      )
    );

  /* ===================================================
     BUSY TRAFFIC SPAWN
  =================================================== */

  spawnTimer -=
    dt;

  if (
    spawnTimer <=
    0
  ) {

    /*
      Sometimes add TWO vehicles at once.
    */

    spawnTraffic();

    if (
      Math.random() <
      0.34
    ) {

      spawnTraffic(
        -80 -
        Math.random() *
        180
      );
    }

    const trafficIntensity =
      Math.min(
        1.55,
        1 +
        elapsed /
        70
      );

    spawnTimer =
      (
        0.16 +
        Math.random() *
        0.20
      )
      /
      (
        environment.trafficRate *
        trafficIntensity
      );
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
      TRAFFIC_BASE_SCREEN_SPEED
      +
      relativeSpeed *
      TRAFFIC_RELATIVE_MULTIPLIER;

    if (
      car.image ===
      "truck"
    ) {

      trafficScreenSpeed -=
        45;
    }

    if (
      nitroActive >
      0
    ) {

      trafficScreenSpeed +=
        85;
    }

    trafficScreenSpeed =
      Math.min(
        TRAFFIC_MAX_SCREEN_SPEED,
        trafficScreenSpeed
      );

    car.screenY +=
      trafficScreenSpeed *
      dt;

    /*
      Remove once beyond screen.
    */

    if (
      car.screenY >
      H +
      180
    ) {

      traffic.splice(
        i,
        1
      );

      continue;
    }

    /* Collision */

    if (
      player.invincible <=
      0
      &&
      overlapScreen(
        player,
        car
      )
    ) {

      player.speed =
        Math.max(
          105,
          player.speed -
          28
        );

      policeWorldY +=
        85;

      player.invincible =
        0.9;

      shake =
        18;

      nitro =
        Math.max(
          0,
          nitro -
          20
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

    /* Near miss */

    if (
      !car.passed
      &&
      car.screenY >
      player.screenY +
      player.height *
      0.50
    ) {

      car.passed =
        true;

      const horizontalGap =
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
        horizontalGap >
        edge -
        4
        &&
        horizontalGap <
        edge +
        34
      ) {

        nitro =
          Math.min(
            100,
            nitro +
            25
          );

        nearMisses++;

        score +=
          250;

        playSound(
          sounds.nearMiss
        );

        showStatus(
          "NEAR MISS +250"
        );
      }
    }
  }

  if (
    player.invincible >
    0
  ) {

    player.invincible -=
      dt;
  }

  /* Police acceleration */

  player.speed =
    Math.min(

      154,

      player.speed +
      2.5 *
      dt
    );

  const distance =
    getDistance();

  /* Nitro UI */

  nitroFill.style.width =
    nitro +
    "%";

  if (
    nitro >= 100
    &&
    nitroActive <= 0
  ) {

    nitroState.textContent =
      "SWIPE UP";

    nitroUI.classList.add(
      "ready"
    );

  } else if (
    nitroActive <=
    0
  ) {

    nitroState.textContent =
      "BUILDING";

    nitroUI.classList.remove(
      "ready"
    );
  }

  /* Capture */

  if (
    distance <=
    18
  ) {

    finish(true);

    return;
  }

  /* Escape */

  if (
    distance >=
    520
  ) {

    finish(false);

    return;
  }

  if (
    distance <
    90
  ) {

    showStatus(
      "CLOSING IN!"
    );
  }

  if (
    distance <
    45
  ) {

    showStatus(
      "STAY ON HIM!"
    );
  }

  score +=
    policeSpeed *
    dt *
    0.5;

  updateParticles(
    dt
  );

  updateWeather(
    dt
  );

  distanceValue.textContent =
    distance +
    " m";

  speedValue.textContent =
    Math.round(
      policeSpeed
    ) +
    " km/h";

  if (
    statusTimer >
    0
  ) {

    statusTimer -=
      dt;

    if (
      statusTimer <=
      0
    ) {

      chaseStatus.style.opacity =
        "0";
    }
  }

  shake *=
    0.88;
}

/* =====================================================
   WEATHER UPDATE
===================================================== */

function updateWeather(dt) {

  if (
    selectedEnvironment ===
    "rain"
  ) {

    for (
      const drop of
      rainDrops
    ) {

      drop.y +=
        drop.speed *
        dt;

      drop.x -=
        85 *
        dt;

      if (
        drop.y >
        H +
        30
      ) {

        drop.y =
          -30;

        drop.x =
          Math.random() *
          W;
      }

      if (
        drop.x <
        -30
      ) {

        drop.x =
          W +
          30;
      }
    }
  }

  if (
    selectedEnvironment ===
    "snow"
  ) {

    for (
      const flake of
      snowFlakes
    ) {

      flake.y +=
        flake.speed *
        dt;

      flake.x +=
        flake.drift *
        dt;

      if (
        flake.y >
        H +
        10
      ) {

        flake.y =
          -10;

        flake.x =
          Math.random() *
          W;
      }
    }
  }

  if (
    selectedEnvironment ===
    "desert"
  ) {

    for (
      const dust of
      dustParticles
    ) {

      dust.x +=
        dust.speed *
        dt;

      if (
        dust.x >
        W +
        80
      ) {

        dust.x =
          -80;

        dust.y =
          Math.random() *
          H;
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
      selectedEnvironment
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

  ctx.fillStyle =
    outer;

  ctx.fillRect(
    0,
    0,
    W,
    H
  );

  if (
    !img ||
    !img.complete ||
    img.naturalWidth <=
    0
  ) {

    return;
  }

  const frameWidth =
    backgroundFrameWidth();

  const frameHeight =
    H;

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
    ) /
    2;

  const drawX =
    frameX +
    (
      frameWidth -
      drawWidth
    ) /
    2;

  const drawY =
    (
      H -
      drawHeight
    ) /
    2;

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

  ctx.strokeStyle =
    "rgba(255,255,255,.12)";

  ctx.lineWidth =
    2;

  ctx.strokeRect(
    frameX,
    0,
    frameWidth,
    H
  );
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
        car.screenY /
        H
      )
    );

  const scale =
    0.68 +
    depth *
    0.37;

  const width =
    car.width *
    scale;

  const height =
    car.height *
    scale;

  ctx.save();

  ctx.translate(
    car.x,
    car.screenY
  );

  ctx.rotate(
    Math.PI
  );

  if (
    car.image ===
    "police"
    &&
    player.invincible >
    0
    &&
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
    "rgba(0,0,0,.6)";

  ctx.shadowBlur =
    14;

  ctx.shadowOffsetY =
    8;

  ctx.drawImage(
    img,

    -width /
    2,

    -height /
    2,

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
      ? player.x -
        28
      : player.x +
        28;

  const blueX =
    flash
      ? player.x +
        28
      : player.x -
        28;

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

  ctx.fillStyle =
    red;

  ctx.fillRect(
    player.x -
    170,

    player.screenY -
    160,

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

  ctx.fillStyle =
    blue;

  ctx.fillRect(
    player.x -
    170,

    player.screenY -
    160,

    340,
    320
  );
}

/* =====================================================
   NITRO VISUAL
===================================================== */

function drawNitro() {

  if (
    nitroActive <=
    0
  ) return;

  const gradient =
    ctx.createLinearGradient(
      player.x,

      player.screenY +
      player.height /
      2,

      player.x,

      player.screenY +
      player.height /
      2 +
      70
    );

  gradient.addColorStop(
    0,
    "#a8f9ff"
  );

  gradient.addColorStop(
    0.3,
    "#38baff"
  );

  gradient.addColorStop(
    0.65,
    "#4b61ff"
  );

  gradient.addColorStop(
    1,
    "rgba(80,40,255,0)"
  );

  ctx.fillStyle =
    gradient;

  ctx.beginPath();

  ctx.moveTo(
    player.x -
    14,

    player.screenY +
    player.height /
    2 -
    5
  );

  ctx.lineTo(
    player.x,

    player.screenY +
    player.height /
    2 +
    68 +
    Math.random() *
    15
  );

  ctx.lineTo(
    player.x +
    14,

    player.screenY +
    player.height /
    2 -
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
      "rgba(215,235,255,.54)";

    ctx.lineWidth =
      1.2;

    for (
      const drop of
      rainDrops
    ) {

      ctx.beginPath();

      ctx.moveTo(
        drop.x,
        drop.y
      );

      ctx.lineTo(
        drop.x -
        8,

        drop.y +
        drop.length
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  if (
    selectedEnvironment ===
    "snow"
  ) {

    ctx.save();

    ctx.fillStyle =
      "rgba(255,255,255,.9)";

    for (
      const flake of
      snowFlakes
    ) {

      ctx.beginPath();

      ctx.arc(
        flake.x,
        flake.y,
        flake.size,

        0,
        Math.PI *
        2
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
      "rgba(240,190,120,.20)";

    ctx.lineWidth =
      2;

    for (
      const dust of
      dustParticles
    ) {

      ctx.beginPath();

      ctx.moveTo(
        dust.x,
        dust.y
      );

      ctx.lineTo(
        dust.x +
        dust.length,

        dust.y +
        5
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  if (
    selectedEnvironment ===
    "tunnel"
  ) {

    const pulse =
      (
        Math.sin(
          roadScroll *
          0.045
        ) +
        1
      ) /
      2;

    ctx.fillStyle =
      `rgba(255,205,120,${
        0.012 +
        pulse *
        0.026
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
   PARTICLES
===================================================== */

function drawParticles() {

  for (
    const p of
    particles
  ) {

    ctx.globalAlpha =
      Math.min(
        1,
        p.life *
        2
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

  ctx.globalAlpha =
    1;
}

/* =====================================================
   SUSPECT MARKER
===================================================== */

function drawSuspectMarker() {

  const width =
    80;

  const height =
    25;

  const y =
    robber.screenY -
    robber.height *
    0.48 -
    35;

  ctx.fillStyle =
    "#ed2038";

  ctx.fillRect(
    robber.x -
    width /
    2,

    y,

    width,
    height
  );

  ctx.fillStyle =
    "#fff";

  ctx.font =
    "900 11px Arial";

  ctx.textAlign =
    "center";

  ctx.fillText(
    "SUSPECT",
    robber.x,
    y +
    17
  );
}

/* =====================================================
   VIGNETTE
===================================================== */

function drawVignette() {

  const gradient =
    ctx.createRadialGradient(
      W /
      2,

      H /
      2,

      Math.min(
        W,
        H
      ) *
      0.18,

      W /
      2,

      H /
      2,

      Math.max(
        W,
        H
      ) *
      0.7
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
    const car of
    traffic
  ) {

    drawVehicle(
      car
    );
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
}

/* =====================================================
   LOOP
===================================================== */

function gameLoop(time) {

  if (
    !running
  ) return;

  let dt =
    (
      time -
      lastTime
    ) /
    1000;

  dt =
    Math.min(
      0.033,
      dt ||
      0.016
    );

  lastTime =
    time;

  update(
    dt
  );

  if (
    !running
  ) return;

  ctx.save();

  if (
    shake >
    1
  ) {

    ctx.translate(
      (
        Math.random() -
        0.5
      ) *
      shake,

      (
        Math.random() -
        0.5
      ) *
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
   INITIAL DISPLAY
===================================================== */

resetGame();
draw();
