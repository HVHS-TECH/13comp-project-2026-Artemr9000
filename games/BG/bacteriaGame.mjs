/**************************************************************/
// bacteriaGame.mjs
// Main game logic for Bacteria Game
// Written by Artem Rakhimov, Term 1 2025
/**************************************************************/

const COL_C = 'white';
const COL_B = '#CD7F32';
console.log('%c bacteriaGame.mjs', 'color: ' + COL_C + '; background-color: ' + COL_B + ';');

import { fb_initialise, fb_saveScore, userDetails, fb_onAuthStateChanged } from '/fb/fb_io.mjs';

// Initialize Firebase
fb_initialise();
fb_onAuthStateChanged();

// Constants
const bacteriaSize = 100;
const velSign = [-1, 1];
const minVel = 2;
const maxVel = 5;
const invincibleDuration = 3;
const powerupDuration = 3;
const winTime = 120;
const bacteriaHealth = 150;
const spawnhealthkit = 60;
const spawnpowerup = 60;
const bacteriaRespawnCount = 50;

// Global variables
let health = 200;
let score = 0;
let bacteriaAlive = 50;
let damage = 50;
let powerupActive = false;
let powerupStartTime = 0;
let invincible = false;
let invincibleStartTime = 0;
let startTime = Date.now();
let gameOver = false;
let imgFace, imgVirus, imgHealth, imgPowerup;
let playerSprite, canvas, bulletGroup, bacteriaGroup, healthKitGroup, powerupGroup;
let wallLeft, wallRight, wallTop, wallBottom;

// p5.js preload func - loads game images
window.preload = () => {
    if (typeof window.loadImage === 'undefined') {
        console.error('loadImage not available. Ensure p5.js is loaded.');
        return;
    }
    imgFace = window.loadImage('/images/bloodcell.png', 
        () => console.log('bloodcell.png loaded successfully'),
        (err) => console.error('Failed to load bloodcell.png:', err));
    imgVirus = window.loadImage('/images/virus.png',
        () => console.log('virus.png loaded successfully'),
        (err) => console.error('Failed to load virus.png:', err));
    imgHealth = window.loadImage('/images/green cross.jpg',
        () => console.log('green cross.jpg loaded successfully'),
        (err) => console.error('Failed to load green cross.jpg:', err));
    imgPowerup = window.loadImage('/images/arrow.png',
        () => console.log('arrow.png loaded successfully'),
        (err) => console.error('Failed to load arrow.png:', err));
};

// p5.js setup func - init game env
window.setup = () => {
    console.log('%c setup(): ', 'color: ' + COL_C + '; background-color: ' + COL_B + ';');
    // Check if user is logged in
    if (userDetails.uid === 'n/a') {
        console.log('No user logged in, redirecting to login');
        window.location.href = '/index.html';
        return;
    }

    canvas = new window.Canvas(window.innerWidth, window.innerHeight);
    window.world.gravity.y = -0.5;

    console.log('Win time:', winTime);

    createPlayer();
    createWalls();
    spawnBacteria();
    html_listen4Debug();

    bulletGroup = new window.Group();
    console.log('Setup complete. Player sprite:', playerSprite, 'Bacteria group:', bacteriaGroup);
};

// createPlayer - sets up player sprite at center of screen
function createPlayer() {
    playerSprite = new window.Sprite(window.innerWidth / 2, window.innerHeight / 2, 35, 35, 'd');
    playerSprite.color = 'red';
    playerSprite.mass = 100;
    playerSprite.friction = 0;
    playerSprite.image = imgFace;
    playerSprite.rotationSpeed = 0;
    console.log('Player created at:', playerSprite.x, playerSprite.y);
}

// createWalls - creates boundary walls for game area
function createWalls() {
    wallLeft = new window.Sprite(0, window.innerHeight / 2, 8, window.innerHeight, 'k');
    wallLeft.color = 'black';
    wallRight = new window.Sprite(window.innerWidth - 5, window.innerHeight / 2, 8, window.innerHeight, 'k');
    wallRight.color = 'black';
    wallTop = new window.Sprite(window.innerWidth / 2, 0, window.innerWidth, 8, 'k');
    wallTop.color = 'black';
    wallBottom = new window.Sprite(window.innerWidth / 2, window.innerHeight - 5, window.innerWidth, 8, 'k');
    wallBottom.color = 'black';
    console.log('Walls created');
}

// spawnBacteria - spawns initial bacteria enemies across screen
function spawnBacteria() {
    bacteriaGroup = new window.Group();
    bacteriaGroup.collides(playerSprite, bacteriaCollision);
    for (let i = 0; i < bacteriaAlive; i++) {
        let randomX = window.random(0, window.innerWidth - bacteriaSize);
        let randomY = window.random(0, window.innerHeight - 100 - bacteriaSize);
        let bacterium = new window.Sprite(randomX, randomY, bacteriaSize, 'd');
        bacterium.vel.x = window.random(minVel, maxVel) * window.random(velSign);
        bacterium.vel.y = window.random(minVel, maxVel) * window.random(velSign);
        bacterium.bounciness = 0;
        bacterium.friction = 0;
        bacterium.image = imgVirus;
        bacterium.damageTaken = 0;
        bacteriaGroup.add(bacterium);
    }
    console.log('Spawned', bacteriaAlive, 'bacteria');
}

// respawnBacteria - spawns new bacteria when count reaches 0
function respawnBacteria() {
    bacteriaAlive = bacteriaRespawnCount;
    spawnBacteria();
    console.log("Respawned", bacteriaAlive, "bacteria!");
}

// createBullet - creates bullet sprite on mouse click
function createBullet() {
    if (window.mouse.presses()) {
        let bullet = new window.Sprite(playerSprite.x, playerSprite.y, 15, 'd');
        bullet.color = 'yellow';
        bulletGroup.add(bullet);
        let deltaX = window.mouse.x - playerSprite.x;
        let deltaY = window.mouse.y - playerSprite.y;
        let deltaAngle = window.atan2(deltaY, deltaX);
        let bulletSpeed = 20;
        bullet.velocity.x = window.cos(deltaAngle) * bulletSpeed;
        bullet.velocity.y = window.sin(deltaAngle) * bulletSpeed;
        console.log('Bullet created at:', bullet.x, bullet.y);
    }

    bulletGroup.collides(bacteriaGroup, bulletHit);
    bulletGroup.collides(wallTop, bulletMissTop);
    bulletGroup.collides(wallBottom, bulletMissBottom);
    bulletGroup.collides(wallLeft, bulletMissLeft);
    bulletGroup.collides(wallRight, bulletMissRight);
}

// bulletHit - handles bullet hitting bacteria
function bulletHit(bullet, bacterium) {
    console.log("Bacteria damage taken before:", bacterium.damageTaken);
    bacterium.damageTaken += damage;
    console.log("Bacteria damage taken after:", bacterium.damageTaken);
    bullet.remove();

    healthKitGroup = new window.Group();
    healthKitGroup.collides(playerSprite, healthPickup);
    if (bacterium.damageTaken >= bacteriaHealth) {
        let chancePowerup = Math.floor((Math.random() * 100) + 1);
        let chanceHealthKit = Math.floor((Math.random() * 100) + 1);
        bacteriaAlive -= 1;
        bacterium.remove();
        score += 10;
        console.log("Bacteria destroyed! Remaining:", bacteriaAlive);

        if (chanceHealthKit >= spawnhealthkit) {
            let healthKit = new window.Sprite(bacterium.x, bacterium.y, 75, 51, 'd');
            healthKit.image = imgHealth;
            healthKitGroup.add(healthKit);
            console.log('Health kit spawned at:', healthKit.x, healthKit.y);
        }

        powerupGroup = new window.Group();
        powerupGroup.collides(playerSprite, activatePowerup);
        if (chancePowerup >= spawnpowerup) {
            let powerup = new window.Sprite(bacterium.x, bacterium.y, 50, 50, 'd');
            powerup.image = imgPowerup;
            powerupGroup.add(powerup);
            console.log('Powerup spawned at:', powerup.x, powerup.y);
        }
    }
}

// healthPickup - increases player health on healthkit touch
function healthPickup(healthKit, player) {
    health += 25;
    healthKit.remove();
    if (health >= 200) {
        health = 200;
    }
    score += 5;
    console.log('Health kit picked up. Health:', health);
}

// activatePowerup - boosts dmg & gives invincibility
function activatePowerup(powerup, player) {
    damage += 25;
    powerupActive = true;
    powerupStartTime = Date.now();
    invincible = true;
    invincibleStartTime = Date.now();
    powerup.remove();
    console.log("Power-up activated! Damage:", damage, "Invincible: true");
    score += 5;
}

// bulletMissTop - removes bullet on top wall hit
function bulletMissTop(bullet, wall) {
    bullet.remove();
}

// bulletMissBottom - removes bullet on bottom wall hit
function bulletMissBottom(bullet, wall) {
    bullet.remove();
}

// bulletMissLeft - removes bullet on left wall hit
function bulletMissLeft(bullet, wall) {
    bullet.remove();
}

// bulletMissRight - removes bullet on right wall hit
function bulletMissRight(bullet, wall) {
    bullet.remove();
}

// bacteriaCollision - reduces player health on bacteria collision
function bacteriaCollision(player, bacterium) {
    if (!invincible) {
        health -= 2;
        score += 1;
        if (health <= -5) {
            bacterium.remove();
            gameOver = true;
            window.noLoop();
        }
    }
}

// html_listen4Debug - registers debug key events
function html_listen4Debug() {
    console.log('%c html_listen4Debug(): ', 'color: white; background-color: purple;');
    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey && event.key === 'z') {
            console.log('%c html_listen4Debug(): ACTIVE', 'color: white; background-color: purple;');
            window.allSprites.debug = true;
            window.frameRate(10);
        } else if (event.ctrlKey && event.key === 'x') {
            console.log('%c html_listen4Debug(): INACTIVE', 'color: white; background-color: purple;');
            window.allSprites.debug = false;
            window.frameRate(60);
        }
    });
}

// p5.js draw func - runs game loop
window.draw = () => {
    window.background('gray'); // Clear canvas each frame
    if (!playerSprite) {
        console.error('Player sprite not defined in draw loop');
        return;
    }
    handleMovement();
    updateBacteriaMovement();
    createBullet();

    if (bacteriaAlive <= 0) {
        respawnBacteria();
    }

    if (powerupActive) {
        let elapsedPowerupTime = (Date.now() - powerupStartTime) / 1000;
        if (elapsedPowerupTime >= powerupDuration) {
            damage = 50;
            powerupActive = false;
            console.log("Power-up expired! Damage reset to:", damage);
        }
    }

    if (invincible) {
        let elapsedInvincibleTime = (Date.now() - invincibleStartTime) / 1000;
        if (elapsedInvincibleTime < invincibleDuration && window.frameCount % 60 === 0) {
            console.log("Player is invincible! Time left:", (invincibleDuration - elapsedInvincibleTime).toFixed(2));
        }
        if (elapsedInvincibleTime >= invincibleDuration) {
            invincible = false;
            console.log("Invincibility expired!");
        }
    }

    if (health <= 0) {
        fb_saveScore('BG', score).then(() => {
            window.location.href = "/html/lose.html";
        }).catch((error) => {
            console.log('Error saving score:', error);
            window.location.href = "/html/lose.html";
        });
    
    }

    let elapsedTime = (Date.now() - startTime) / 1000;
    document.getElementById("health").innerHTML = "health =" + health;
    document.getElementById("time").innerHTML = "time =" + elapsedTime.toFixed(2);
    document.getElementById("score").innerHTML = "score =" + score;

    if (elapsedTime >= winTime) {
        fb_saveScore('BG', score).then(() => {
            window.location.href = "/html/win.html";
        }).catch((error) => {
            console.log('Error saving score:', error);
            window.location.href = "/html/win.html";
        });
    }

    // Debug sprite rendering
    console.log('Draw loop - Player position:', playerSprite.x, playerSprite.y, 'Bacteria count:', bacteriaGroup.length);
};

// updateBacteriaMovement - makes bacteria follow player
function updateBacteriaMovement() {
    if (!bacteriaGroup) {
        console.error('bacteriaGroup not defined in updateBacteriaMovement');
        return;
    }
    for (let bacterium of bacteriaGroup) {
        let dx = playerSprite.position.x - bacterium.position.x;
        let dy = playerSprite.position.y - bacterium.position.y;
        let followSpeed = 0.0003;
        bacterium.velocity.x += dx * followSpeed;
        bacterium.velocity.y += dy * followSpeed;
    }
}

// handleMovement - handles player movement with WASD keys
function handleMovement() {
    if (!playerSprite) {
        console.error('playerSprite not defined in handleMovement');
        return;
    }
    if (window.kb.pressing('down')) {
        playerSprite.vel.y = 5;
    } else if (window.kb.pressing('up')) {
        playerSprite.vel.y = -5;
    } else if (window.kb.released('up') || window.kb.released('down')) {
        playerSprite.vel.y = 0;
    }

    if (window.kb.pressing('right')) {
        playerSprite.vel.x = 5;
        playerSprite.rotationSpeed = 5;
    } else if (window.kb.pressing('left')) {
        playerSprite.vel.x = -5;
        playerSprite.rotationSpeed = -5;
    } else if (window.kb.released('left') || window.kb.released('right')) {
        playerSprite.vel.x = 0;
        playerSprite.rotationSpeed = 0;
    }
}

// Optional: Handle window.onload for additional initialization
window.onload = () => {
    console.log("Window fully loaded, game initialized!");
};