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

/* VEHICLES */

loadImage(vehicleImages, "police", "police.png");
loadImage(vehicleImages, "suspect", "suspect.png");
loadImage(vehicleImages, "traffic1", "traffic1.png");
loadImage(vehicleImages, "traffic2", "traffic2.png");
loadImage(vehicleImages, "traffic3", "traffic3.png");
loadImage(vehicleImages, "truck", "truck.png");

/* ENVIRONMENTS */

loadImage(environmentImages, "city", "city.jpg");
loadImage(environmentImages, "highway", "highway.jpg");
loadImage(environmentImages, "rain", "rain.jpg");
loadImage(environmentImages, "snow", "snow.jpg");
loadImage(environmentImages, "desert", "desert.jpg");
loadImage(environmentImages, "tunnel", "tunnel.jpg");

/* =====================================================
   SOUNDS
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
    grip: 1.06,
    trafficRate: 0.88,
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
    trafficRate: 0.78,
    weather: "snow"
  },

  desert: {
    name: "DESERT",
    grip: 0.92,
    trafficRate: 0.75,
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
   ENVIRONMENT SELECTION
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
      <strong>
        ${environments[selectedEnvironment].name}
      </strong>
      <br>
      Catch the suspect before they escape.
    `;

  });

});

/* =====================================================
   SOUND TOGGLE
===================================================== */

soundToggle.addEventListener("click", () => {

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

});

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
   WEATHER
===================================================== */

let rainDrops = [];
let snowFlakes = [];
let dustParticles = [];

function createWeatherParticles() {

  rainDrops = [];
  snowFlakes = [];
  dustParticles = [];

  for (let i = 0; i < 125; i++) {

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
        Math.random() * 26

    });

  }

  for (let i = 0; i < 90; i++) {

    snowFlakes.push({

      x:
        Math.random() * W,

      y:
        Math.random() * H,

      speed:
        45 +
        Math.random() * 90,

      drift:
        -22 +
        Math.random() * 44,

      size:
        1 +
        Math.random() * 3.2

    });

  }

  for (let i = 0; i < 55; i++) {

    dustParticles.push({

      x:
        Math.random() * W,

      y:
        Math.random() * H,

      speed:
        90 +
        Math.random() * 140,

      length:
        30 +
        Math.random() * 60

    });

  }

}

/* =====================================================
   ROAD
===================================================== */

function roadInfo() {

  /*
    Slightly tighter playable road.

    Makes the chase feel faster and
    less like an enormous empty field.
  */

  const width =
    Math.min(
      W * 0.72,
      500
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

  policeWorldY = 1000;
  suspectWorldY = 650;

  player = {

    x:
      W / 2,

    screenY:
      H * 0.76,

    targetX:
      W / 2,

    width:
      80,

    height:
      145,

    speed:
      132,

    invincible:
      0,

    image:
      "police"

  };

  robber = {

    x:
      W / 2,

    screenY:
      H * 0.27,

    width:
      59,

    height:
      108,

    speed:
      123,

    phase:
      0,

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

  spawnTimer = 0.30;

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
      player.width / 2,

      Math.min(

        road.right -
        player.width / 2,

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

    const mostlyVertical =
      Math.abs(dy) >
      Math.abs(dx) *
      1.10;

    const swipeUp =
      dy < -50 &&
      mostlyVertical &&
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
   TRAFFIC
===================================================== */

function spawnTraffic() {

  const road =
    roadInfo();

  const lanes = 4;

  const laneWidth =
    road.width /
    lanes;

  const lane =
    Math.floor(
      Math.random() *
      lanes
    );

  const laneX =
    road.left +
    laneWidth *
    (lane + 0.5);

  const roll =
    Math.random();

  let image;
  let width;
  let height;
  let speed;

  if (
    roll < 0.15
  ) {

    image =
      "truck";

    width =
      77;

    height =
      163;

    /*
      Truck is slower than chase vehicles,
      so you clearly overtake it.
    */

    speed =
      96 +
      Math.random() *
      14;

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
      55;

    height =
      102;

    /*
      Normal highway traffic.
      Faster than before but still
      visibly overtaken.
    */

    speed =
      103 +
      Math.random() *
      15;

  }

  let spawnWorldY =
    policeWorldY -
    370 -
    Math.random() *
    740;

  /*
    Don't spawn cars on top
    of each other in same lane.
  */

  const tooClose =
    traffic.some(car => {

      const sameLane =
        Math.abs(
          car.x -
          laneX
        ) <
        laneWidth *
        0.40;

      const worldDistance =
        Math.abs(
          car.worldY -
          spawnWorldY
        );

      return (
        sameLane &&
        worldDistance <
        210
      );

    });

  if (tooClose) return;

  traffic.push({

    x:
      laneX,

    worldY:
      spawnWorldY,

    screenY:
      -100,

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
    11

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
    16

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
    i < 22;
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
        220,

      vy:
        Math.random() *
        200,

      life:
        0.45 +
        Math.random() *
        0.42

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
    0.82

  );

}

/*
  Traffic gets stronger visual
  relative movement than chase cars.

  This solves the "traffic looks frozen"
  problem.
*/

function trafficWorldToScreenY(
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
    1.18

  );

}

/* =====================================================
   END GAME
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

      Select an environment
      and try again.

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

  /*
    Nitro speed burst
  */

  if (
    nitroActive >
    0
  ) {

    nitroActive -=
      dt;

    policeSpeed +=
      50;

    if (
      nitroActive <=
      0
    ) {

      nitroState.textContent =
        "BUILDING";

    }

  }

  /*
    Both police and suspect
    travel UP the road.
  */

  suspectWorldY -=
    suspectSpeed *
    dt;

  policeWorldY -=
    policeSpeed *
    dt;

  roadScroll +=
    policeSpeed *
    dt *
    2.8;

  /*
    Engine pitch
  */

  sounds.engine.playbackRate =
    Math.max(

      0.85,

      Math.min(
        1.38,
        policeSpeed /
        128
      )

    );

  /*
    Steering
  */

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

  /*
    Suspect lane movement
  */

  robber.phase +=
    dt *
    1.50;

  const road =
    roadInfo();

  const movement =
    Math.min(
      road.width *
      0.28,
      125
    );

  let robberTargetX =
    W /
    2
    +
    Math.sin(
      robber.phase
    ) *
    movement;

  /*
    Suspect panics when cop
    gets close.
  */

  if (
    getDistance() <
    105
  ) {

    robberTargetX +=
      Math.sin(
        robber.phase *
        3.3
      ) *
      30;

  }

  robber.x +=
    (
      robberTargetX -
      robber.x
    ) *
    dt *
    1.8;

  robber.x =
    Math.max(

      road.left +
      36,

      Math.min(

        road.right -
        36,

        robber.x

      )

    );

  /*
    Chase vehicle screen positions
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
      0.15,

      Math.min(
        H *
        0.40,
        robber.screenY
      )

    );

  /*
    TRAFFIC SPAWN
  */

  spawnTimer -=
    dt;

  if (
    spawnTimer <=
    0
  ) {

    spawnTraffic();

    spawnTimer =
      (
        0.34 +
        Math.random() *
        0.40
      )
      /
      environment.trafficRate;

  }

  /*
    TRAFFIC UPDATE
  */

  for (
    let i =
      traffic.length - 1;

    i >= 0;

    i--
  ) {

    const car =
      traffic[i];

    car.worldY -=
      car.speed *
      dt;

    car.screenY =
      trafficWorldToScreenY(
        car.worldY
      );

    /*
      Remove traffic when
      far offscreen.
    */

    if (

      car.screenY >
      H +
      220

      ||

      car.screenY <
      -230

    ) {

      traffic.splice(
        i,
        1
      );

      continue;

    }

    /*
      COLLISION
    */

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
          30
        );

      /*
        Cop loses ground.
      */

      policeWorldY +=
        90;

      player.invincible =
        0.9;

      shake =
        20;

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
          45,
          30,
          45
        ]);

      }

    }

    /*
      NEAR MISS
    */

    if (

      !car.passed

      &&

      car.screenY >
      player.screenY +
      player.height *
      0.48

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
        5

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

  /*
    Invincibility countdown
  */

  if (
    player.invincible >
    0
  ) {

    player.invincible -=
      dt;

  }

  /*
    Police gradually accelerates.
  */

  player.speed =
    Math.min(

      154,

      player.speed +
      2.6 *
      dt

    );

  const distance =
    getDistance();

  /*
    NITRO UI
  */

  nitroFill.style.width =
    nitro +
    "%";

  if (

    nitro >=
    100

    &&

    nitroActive <=
    0

  ) {

    nitroState.textContent =
      "SWIPE UP";

    nitroUI.classList.add(
      "ready"
    );

  }

  else if (
    nitroActive <=
    0
  ) {

    nitroState.textContent =
      "BUILDING";

    nitroUI.classList.remove(
      "ready"
    );

  }

  /*
    Capture
  */

  if (
    distance <=
    18
  ) {

    finish(true);

    return;

  }

  /*
    Escape
  */

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
    0.55;

  updateParticles(dt);

  updateWeather(dt);

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
    0.87;

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
        90 *
        dt;

      if (
        drop.y >
        H +
        40
      ) {

        drop.y =
          -40;

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
        15
      ) {

        flake.y =
          -15;

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
        100
      ) {

        dust.x =
          -100;

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

  if (
    !img ||
    !img.complete ||
    img.naturalWidth <= 0
  ) {

    ctx.fillStyle =
      "#171f27";

    ctx.fillRect(
      0,
      0,
      W,
      H
    );

    return;

  }

  const imageRatio =
    img.naturalWidth /
    img.naturalHeight;

  const screenRatio =
    W /
    H;

  /*
    Cinematic crop.

    Slight zoom increases
    as speed rises.
  */

  const speedAmount =
    Math.max(
      0,
      Math.min(
        1,
        (
          player.speed -
          110
        ) /
        50
      )
    );

  let zoom =
    1.06 +
    speedAmount *
    0.035;

  if (
    nitroActive >
    0
  ) {

    zoom +=
      0.025;

  }

  let drawWidth;
  let drawHeight;

  if (
    imageRatio >
    screenRatio
  ) {

    drawHeight =
      H *
      zoom;

    drawWidth =
      drawHeight *
      imageRatio;

  } else {

    drawWidth =
      W *
      zoom;

    drawHeight =
      drawWidth /
      imageRatio;

  }

  /*
    Tiny movement creates life
    without ruining perspective.
  */

  const backgroundMovement =
    Math.sin(
      roadScroll *
      0.008
    ) *
    4;

  const drawX =
    (
      W -
      drawWidth
    ) /
    2;

  const drawY =
    (
      H -
      drawHeight
    ) /
    2
    +
    backgroundMovement;

  ctx.drawImage(

    img,

    drawX,
    drawY,

    drawWidth,
    drawHeight

  );

}

/* =====================================================
   SPEED EFFECTS
===================================================== */

function drawSpeedEffects() {

  const road =
    roadInfo();

  const amount =
    Math.max(

      0,

      Math.min(
        1,
        (
          player.speed -
          115
        ) /
        40
      )

    );

  if (
    amount <=
    0
  ) return;

  ctx.save();

  /*
    Road streaks
  */

  ctx.strokeStyle =
    `rgba(
      255,
      255,
      255,
      ${0.035 + amount * 0.065}
    )`;

  ctx.lineWidth =
    1 +
    amount *
    1.5;

  const count =
    10 +
    Math.round(
      amount *
      16
    );

  for (
    let i = 0;
    i < count;
    i++
  ) {

    const x =
      road.left +
      Math.random() *
      road.width;

    const y =
      Math.random() *
      H;

    const length =
      25 +
      amount *
      75;

    ctx.beginPath();

    ctx.moveTo(
      x,
      y
    );

    ctx.lineTo(
      x,
      y +
      length
    );

    ctx.stroke();

  }

  /*
    Edge streaks
  */

  ctx.strokeStyle =
    `rgba(
      210,
      235,
      255,
      ${0.025 + amount * 0.07}
    )`;

  for (
    let i = 0;
    i < 12;
    i++
  ) {

    const leftSide =
      Math.random() >
      0.5;

    const x =
      leftSide
        ? Math.random() *
          Math.max(
            1,
            road.left
          )
        : road.right +
          Math.random() *
          Math.max(
            1,
            W -
            road.right
          );

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
      70 +
      amount *
      110
    );

    ctx.stroke();

  }

  ctx.restore();

}

/* =====================================================
   VEHICLE DRAWING
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

  /*
    Stronger perspective.

    Far cars = visibly smaller.
    Nearby cars = larger.
  */

  const perspectiveScale =
    0.58 +
    depth *
    0.58;

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
    Sprite source faces down.
    Rotate upward.
  */

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
    "rgba(0,0,0,.58)";

  ctx.shadowBlur =
    16;

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
   POLICE LIGHT GLOW
===================================================== */

function drawPoliceGlow() {

  const flash =
    Math.floor(
      performance.now() /
      145
    ) %
    2 ===
    0;

  const redX =
    flash
      ? player.x -
        30
      : player.x +
        30;

  const blueX =
    flash
      ? player.x +
        30
      : player.x -
        30;

  /*
    Larger red wash
  */

  const red =
    ctx.createRadialGradient(

      redX,
      player.screenY,

      5,

      redX,
      player.screenY,

      175

    );

  red.addColorStop(
    0,
    "rgba(255,18,50,.50)"
  );

  red.addColorStop(
    0.35,
    "rgba(255,18,50,.17)"
  );

  red.addColorStop(
    1,
    "rgba(255,18,50,0)"
  );

  ctx.fillStyle =
    red;

  ctx.fillRect(

    player.x -
    210,

    player.screenY -
    190,

    420,
    380

  );

  /*
    Larger blue wash
  */

  const blue =
    ctx.createRadialGradient(

      blueX,
      player.screenY,

      5,

      blueX,
      player.screenY,

      175

    );

  blue.addColorStop(
    0,
    "rgba(25,105,255,.52)"
  );

  blue.addColorStop(
    0.35,
    "rgba(25,105,255,.18)"
  );

  blue.addColorStop(
    1,
    "rgba(25,105,255,0)"
  );

  ctx.fillStyle =
    blue;

  ctx.fillRect(

    player.x -
    210,

    player.screenY -
    190,

    420,
    380

  );

}

/* =====================================================
   NITRO EFFECT
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
      85

    );

  gradient.addColorStop(
    0,
    "#c0fbff"
  );

  gradient.addColorStop(
    0.18,
    "#45d8ff"
  );

  gradient.addColorStop(
    0.48,
    "#326cff"
  );

  gradient.addColorStop(
    1,
    "rgba(75,35,255,0)"
  );

  ctx.fillStyle =
    gradient;

  ctx.beginPath();

  ctx.moveTo(

    player.x -
    17,

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
    75 +
    Math.random() *
    22

  );

  ctx.lineTo(

    player.x +
    17,

    player.screenY +
    player.height /
    2 -
    5

  );

  ctx.closePath();

  ctx.fill();

}

/* =====================================================
   WEATHER DRAWING
===================================================== */

function drawWeather() {

  if (
    selectedEnvironment ===
    "rain"
  ) {

    ctx.save();

    ctx.strokeStyle =
      "rgba(210,230,255,.56)";

    ctx.lineWidth =
      1.25;

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
        9,
        drop.y +
        drop.length
      );

      ctx.stroke();

    }

    ctx.fillStyle =
      "rgba(10,35,62,.075)";

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
      "rgba(245,198,130,.20)";

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
        6

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
          0.043
        ) +
        1
      ) /
      2;

    ctx.fillStyle =
      `rgba(
        255,
        205,
        115,
        ${
          0.012 +
          pulse *
          0.028
        }
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
   SPARK DRAWING
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
      10

    );

  }

  ctx.globalAlpha =
    1;

}

/* =====================================================
   VIGNETTE
===================================================== */

function drawVignette() {

  const gradient =
    ctx.createRadialGradient(

      W /
      2,

      H *
      0.48,

      Math.min(
        W,
        H
      ) *
      0.20,

      W /
      2,

      H *
      0.50,

      Math.max(
        W,
        H
      ) *
      0.72

    );

  gradient.addColorStop(
    0,
    "rgba(0,0,0,0)"
  );

  gradient.addColorStop(
    0.66,
    "rgba(0,0,0,.05)"
  );

  gradient.addColorStop(
    1,
    "rgba(0,0,0,.40)"
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
   SUSPECT MARKER
===================================================== */

function drawSuspectMarker() {

  const labelWidth =
    82;

  const labelHeight =
    25;

  const labelY =
    robber.screenY -
    robber.height *
    0.47 -
    37;

  ctx.save();

  ctx.shadowColor =
    "rgba(255,20,45,.45)";

  ctx.shadowBlur =
    12;

  ctx.fillStyle =
    "rgba(235,20,45,.94)";

  ctx.fillRect(

    robber.x -
    labelWidth /
    2,

    labelY,

    labelWidth,
    labelHeight

  );

  ctx.shadowBlur =
    0;

  ctx.fillStyle =
    "#fff";

  ctx.font =
    "900 11px Arial";

  ctx.textAlign =
    "center";

  ctx.fillText(

    "SUSPECT",

    robber.x,

    labelY +
    17

  );

  /*
    Pointer underneath label
  */

  ctx.fillStyle =
    "rgba(235,20,45,.94)";

  ctx.beginPath();

  ctx.moveTo(
    robber.x -
    6,
    labelY +
    labelHeight
  );

  ctx.lineTo(
    robber.x +
    6,
    labelY +
    labelHeight
  );

  ctx.lineTo(
    robber.x,
    labelY +
    labelHeight +
    8
  );

  ctx.closePath();

  ctx.fill();

  ctx.restore();

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

  drawSpeedEffects();

  /*
    Traffic behind chase cars
  */

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

  update(dt);

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
