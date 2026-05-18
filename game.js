const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CANVAS_WIDTH = 450;
const CANVAS_HEIGHT = 600;

// Game image assets
const ASSET_PATHS = {
    player: 'images/PlayerImage.png',
    enemy: 'images/EnemyImage.png',
    boss: 'images/BossEnemy.png',
    hyper: 'images/HypershotUpgrade1.png',
    shield: 'images/SheildUpgrade.png',
    asteroid: 'images/Asteroid.png',
    canvasBg: 'images/CanvasBackgroundFinal.png'
};
const images = {};
for (const key in ASSET_PATHS) {
    images[key] = new Image();
    images[key].src = ASSET_PATHS[key];
}

// Game constants
const PLAYER_SPEED = 2.75;
const ENEMY_SPEED = 3.75;
const NORMAL_SHOOT_DELAY = 175;
const HYPER_SHOOT_DELAY = 50;
const POWER_UP_TYPES = ['hyper', 'shield'];
const ENEMY_COLORS = ['#ff0000', '#00ff00'];
const ENEMY_TYPES = ['ship', 'asteroid'];
const POWER_UP_SCORE_BASE = 50;
const POWER_UP_SCORE_VARIANCE = 30;
const BOSS_SPAWN_SCORE = 150;
const BOSS_FORCE_FIELD_DURATION = 5000;
const BOSS_WAVE_BULLET_COUNT = 6;
const BOSS_WAVE_DELAY = 200;
const BOSS_WAVE_COOLDOWN = 10000;
const BOSS_BULLET_SPEED = 8;
const HYPER_POWERUP_DURATION = 10000;

// Game state variables
const gameState = {
    started: false,
    over: false,
    score: 0,
    health: 3
};

// Player properties
const player = {
    x: 160,
    y: 520,
    width: 60, // was 30
    height: 60, // was 30
    speed: PLAYER_SPEED,
    forceField: false
};

// Bullets
const bulletSystem = {
    list: [],
    width: 5, // was 5
    height: 30, // was 15
    speed: 10,
    lastShot: 0,
    shootDelay: NORMAL_SHOOT_DELAY,
    isShooting: false,
    hyperEndTime: 0
};

// Enemies
const enemySystem = {
    list: [],
    width: 60, // was 30
    height: 60, // was 30
    speed: 1.1, // was 2.25
    lastSpawn: 0,
    spawnDelay: 1200 // slightly slower spawning
};

// power-ups
const powerUpSystem = {
    list: [],
    speed: 1,
    lastSpawn: 0,
    spawnThreshold: 0
};

// Boss enemy
const bossSystem = {
    boss: null,
    width: 120, // was 60
    height: 120, // was 60
    speed: 0.5, // was 1
    direction: 1,
    health: 30,
    bullets: [10],
    bulletWidth: 16, // was 8
    bulletHeight: 40, // was 20
    bulletSpeed: 4, // was 8
    bulletDamage: 1,
    lastShot: 0,
    waveDelay: BOSS_WAVE_DELAY,
    waveCooldown: BOSS_WAVE_COOLDOWN,
    waveCount: 0,
    waveCooldownUntil: 0
};

// Boss defeated flag
let bossDefeated = false;

// Boss levels
let bossLevel = 1;
let nextBossSpawn = 250;

// Keyboard input
let keys = {};
document.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && gameState.started && !gameState.over) {
        e.preventDefault();
    }
    keys[e.key] = true;
    
    // Shoot on spacebar
    if (e.key === ' ' && gameState.started && !gameState.over) {
        e.preventDefault();
        bulletSystem.isShooting = true;
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    if (e.key === ' ') {
        bulletSystem.isShooting = false;
    }
});

// Start button
document.getElementById('startButton').addEventListener('click', () => {
    gameState.started = true;
    gameState.over = false;
    gameState.score = 0;
    gameState.health = 3;
    player.x = 335;
    player.forceField = false;
    bulletSystem.list = [];
    bulletSystem.shootDelay = NORMAL_SHOOT_DELAY;
    bulletSystem.hyperEndTime = 0;
    enemySystem.list = [];
    powerUpSystem.list = [];
    powerUpSystem.spawnThreshold = 0;
    bossSystem.boss = null;
    bossSystem.bullets = [10];
    bossSystem.lastShot = 0;
    bossSystem.waveCount = 0;
    bossSystem.waveCooldownUntil = 0;
    bossSystem.direction = 1;
    bulletSystem.lastShot = 0;
    bossDefeated = false;
    document.getElementById('startButton').textContent = 'GAME RUNNING...';
    document.getElementById('startButton').disabled = true;
});

// Update player position - continuous movement
function updatePlayer() {
    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] && player.x < CANVAS_WIDTH - player.width) {
        player.x += player.speed;
    }
}

// Update shooting for continuous fire
function updateShooting() {
    if (bulletSystem.hyperEndTime && Date.now() > bulletSystem.hyperEndTime) {
        bulletSystem.shootDelay = NORMAL_SHOOT_DELAY;
        bulletSystem.hyperEndTime = 0;
    }
    if (bulletSystem.isShooting && Date.now() - bulletSystem.lastShot > bulletSystem.shootDelay) {
        bulletSystem.list.push({
            x: player.x + player.width / 2 - bulletSystem.width / 2,
            y: player.y
        });
        bulletSystem.lastShot = Date.now();
    }
}

// Update bullets
function updateBullets() {
    for (let i = bulletSystem.list.length - 1; i >= 0; i--) {
        bulletSystem.list[i].y -= bulletSystem.speed;
        if (bulletSystem.list[i].y < 0) {
            bulletSystem.list.splice(i, 1);
        }
    }
}

// Spawn enemies randomly with delay between them, assigning random colors and shapes for variety
function spawnEnemy() {
    if (bossSystem.boss) {
        return; // Do not spawn normal enemies while the boss is active
    }
    let now = Date.now();
    if (now - enemySystem.lastSpawn > enemySystem.spawnDelay) {
        let enemyType = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
        let randomColor = ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)];
        let enemyImage = enemyType === 'asteroid' ? 'asteroid' : 'enemy';
        enemySystem.list.push({
     x: Math.random() * (CANVAS_WIDTH - enemySystem.width),
            y: 0,
            color: randomColor,
            type: enemyType,
            image: enemyImage
        });
        enemySystem.lastSpawn = now;
    }
}

// Spawn power-ups randomly after score thresholds
function spawnPowerUp() {
    if (gameState.score - powerUpSystem.spawnThreshold >= POWER_UP_SCORE_BASE + Math.random() * POWER_UP_SCORE_VARIANCE) {
        let type = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
        powerUpSystem.list.push({
            x: Math.random() * (CANVAS_WIDTH - 60),
            y: 0,
            type: type
        });
        powerUpSystem.spawnThreshold = gameState.score;
    }
}

// Spawn stronger boss every 250 score
function spawnBoss() {

    if (gameState.score >= nextBossSpawn && bossSystem.boss === null) {

        bossSystem.boss = {
            x: CANVAS_WIDTH / 2 - bossSystem.width / 2,
            y: 0,

            // Boss gets stronger every level
            health: 30 + bossLevel * 5,
            maxHealth: 30 + bossLevel * 5,

            // Shield active at spawn
            forceField: true,

            // Shield lasts until attack ends
            forceFieldEndTime: 0,

            // ONLY 5 second damage window
            vulnerableUntil: 0
        };

        // Boss difficulty scaling
        bossSystem.speed = 0.5 + bossLevel * 0.1;
        bossSystem.bulletSpeed = 4 + bossLevel * 0.3;

        // Shoots longer every level
        bossSystem.waveCount = 0;
        bossSystem.maxWaveShots = 6 + bossLevel * 2;

        bossSystem.lastShot = 0;
        bossSystem.waveCooldownUntil = 0;
    }
}

// Update enemies
function updateEnemies() {
    for (let i = enemySystem.list.length - 1; i >= 0; i--) {
        enemySystem.list[i].y += enemySystem.speed;
        
        // Enemy reached bottom - lose health
        if (enemySystem.list[i].y > CANVAS_HEIGHT) {
            if (!player.forceField) {
                gameState.health--;
                if (gameState.health <= 0) {
                    gameState.over = true;
                    bossSystem.boss = null;
                    bossSystem.bullets = [];
                    document.getElementById('startButton').textContent = 'START GAME';
                    document.getElementById('startButton').disabled = false;
                }
            } else {
                player.forceField = false;
            }
            enemySystem.list.splice(i, 1);
            continue;
        }
        
        // Check bullet collision
        for (let j = bulletSystem.list.length - 1; j >= 0; j--) {
            if (isColliding(bulletSystem.list[j], enemySystem.list[i])) {
                gameState.score += 10;
                bulletSystem.list.splice(j, 1);
                enemySystem.list.splice(i, 1);
                break;
            }
        }
    }
}

// Update the boss enemy: move horizontally, fire projectiles in waves, and check for bullet collisions
// Update boss
function updateBoss() {

    if (!bossSystem.boss) return;

    // Boss movement
    bossSystem.boss.x += bossSystem.speed * bossSystem.direction;

    // Bounce off walls
    if (
        bossSystem.boss.x <= 0 ||
        bossSystem.boss.x >= CANVAS_WIDTH - bossSystem.width
    ) {
        bossSystem.direction *= -1;
    }

    let now = Date.now();

    // Shield attack phase
    if (bossSystem.boss.forceField) {

        if (now - bossSystem.lastShot > bossSystem.waveDelay) {

            // Middle bullet
            bossSystem.bullets.push({
                x: bossSystem.boss.x + bossSystem.width / 2,
                y: bossSystem.boss.y + bossSystem.height,
                dx: 0
            });

            // Left bullet
            bossSystem.bullets.push({
                x: bossSystem.boss.x + bossSystem.width / 2,
                y: bossSystem.boss.y + bossSystem.height,
                dx: -2
            });

            // Right bullet
            bossSystem.bullets.push({
                x: bossSystem.boss.x + bossSystem.width / 2,
                y: bossSystem.boss.y + bossSystem.height,
                dx: 2
            });

            bossSystem.lastShot = now;

            bossSystem.waveCount++;

            // Longer shield phase
            if (bossSystem.waveCount > 20 + bossLevel * 4) {

                bossSystem.boss.forceField = false;

                // 5 second damage window
                bossSystem.boss.vulnerableUntil = now + 5000;
            }
        }

    } else {

        // Shield returns after 5 seconds
        if (now > bossSystem.boss.vulnerableUntil) {

            bossSystem.boss.forceField = true;

            bossSystem.waveCount = 0;
        }
    }

    // Bullet hits boss
    for (let j = bulletSystem.list.length - 1; j >= 0; j--) {

        if (
            isCollidingBoss(
                bulletSystem.list[j],
                bossSystem.boss
            )
        ) {

            bulletSystem.list.splice(j, 1);

            // Only damage when shield down
            if (!bossSystem.boss.forceField) {

                bossSystem.boss.health--;

                // Boss defeated
                if (bossSystem.boss.health <= 0) {

                    gameState.score += 100;

                    bossLevel++;

                    nextBossSpawn += 250;

                    bossSystem.boss = null;

                    bossSystem.bullets = [];

                    break;
                }
            }
        }
    }
}
        // Check for bullet collisions with boss
        for (let j = bulletSystem.list.length - 1; j >= 0; j--) {
            if (isCollidingBoss(bulletSystem.list[j], bossSystem.boss)) {
                bulletSystem.list.splice(j, 1);
                if (!bossSystem.boss.forceField) {
                    bossSystem.boss.health--;
                   if (bossSystem.boss.health <= 0) {
                     
                        // Score for beating boss
                    gameState.score += 100;
                                        
                        // Next level
                    bossLevel++;

                        // Next boss appears later
                    nextBossSpawn += 250;

                        // Remove boss
                    bossSystem.boss = null;
                    bossSystem.bullets = [];

                    break;
                }
                  
                }
            }
        }



// Move boss bullets
function updateBossBullets() {

    for (let i = bossSystem.bullets.length - 1; i >= 0; i--) {

        // Move down
        bossSystem.bullets[i].y += bossSystem.bulletSpeed;

        // Spread bullets left/right
        bossSystem.bullets[i].x += bossSystem.bullets[i].dx || 0;

        // Remove off screen bullets
        if (bossSystem.bullets[i].y > CANVAS_HEIGHT) {
            bossSystem.bullets.splice(i, 1);
            continue;
        }

        // Player hit
        if (isCollidingPlayer(bossSystem.bullets[i])) {

            gameState.health--;

            if (gameState.health <= 0) {
                gameState.over = true;
            }

            bossSystem.bullets.splice(i, 1);
        }
    }
}

// Update power-ups
function updatePowerUps() {
    for (let i = powerUpSystem.list.length - 1; i >= 0; i--) {
        powerUpSystem.list[i].y += powerUpSystem.speed;
        if (powerUpSystem.list[i].y > CANVAS_HEIGHT) {
            powerUpSystem.list.splice(i, 1);
            continue;
        }

        if (isCollidingPowerUp(powerUpSystem.list[i])) {
            if (powerUpSystem.list[i].type === 'hyper') {
                bulletSystem.shootDelay = HYPER_SHOOT_DELAY;
                bulletSystem.hyperEndTime = Date.now() + HYPER_POWERUP_DURATION;
            } else if (powerUpSystem.list[i].type === 'shield') {
                player.forceField = true;
            }
            powerUpSystem.list.splice(i, 1);
        }
    }
}

// Check if boss bullet hits the player
function isCollidingPlayer(bullet) {
    return bullet.x < player.x + player.width &&
           bullet.x + bossSystem.bulletWidth > player.x &&
           bullet.y < player.y + player.height &&
           bullet.y + bossSystem.bulletHeight > player.y;
}

// Collision detection for boss (uses boss dimensions)
function isCollidingBoss(bullet, boss) {
    return bullet.x < boss.x + bossSystem.width &&
           bullet.x + bulletSystem.width > boss.x &&
           bullet.y < boss.y + bossSystem.height &&
           bullet.y + bulletSystem.height > boss.y;
}

// Collision detection for power-ups
function isCollidingPowerUp(powerUp) {
    return powerUp.x < player.x + player.width &&
           powerUp.x + 60 > player.x &&
           powerUp.y < player.y + player.height &&
           powerUp.y + 60 > player.y;
}

// Collision detection
function isColliding(bullet, enemy) {
    return bullet.x < enemy.x + enemySystem.width &&
           bullet.x + bulletSystem.width > enemy.x &&
           bullet.y < enemy.y + enemySystem.height &&
           bullet.y + bulletSystem.height > enemy.y;
}

// Draw everything on the canvas each frame
function draw() {
    if (images.canvasBg && images.canvasBg.complete) {
        ctx.drawImage(images.canvasBg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
        ctx.fillStyle = '#000080';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
    // Draw the player image when available
    if (images.player && images.player.complete) {
        ctx.drawImage(images.player, player.x, player.y, player.width, player.height);
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
    
    // Draw player forceField
    if (player.forceField) {
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width, 0, 2 * Math.PI);
        ctx.stroke();
    }
    
    // Draw bullets as yellow rectangles moving upward
    ctx.fillStyle = '#ffff00';
    for (let bullet of bulletSystem.list) {
        ctx.fillRect(bullet.x, bullet.y, bulletSystem.width, bulletSystem.height);
    }
    
    // Draw enemies using their assigned images
    for (let enemy of enemySystem.list) {
        if (enemy.image && images[enemy.image] && images[enemy.image].complete) {
            ctx.drawImage(images[enemy.image], enemy.x, enemy.y, enemySystem.width, enemySystem.height);
        } else {
            ctx.fillStyle = enemy.color;
            ctx.fillRect(enemy.x, enemy.y, enemySystem.width, enemySystem.height);
        }
    }

    // Draw power-ups using their images
    for (let powerUp of powerUpSystem.list) {
        if (powerUp.type === 'hyper' && images.hyper && images.hyper.complete) {
            ctx.drawImage(images.hyper, powerUp.x, powerUp.y, 60, 60);
        } else if (powerUp.type === 'shield' && images.shield && images.shield.complete) {
            ctx.drawImage(images.shield, powerUp.x, powerUp.y, 60, 60);
        } else {
            ctx.fillStyle = powerUp.type === 'hyper' ? '#ffff00' : '#00ff00';
            ctx.beginPath();
            ctx.arc(powerUp.x + 30, powerUp.y + 30, 30, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    // Draw boss bullets as blue projectiles coming down from the boss
    ctx.fillStyle = '#00ccff';
    for (let bossBullet of bossSystem.bullets) {
        ctx.fillRect(bossBullet.x, bossBullet.y, bossSystem.bulletWidth, bossSystem.bulletHeight);
    }
    
    // Draw the boss if active
    if (bossSystem.boss) {
        if (images.boss && images.boss.complete) {
            ctx.drawImage(images.boss, bossSystem.boss.x, bossSystem.boss.y, bossSystem.width, bossSystem.height);
        } else {
            ctx.fillStyle = bossSystem.boss.color;
            ctx.fillRect(bossSystem.boss.x, bossSystem.boss.y, bossSystem.width, bossSystem.height);
        }
        if (bossSystem.boss.forceField) {
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(bossSystem.boss.x + bossSystem.width / 2, bossSystem.boss.y + bossSystem.height / 2, bossSystem.width, 0, 2 * Math.PI);
            ctx.stroke();
        }
    }

    // Boss health bar
if (bossSystem.boss) {

    // Black background
    ctx.fillStyle = 'black';
    ctx.fillRect(25, 15, 300, 25);

    // Purple health bar
    ctx.fillStyle = '#8000ff';
    ctx.fillRect(
        25,
        15,
        300 * (bossSystem.boss.health / bossSystem.boss.maxHealth),
        25
    );

    // Boss level text
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.fillText('BOSS LEVEL ' + bossLevel, 105, 33);
}
    // Draw UI elements: score and health at the top left
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + gameState.score, 10, 30);
    ctx.fillText('Health: ' + gameState.health, 10, 60);
    
    // If the game is over, display a semi-transparent overlay and game over message
    if (gameState.over) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Semi-transparent black overlay
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = '20px Arial';
        ctx.fillText('Final Score: ' + gameState.score, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
        ctx.textAlign = 'left'; // Reset text alignment
    }
}

// Game loop that runs continuously to update and render the game
function gameLoop() {
    if (gameState.started && !gameState.over) {
        updatePlayer();
        updateShooting();
        updateBullets();
        spawnEnemy();
        updateEnemies();
        spawnPowerUp();
        updatePowerUps();
        spawnBoss(); // Check if boss should spawn
        updateBoss(); // Update boss if active
        updateBossBullets(); // Update boss projectiles
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();
