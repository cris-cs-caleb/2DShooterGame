const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;

// Game state
let gameStarted = false;
let gameOver = false;
let score = 0;
let health = 3;

// Player
let playerX = 175;
let playerY = 550;
let playerWidth = 30;
let playerHeight = 30;

// Bullets array
let bullets = [];
let bulletWidth = 5;
let bulletHeight = 15;
let bulletSpeed = 5;

// Enemies array
let enemies = [];
let enemyWidth = 30;
let enemyHeight = 30;
let enemySpeed = 2;
let lastEnemySpawn = 0;
let enemySpawnDelay = 1200; // milliseconds between spawns

// Keyboard input
let keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // Shoot on spacebar
    if (e.key === ' ' && gameStarted && !gameOver) {
        e.preventDefault();
        bullets.push({
            x: playerX + playerWidth / 2 - bulletWidth / 2,
            y: playerY
        });
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Start button
document.getElementById('startButton').addEventListener('click', () => {
    gameStarted = true;
    gameOver = false;
    score = 0;
    health = 3;
    playerX = 175;
    bullets = [];
    enemies = [];
    document.getElementById('startButton').textContent = 'GAME RUNNING...';
    document.getElementById('startButton').disabled = true;
});

// Update player position - continuous movement
function updatePlayer() {
    if (keys['ArrowLeft'] && playerX > 0) {
        playerX -= 3;
    }
    if (keys['ArrowRight'] && playerX < CANVAS_WIDTH - playerWidth) {
        playerX += 3;
    }
}

// Update bullets
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bulletSpeed;
        if (bullets[i].y < 0) {
            bullets.splice(i, 1);
        }
    }
}

// Spawn enemies randomly with delay between them
function spawnEnemy() {
    let now = Date.now();
    if (now - lastEnemySpawn > enemySpawnDelay) {
        enemies.push({
            x: Math.random() * (CANVAS_WIDTH - enemyWidth),
            y: 0
        });
        lastEnemySpawn = now;
    }
}

// Update enemies
function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].y += enemySpeed;
        
        // Enemy reached bottom - lose health
        if (enemies[i].y > CANVAS_HEIGHT) {
            health--;
            enemies.splice(i, 1);
            if (health <= 0) {
                gameOver = true;
                document.getElementById('startButton').textContent = 'START GAME';
                document.getElementById('startButton').disabled = false;
            }
            continue;
        }
        
        // Check bullet collision
        for (let j = bullets.length - 1; j >= 0; j--) {
            if (isColliding(bullets[j], enemies[i])) {
                score += 10;
                bullets.splice(j, 1);
                enemies.splice(i, 1);
                break;
            }
        }
    }
}

// Collision detection
function isColliding(bullet, enemy) {
    return bullet.x < enemy.x + enemyWidth &&
           bullet.x + bulletWidth > enemy.x &&
           bullet.y < enemy.y + enemyHeight &&
           bullet.y + bulletHeight > enemy.y;
}

// Draw everything
function draw() {
    // Background
    ctx.fillStyle = '#000080';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Player (green rectangle)
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(playerX, playerY, playerWidth, playerHeight);
    
    // Bullets (yellow)
    ctx.fillStyle = '#ffff00';
    for (let bullet of bullets) {
        ctx.fillRect(bullet.x, bullet.y, bulletWidth, bulletHeight);
    }
    
    // Enemies (red)
    ctx.fillStyle = '#ff0000';
    for (let enemy of enemies) {
        ctx.fillRect(enemy.x, enemy.y, enemyWidth, enemyHeight);
    }
    
    // UI
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, 10, 30);
    ctx.fillText('Health: ' + health, 10, 60);
    
    // Game over screen
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = '20px Arial';
        ctx.fillText('Final Score: ' + score, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
        ctx.textAlign = 'left';
    }
}

// Game loop
function gameLoop() {
    if (gameStarted && !gameOver) {
        updatePlayer();
        updateBullets();
        spawnEnemy();
        updateEnemies();
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();
