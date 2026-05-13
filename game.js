const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 600;

// Game constants
const PLAYER_SPEED = 2.75;
const ENEMY_SPEED = 2.25;
const NORMAL_SHOOT_DELAY = 175;
const HYPER_SHOOT_DELAY = 50;
const POWER_UP_TYPES = ['hyper', 'shield'];
const ENEMY_COLORS = ['#ff0000', '#333333'];
const ENEMY_SHAPES = ['rect', 'circle'];
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
    x: 335,
    y: 550,
    width: 30,
    height: 30,
    speed: PLAYER_SPEED,
    forceField: false
};

// Bullets
const bulletSystem = {
    list: [],
    width: 5,
    height: 15,
    speed: 10,
    lastShot: 0,
    shootDelay: NORMAL_SHOOT_DELAY,
    isShooting: false,
    hyperEndTime: 0
};

// Enemies
const enemySystem = {
    list: [],
    width: 30,
    height: 30,
    speed: ENEMY_SPEED,
    lastSpawn: 0,
    spawnDelay: 1200
};

// Power-ups
const powerUpSystem = {
    list: [],
    speed: 1,
    lastSpawn: 0,
    spawnThreshold: 0
};

// Boss enemy
const bossSystem = {
    boss: null,
    width: 60,
    height: 60,
    speed: 1,
    direction: 1,
    health: 30,
    bullets: [],
    bulletWidth: 8,
    bulletHeight: 20,
    bulletSpeed: BOSS_BULLET_SPEED,
    bulletDamage: 1,
    lastShot: 0,
    waveDelay: BOSS_WAVE_DELAY,
    waveCooldown: BOSS_WAVE_COOLDOWN,
    waveCount: 0,
    waveCooldownUntil: 0
};

// Boss defeated flag
let bossDefeated = false;

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
    bossSystem.bullets = [];
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
        // Randomly choose color: red or dark gray to represent different enemy types
        let randomColor = ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)];
        // Randomly choose shape: rectangle (block) or circle (alien-like)
        let randomShape = ENEMY_SHAPES[Math.floor(Math.random() * ENEMY_SHAPES.length)];
        enemySystem.list.push({
            x: Math.random() * (CANVAS_WIDTH - enemySystem.width),
            y: 0,
            color: randomColor,
            shape: randomShape // Add shape property
        });
        enemySystem.lastSpawn = now;
    }
}

// Spawn power-ups randomly after score thresholds
function spawnPowerUp() {
    if (gameState.score - powerUpSystem.spawnThreshold >= POWER_UP_SCORE_BASE + Math.random() * POWER_UP_SCORE_VARIANCE) {
        let type = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
        powerUpSystem.list.push({
            x: Math.random() * (CANVAS_WIDTH - 30),
            y: 0,
            type: type
        });
        powerUpSystem.spawnThreshold = gameState.score;
    }
}

// Spawn the boss enemy when the player's score reaches 250 points
function spawnBoss() {
    if (gameState.score >= BOSS_SPAWN_SCORE && !bossDefeated && bossSystem.boss === null) {
        bossSystem.boss = {
            x: CANVAS_WIDTH / 2 - bossSystem.width / 2, // Start at center top
            y: 0,
            color: '#0000ff', // Blue color for the final boss
            health: bossSystem.health,
            forceField: true,
            forceFieldEndTime: Date.now() + BOSS_FORCE_FIELD_DURATION
        };
        bossSystem.waveCount = 0;
        bossSystem.waveCooldownUntil = 0;
        bossSystem.lastShot = 0;
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
function updateBoss() {
    if (bossSystem.boss) {
        // Check forceField timer
        if (bossSystem.boss.forceField && Date.now() > bossSystem.boss.forceFieldEndTime) {
            bossSystem.boss.forceField = false;
        }

        // Move boss left and right
        bossSystem.boss.x += bossSystem.speed * bossSystem.direction;
        // Reverse direction at edges
        if (bossSystem.boss.x <= 0 || bossSystem.boss.x >= CANVAS_WIDTH - bossSystem.width) {
            bossSystem.direction *= -1;
        }

        let now = Date.now();
        if (now >= bossSystem.waveCooldownUntil) {
            if (bossSystem.waveCount < BOSS_WAVE_BULLET_COUNT) {
                if (now - bossSystem.lastShot > bossSystem.waveDelay) {
                    bossSystem.bullets.push({
                        x: bossSystem.boss.x + bossSystem.width / 2 - bossSystem.bulletWidth / 2,
                        y: bossSystem.boss.y + bossSystem.height
                    });
                    bossSystem.lastShot = now;
                    bossSystem.waveCount++;
                    if (bossSystem.boss.forceField && bossSystem.waveCount === 6) {
                        bossSystem.boss.forceField = false;
                    }
                }
            } else {
                bossSystem.waveCooldownUntil = now + bossSystem.waveCooldown;
                bossSystem.waveCount = 0;
            }
        }

        // Check for bullet collisions with boss
        for (let j = bulletSystem.list.length - 1; j >= 0; j--) {
            if (isCollidingBoss(bulletSystem.list[j], bossSystem.boss)) {
                bulletSystem.list.splice(j, 1);
                if (!bossSystem.boss.forceField) {
                    bossSystem.boss.health--;
                    if (bossSystem.boss.health <= 0) {
                        gameState.score += 50; // Points for defeating the boss
                        bossDefeated = true;
                        bossSystem.boss = null;
                        bossSystem.bullets = [];
                        break;
                    }
                }
            }
        }
    }
}

// Update boss projectiles and check for player hits
function updateBossBullets() {
    for (let i = bossSystem.bullets.length - 1; i >= 0; i--) {
        bossSystem.bullets[i].y += bossSystem.bulletSpeed;
        if (bossSystem.bullets[i].y > CANVAS_HEIGHT) {
            bossSystem.bullets.splice(i, 1);
            continue;
        }

        if (isCollidingPlayer(bossSystem.bullets[i])) {
            if (!player.forceField) {
                gameState.health -= bossSystem.bulletDamage;
                if (gameState.health <= 0) {
                    gameState.health = 0;
                    gameState.over = true;
                    bossSystem.boss = null;
                    bossSystem.bullets = [];
                    document.getElementById('startButton').textContent = 'START GAME';
                    document.getElementById('startButton').disabled = false;
                }
            } else {
                player.forceField = false;
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
           powerUp.x + 30 > player.x &&
           powerUp.y < player.y + player.height &&
           powerUp.y + 30 > player.y;
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
    // Clear and set the background to a dark blue space-like color
    ctx.fillStyle = '#000080';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw the player as a green spaceship (triangle shape for a simple spaceship representation)
    ctx.fillStyle = '#00ff00';
    ctx.beginPath(); // Start drawing a custom shape
    ctx.moveTo(player.x + player.width / 2, player.y); // Top point of the triangle
    ctx.lineTo(player.x, player.y + player.height); // Bottom left
    ctx.lineTo(player.x + player.width, player.y + player.height); // Bottom right
    ctx.closePath(); // Close the path to form the triangle
    ctx.fill(); // Fill the triangle with the current color
    
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
    
    // Draw enemies with their assigned colors and shapes (rectangles as blocks, circles as aliens)
    for (let enemy of enemySystem.list) {
        ctx.fillStyle = enemy.color;
        if (enemy.shape === 'rect') {
            ctx.fillRect(enemy.x, enemy.y, enemySystem.width, enemySystem.height);
        } else if (enemy.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(enemy.x + enemySystem.width / 2, enemy.y + enemySystem.height / 2, enemySystem.width / 2, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    // Draw power-ups
    for (let powerUp of powerUpSystem.list) {
        if (powerUp.type === 'hyper') {
            ctx.fillStyle = '#ffff00'; // Yellow
        } else if (powerUp.type === 'shield') {
            ctx.fillStyle = '#00ff00'; // Green
        }
        ctx.beginPath();
        ctx.arc(powerUp.x + 15, powerUp.y + 15, 15, 0, 2 * Math.PI);
        ctx.fill();
    }

    // Draw boss bullets as blue projectiles coming down from the boss
    ctx.fillStyle = '#00ccff';
    for (let bossBullet of bossSystem.bullets) {
        ctx.fillRect(bossBullet.x, bossBullet.y, bossSystem.bulletWidth, bossSystem.bulletHeight);
    }
    
    // Draw the boss if active (large blue rectangle)
    if (bossSystem.boss) {
        ctx.fillStyle = bossSystem.boss.color;
        ctx.fillRect(bossSystem.boss.x, bossSystem.boss.y, bossSystem.width, bossSystem.height);
        if (bossSystem.boss.forceField) {
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(bossSystem.boss.x + bossSystem.width / 2, bossSystem.boss.y + bossSystem.height / 2, bossSystem.width, 0, 2 * Math.PI);
            ctx.stroke();
        }
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
