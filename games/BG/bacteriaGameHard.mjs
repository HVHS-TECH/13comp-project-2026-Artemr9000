//***********************************************************************/
// bacteriaGameHard.js
// Written by Artem, Term 1 2025
// Hard mode 2d shooter - more bacteria, tougher win condition
//***********************************************************************/

// Constants
const bacteriaSize = 100;
const velSign = [-1, 1];
const minVel = 2;
const maxVel = 5;
const extraBacteria = 10;
const powerupDuration = 1;
const invincibleDuration = 1;
const winScore = 5500;
const BACTERIA_HEALTH = 150;  // New constant for bacteria health
const spawnhealthkit = 100
const spawnpowerup = 100 

// Global variables
let health = 100;
let score = 0;
let bacteriaAlive = 150;
let damage = 25;
let powerupActive = false;
let powerupStartTime = 0;
let invincible = false;
let invincibleStartTime = 0;
let startTime = Date.now();
let gameOver = false;

//***********************************************************************/
// preload()
// p5.js preload func - loads game images
//***********************************************************************/
function preload() {
    imgFace = loadImage('/images/bloodcell.png');
    imgVirus = loadImage('/images/virus.png');
    imgHealth = loadImage('/images/green cross.jpg');
    imgPowerup = loadImage('/images/arrow.png');

}

//***********************************************************************/
// setup()
// p5.js setup func - init game env
//***********************************************************************/
function setup() {
    console.log("setup: ");
    canvas = new Canvas(windowWidth, windowHeight);
    world.gravity.y = -0.5;

    createPlayer();
    createWalls();
    spawnBacteria();

    bulletGroup = new Group();

}

//***********************************************************************/
// createPlayer()
// sets up player sprite at center of screen
// Called by setup()
// Input: n/a
// Return: n/a
//***********************************************************************/
function createPlayer() {
    playerSprite = new Sprite(windowWidth/2, windowHeight/2, 65, 65, 'd');
    playerSprite.color = "red";
    playerSprite.mass = 100;
    playerSprite.friction = 0;
    playerSprite.image = imgFace;
    playerSprite.rotationSpeed = 0;

}

//***********************************************************************/
// createWalls()
// creates boundary walls for game area
// Called by setup()
// Input: n/a
// Return: n/a
//***********************************************************************/
function createWalls() {
    wallLeft = new Sprite(0, windowHeight/2, 8, windowHeight, 'k');
    wallLeft.color = 'black';

    wallRight = new Sprite(windowWidth - 5, windowHeight/2, 8, windowHeight, 'k');
    wallRight.color = 'black';

    wallTop = new Sprite(windowWidth/2, 0, windowWidth, 8, 'k');
    wallTop.color = 'black';

    wallBottom = new Sprite(windowWidth/2, windowHeight - 5, windowWidth, 8, 'k');
    wallBottom.color = 'black';

}

//***********************************************************************/
// spawnBacteria()
// spawns initial bacteria enemies across screen
// Called by setup()
// Input: n/a
// Return: n/a
//***********************************************************************/
function spawnBacteria() {
    bacteriaGroup = new Group();
    bacteriaGroup.collides(playerSprite, bacteriaCollision);
    for (let i = 0; i < bacteriaAlive; i++) {
        let randomX = random(0, windowWidth - bacteriaSize);
        let randomY = random(0, windowHeight - 100 - bacteriaSize);

        let bacterium = new Sprite(randomX, randomY, bacteriaSize, 'd');
        bacterium.vel.x = random(minVel, maxVel) * random(velSign);
        bacterium.vel.y = random(minVel, maxVel) * random(velSign);
        bacterium.bounciness = 0;
        bacterium.friction = 0;
        bacterium.image = imgVirus;
        bacterium.damageTaken = 0;  // Track damage instead of health
        bacteriaGroup.add(bacterium);
   
    }

}

//***********************************************************************/
// spawnExtraBacteria()
// spawns extra bacteria when score hits milestone
// Called by draw()
// Input: n/a
// Return: n/a
//***********************************************************************/
function spawnExtraBacteria() {
    if (score > 0 && score % 100 === 0 && bacteriaAlive < 200) {
        for (let i = 0; i < extraBacteria; i++) {
            let randomX = random(0, windowWidth - bacteriaSize);
            let randomY = random(0, windowHeight - 100 - bacteriaSize);

            let bacterium = new Sprite(randomX, randomY, bacteriaSize, 'd');
            bacterium.vel.x = random(minVel, maxVel) * random(velSign);
            bacterium.vel.y = random(minVel, maxVel) * random(velSign);
            bacterium.bounciness = 0;
            bacterium.friction = 0;
            bacterium.image = imgVirus;
            bacterium.damageTaken = 0;  // Track damage instead of health
            bacteriaGroup.add(bacterium);
            bacteriaAlive += 1;
       
        }
        console.log(`Spawned ${extraBacteria} extra bacteria! Total alive: ${bacteriaAlive}`);
   
    }

}

//***********************************************************************/
// createBullet()
// creates bullet sprite on mouse click
// Called by draw()
// Input: n/a
// Return: n/a
//***********************************************************************/
function createBullet() {
    if (mouse.presses()) {
        let bullet = new Sprite(playerSprite.x, playerSprite.y, 15, 'd');
        bullet.color = "yellow";
        bulletGroup.add(bullet);

        let deltaX = mouse.x - playerSprite.x;
        let deltaY = mouse.y - playerSprite.y;
        let deltaAngle = atan2(deltaY, deltaX);
        let bulletSpeed = 15;
        bullet.velocity.x = cos(deltaAngle) * bulletSpeed;
        bullet.velocity.y = sin(deltaAngle) * bulletSpeed;
    
    }

    bulletGroup.collides(bacteriaGroup, bulletHit);
    bulletGroup.collides(wallTop, bulletMissTop);
    bulletGroup.collides(wallBottom, bulletMissBottom);
    bulletGroup.collides(wallLeft, bulletMissLeft);
    bulletGroup.collides(wallRight, bulletMissRight);

}

//***********************************************************************/
// bulletHit(bullet, bacterium)
// handles bullet hitting bacteria - dmg & drops
// Called by createBullet() via collision
// Input: bullet - bullet sprite, bacterium - bacteria sprite
// Return: n/a
//***********************************************************************/
function bulletHit(bullet, bacterium) {
    console.log("Bacteria damage taken before:", bacterium.damageTaken);
    bacterium.damageTaken += damage;
    console.log("Bacteria damage taken after:", bacterium.damageTaken);

    bullet.remove();

    healthKitGroup = new Group();
    healthKitGroup.collides(playerSprite, healthPickup);
    if (bacterium.damageTaken >= BACTERIA_HEALTH) {
        let chancePowerup = Math.floor((Math.random() * 100) + 1);
        let chanceHealthKit = Math.floor((Math.random() * 100) + 1);
        bacteriaAlive -= 1;
        bacterium.remove();
        score += 5;
        console.log("Bacteria destroyed! Remaining:", bacteriaAlive);

        if (chanceHealthKit >= spawnhealthkit) {
            let healthKit = new Sprite(bacterium.x, bacterium.y, 75, 51, 'd');
            healthKit.image = imgHealth;
            healthKitGroup.add(healthKit);
        
        }

        powerupGroup = new Group();
        powerupGroup.collides(playerSprite, activatePowerup);
        if (chancePowerup >= spawnpowerup) {
            let powerup = new Sprite(bacterium.x, bacterium.y, 50, 50, 'd');
            powerup.image = imgPowerup;
            powerupGroup.add(powerup);
        
        }
   
    }

}

//***********************************************************************/
// healthPickup(healthKit, playerSprite)
// increases player health on healthkit touch
// Called by bulletHit() via collision
// Input: healthKit - healthkit sprite, playerSprite - player sprite
// Return: n/a
//***********************************************************************/
function healthPickup(healthKit, playerSprite) {
    health += 5;
    healthKit.remove();
    if (health >= 200) {
        health = 200;
    
    }

}

//***********************************************************************/
// activatePowerup(powerup, playerSprite)
// boosts dmg & gives invincibility on powerup touch
// Called by bulletHit() via collision
// Input: powerup - powerup sprite, playerSprite - player sprite
// Return: n/a
//***********************************************************************/
function activatePowerup(powerup, playerSprite) {
    damage += 5;
    powerupActive = true;
    powerupStartTime = Date.now();

    invincible = true;
    invincibleStartTime = Date.now();
    powerup.remove();

    console.log("Power-up activated! Damage:", damage, "Invincible: true");

}

//***********************************************************************/
// bulletMissTop(bullet, wallTop)
// removes bullet on top wall hit
// Called by createBullet() via collision
// Input: bullet - bullet sprite, wallTop - top wall sprite
// Return: n/a
//***********************************************************************/
function bulletMissTop(bullet, wallTop) {
    bullet.remove();

}

//***********************************************************************/
// bulletMissBottom(bullet, wallBottom)
// removes bullet on bottom wall hit
// Called by createBullet() via collision
// Input: bullet - bullet sprite, wallBottom - bottom wall sprite
// Return: n/a
//***********************************************************************/
function bulletMissBottom(bullet, wallBottom) {
    bullet.remove();

}

//***********************************************************************/
// bulletMissLeft(bullet, wallLeft)
// removes bullet on left wall hit
// Called by createBullet() via collision
// Input: bullet - bullet sprite, wallLeft - left wall sprite
// Return: n/a
//***********************************************************************/
function bulletMissLeft(bullet, wallLeft) {
    bullet.remove();

}

//***********************************************************************/
// bulletMissRight(bullet, wallRight)
// removes bullet on right wall hit
// Called by createBullet() via collision
// Input: bullet - bullet sprite, wallRight - right wall sprite
// Return: n/a
//***********************************************************************/
function bulletMissRight(bullet, wallRight) {
    bullet.remove();

}

//***********************************************************************/
// bacteriaCollision(playerSprite, bacterium)
// reduces player health on bacteria collision
// Called by spawnBacteria() via collision
// Input: playerSprite - player sprite, bacterium - bacteria sprite
// Return: n/a
//***********************************************************************/
function bacteriaCollision(playerSprite, bacterium) {
    if (!invincible) {
        health -= 5;
        if (health <= -5) {
            bacterium.remove();
            gameOver = true;
            noLoop();
        
        }
    
    }

}

//***********************************************************************/
// draw()
// p5.js draw func - runs game loop
//***********************************************************************/
function draw() {
    background('grey');
    handleMovement();
    updateBacteriaMovement();
    createBullet();
    spawnExtraBacteria();

    if (powerupActive) {
        let elapsedPowerupTime = (Date.now() - powerupStartTime) / 1000;
        if (elapsedPowerupTime >= powerupDuration) {
            damage = 25;
            powerupActive = false;
            console.log("Power-up expired! Damage reset to:", damage);
        
        }
   
    }

    if (invincible) {
        let elapsedInvincibleTime = (Date.now() - invincibleStartTime) / 1000;
        if (elapsedInvincibleTime < invincibleDuration && frameCount % 60 === 0) {
            console.log("Player is invincible! Time left:", (invincibleDuration - elapsedInvincibleTime).toFixed(2));
       
        }
        if (elapsedInvincibleTime >= invincibleDuration) {
            invincible = false;
            console.log("Invincibility expired!");
        
        }
    
    }

    if (health <= 0) {
        window.location.href = "/html/hardLose.html";
  
    }

    let elapsedTime = (Date.now() - startTime) / 1000;
    document.getElementById("health").innerHTML = "health =" + health;
    document.getElementById("time").innerHTML = "time =" + elapsedTime.toFixed(2);
    document.getElementById("score").innerHTML = "score =" + score;

    if (score >= winScore) {
        window.location.href = "/html/hardWin.html";
    
    }

}

//***********************************************************************/
// updateBacteriaMovement()
// makes bacteria follow player
// Called by draw()
// Input: n/a
// Return: n/a
//***********************************************************************/
function updateBacteriaMovement() {
    for (let bacterium of bacteriaGroup) {
        let dx = playerSprite.position.x - bacterium.position.x;
        let dy = playerSprite.position.y - bacterium.position.y;
        let followSpeed = 0.0005;
        bacterium.velocity.x += dx * followSpeed;
        bacterium.velocity.y += dy * followSpeed;
   
    }

}

//***********************************************************************/
// handleMovement()
// handles player movement with WASD keys
// Called by draw()
// Input: n/a
// Return: n/a
//***********************************************************************/
function handleMovement() {
    if (kb.pressing('down')) {
        playerSprite.vel.y = 5;
   
    }
    else if (kb.pressing('up')) {
        playerSprite.vel.y = -5;
   
    }
    else if (kb.released('up') || kb.released('down')) {
        playerSprite.vel.y = 0;
   
    }

    if (kb.pressing('right')) {
        playerSprite.vel.x = 5;
        playerSprite.rotationSpeed = 5;
   
    }
    else if (kb.pressing('left')) {
        playerSprite.vel.x = -5;
        playerSprite.rotationSpeed = -5;
  
    }
    else if (kb.released('left') || kb.released('right')) {
        playerSprite.vel.x = 0;
        playerSprite.rotationSpeed = 0;
    
    }


}