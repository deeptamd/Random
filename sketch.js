let flock;
let weatherData; // To store the weather data
let apiURL = "https://api.openweathermap.org/data/2.5/weather?q=Bengaluru&APPID=aacedc9a30cfcbe4d7e237cd5ad4830b";

let currentTemp = 273; // Initial temperature in Kelvin
let targetTemp = 273; // Target temperature
let currentHumidity = 50; // Initial humidity
let targetHumidity = 50;
let daylightValue = 0; // Amount of sunlight
let weatherCondition = ""; // Current weather condition

let daylightSlider; // Slider for controlling daylight
let humiditySlider; // Slider for controlling humidity
let skyConditionSlider; // Slider for controlling sky condition

let murmurationSound; // Sound object for murmuration
let repelSound; // Sound object for repelling effect

let repelPoints = []; // Array to store multiple repelling points

function preload() {
  murmurationSound = loadSound("STARLINGS.mp3"); // Load the murmuration sound
  repelSound = loadSound("FLIGHT.mp3"); // Load the repel sound
}

function setup() {
  createCanvas(800, 800);
  createP("Click anywhere to disperse the flock.");
  loadWeatherData(); // Fetch initial weather data
  setInterval(loadWeatherData, 10000); // Update every 30 seconds

  flock = new Flock();

  // Add an initial set of boids into the system
  for (let i = 0; i < 200; i++) {
    let b = new Boid(width / 2 + random(-50, 50), height / 2 + random(-50, 50));
    flock.addBoid(b);
  }

  murmurationSound.loop(); // Start the murmuration sound
}

function draw() {
  background(255);

  if (weatherData) {
    currentTemp = lerp(currentTemp, targetTemp, 0.05);
    currentHumidity = lerp(currentHumidity, targetHumidity, 0.05);
  }

  flock.run();

  if (repelPoints.length > 0) {
    flock.repelMultiple(repelPoints);
  }
}

function mousePressed() {
  repelPoints.push(createVector(mouseX, mouseY));
  repelSound.play(0, 1, 0.2, 0, 1.5);
}

function mouseReleased() {
  if (repelSound.isPlaying()) {
    repelSound.fade(0, 1.5);
  }
  repelPoints = [];
}

class Flock {
  constructor() {
    this.boids = [];
  }

  run() {
    for (let boid of this.boids) {
      boid.run(this.boids);
    }

    this.renderBlob(); // Render the organic blob shape
  }

  repelMultiple(points) {
    for (let point of points) {
      for (let boid of this.boids) {
        let distance = p5.Vector.dist(boid.position, point);
        if (distance < 200) {
          let repelForce = p5.Vector.sub(boid.position, point);
          repelForce.setMag(map(distance, 0, 200, boid.maxforce * 20, 0));
          boid.applyForce(repelForce);
        }
      }
    }
  }

  addBoid(b) {
    this.boids.push(b);
  }

  renderBlob() {
    noStroke();
    fill(100, 100, 255, 50); // Soft blue with transparency
    beginShape();

    for (let boid of this.boids) {
      vertex(boid.position.x, boid.position.y);
    }

    endShape(CLOSE);
  }
}

class Boid {
  constructor(x, y) {
    this.acceleration = createVector(0, 0);
    this.velocity = createVector(random(-1, 1), random(-1, 1));
    this.position = createVector(x, y);
    this.maxspeed = 2;
    this.maxforce = 0.1;
  }

  run(boids) {
    this.flock(boids);
    this.update();
    this.borders();
  }

  applyForce(force) {
    this.acceleration.add(force);
  }

  flock(boids) {
    let sep = this.separate(boids).mult(1.5);
    let ali = this.align(boids).mult(1.0);
    let coh = this.cohesion(boids).mult(1.0);
    let compress = this.compress(boids).mult(0.5); // Compression to create blob shape

    this.applyForce(sep);
    this.applyForce(ali);
    this.applyForce(coh);
    this.applyForce(compress);
  }

  compress(boids) {
    let center = createVector(width / 2, height / 2);
    let force = p5.Vector.sub(center, this.position);
    force.setMag(0.01); // Weak force pulling boids toward center
    return force;
  }

  update() {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxspeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
  }

  borders() {
    let margin = 50;
    if (this.position.x < margin) this.position.x = width - margin;
    if (this.position.y < margin) this.position.y = height - margin;
    if (this.position.x > width - margin) this.position.x = margin;
    if (this.position.y > height - margin) this.position.y = margin;
  }

  separate(boids) {
    let desiredSeparation = 25;
    let steer = createVector(0, 0);
    let count = 0;

    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if (d > 0 && d < desiredSeparation) {
        let diff = p5.Vector.sub(this.position, other.position);
        diff.normalize();
        diff.div(d);
        steer.add(diff);
        count++;
      }
    }

    if (count > 0) {
      steer.div(count);
      if (steer.mag() > 0) {
        steer.normalize();
        steer.mult(this.maxspeed);
        steer.sub(this.velocity);
        steer.limit(this.maxforce);
      }
    }
    return steer;
  }

  align(boids) {
    let neighborDist = 50;
    let sum = createVector(0, 0);
    let count = 0;

    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if (d > 0 && d < neighborDist) {
        sum.add(other.velocity);
        count++;
      }
    }

    if (count > 0) {
      sum.div(count);
      sum.normalize();
      sum.mult(this.maxspeed);
      let steer = p5.Vector.sub(sum, this.velocity);
      steer.limit(this.maxforce);
      return steer;
    }
    return createVector(0, 0);
  }

  cohesion(boids) {
    let neighborDist = 50;
    let sum = createVector(0, 0);
    let count = 0;

    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if (d > 0 && d < neighborDist) {
        sum.add(other.position);
        count++;
      }
    }

    if (count > 0) {
      sum.div(count);
      sum.sub(this.position);
      sum.normalize();
      sum.mult(this.maxspeed);
      let steer = p5.Vector.sub(sum, this.velocity);
      steer.limit(this.maxforce);
      return steer;
    }
    return createVector(0, 0);
  }
}
