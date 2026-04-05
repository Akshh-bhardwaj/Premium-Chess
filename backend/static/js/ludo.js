/* ════════════════════════════════════════════════════════════
   LUDO ROYALE – Full Game Engine
   Supports 2, 3, or 4 players
   ════════════════════════════════════════════════════════════ */

'use strict';

// ──────────────────────────────────────────────────
// CONSTANTS & BOARD LAYOUT
// ──────────────────────────────────────────────────

const COLORS = ['red', 'green', 'yellow', 'blue'];
const COLOR_LABELS = { red:'Red', green:'Green', yellow:'Yellow', blue:'Blue' };
const COLOR_EMOJI  = { red:'🔴', green:'🟢', yellow:'🟡', blue:'🔵' };

// 15×15 grid cell types
// R=red-home, G=green-home, Y=yellow-home, B=blue-home
// r=red-inner, g=green-inner, y=yellow-inner, b=blue-inner (starting circle)
// p=path, s=safe, SR=safe-red, SG=safe-green, SY=safe-yellow, SB=safe-blue
// HR=home-red column, HG=home-green, HY=home-yellow, HB=home-blue
// C=center, CT=center-top, CB=center-bottom, CL=center-left, CRG=center-right
// X=center piece (triangle merge)

const BOARD_MAP = [
    //  0     1     2     3     4     5     6     7     8     9    10    11    12    13    14
    [ 'R',  'R',  'R',  'R',  'R',  'R',  'p',  'SG', 'p',  'G',  'G',  'G',  'G',  'G',  'G'  ], // 0
    [ 'R',  'r',  'r',  'r',  'R',  'R',  'p',  'HG', 'p',  'G',  'g',  'g',  'g',  'G',  'G'  ], // 1
    [ 'R',  'r',  'r',  'r',  'R',  'R',  'p',  'HG', 'p',  'G',  'g',  'g',  'g',  'G',  'G'  ], // 2
    [ 'R',  'r',  'r',  'r',  'R',  'R',  'p',  'HG', 'p',  'G',  'g',  'g',  'g',  'G',  'G'  ], // 3
    [ 'R',  'R',  'R',  'R',  'R',  'R',  'p',  'HG', 'p',  'G',  'G',  'G',  'G',  'G',  'G'  ], // 4
    [ 'R',  'R',  'R',  'R',  'R',  'R',  'p',  'HG', 'p',  'p',  'p',  'p',  'p',  'p',  'p'  ], // 5
    [ 'p',  'p',  'p',  'p',  'p',  'p',  'p',  'CT', 'p',  'p',  'p',  'p',  'p',  'p',  'p'  ], // 6
    [ 'SR', 'HR', 'HR', 'HR', 'HR', 'HR', 'CL', 'X',  'CR', 'HB', 'HB', 'HB', 'HB', 'HB', 'SB' ], // 7
    [ 'p',  'p',  'p',  'p',  'p',  'p',  'p',  'CB', 'p',  'p',  'p',  'p',  'p',  'p',  'p'  ], // 8
    [ 'p',  'p',  'p',  'p',  'p',  'p',  'p',  'HY', 'p',  'p',  'p',  'p',  'p',  'p',  'p'  ], // 9
    [ 'Y',  'Y',  'Y',  'Y',  'Y',  'Y',  'p',  'HY', 'p',  'B',  'B',  'B',  'B',  'B',  'B'  ], // 10
    [ 'Y',  'y',  'y',  'y',  'Y',  'Y',  'p',  'HY', 'p',  'B',  'b',  'b',  'b',  'B',  'B'  ], // 11
    [ 'Y',  'y',  'y',  'y',  'Y',  'Y',  'p',  'HY', 'p',  'B',  'b',  'b',  'b',  'B',  'B'  ], // 12
    [ 'Y',  'y',  'y',  'y',  'Y',  'Y',  'p',  'HY', 'p',  'B',  'b',  'b',  'b',  'B',  'B'  ], // 13
    [ 'Y',  'Y',  'Y',  'Y',  'Y',  'Y',  'p',  'SY', 'p',  'B',  'B',  'B',  'B',  'B',  'B'  ], // 14
];

// Main path (52 cells) – [row, col] in order for each player's token traversal
// Standard Ludo path starting from red's start square going clockwise
// We define the global 52-cell path in [row,col] pairs, starting from cell index 0 = red start (row1,col6)
const PATH = [
    [6,1],[6,2],[6,3],[6,4],[6,5],  // 0-4   left section (above yellow)
    [5,6],                           // 5
    [4,6],[3,6],[2,6],[1,6],[0,6],   // 6-10  up col 6
    [0,7],                           // 11    top safe(green)  
    [0,8],[1,8],[2,8],[3,8],[4,8],   // 12-16 down col 8
    [5,8],[5,9],[5,10],[5,11],[5,12],[5,13],[5,14], // 17-23 right row 5
    [6,14],                          // 24
    [6,13],[6,12],[6,11],[6,10],[6,9],// 25-29 row 6 right
    [7,14],                          // 30
    [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[8,8], // 31-37 row 8 right→mid
    [9,8],[10,8],[11,8],[12,8],[13,8],[14,8], // 38-43 down col 8
    [14,7],                          // 44    bottom safe(yellow)
    [14,6],[13,6],[12,6],[11,6],[10,6],[9,6], // 45-50 up col 6
    [8,6],[8,5],[8,4],[8,3],[8,2],[8,1], // 51-56 row 8 left
    [7,0],                           // 57
    [6,0],                           // 58
];

// Recalculate correct 52-step standard Ludo path
// Each color's start index on the global path
const COLOR_PATH_START = { red: 0, blue: 13, green: 26, yellow: 39 };
// Home column cells [row,col] going toward center
const HOME_COLS = {
    red:    [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
    green:  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
    yellow: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
    blue:   [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
};
// Starting squares (safe)
const START_SQUARES = {
    red:    [6,1],
    green:  [1,8],
    yellow: [8,13],
    blue:   [13,6],
};
// Home base inner squares (spawning area)
const HOME_BASE = {
    red:    [[1,1],[1,2],[2,1],[2,2]],
    green:  [[1,10],[1,11],[2,10],[2,11]],
    yellow: [[11,10],[11,11],[12,10],[12,11]],
    blue:   [[11,1],[11,2],[12,1],[12,2]],
};

// Safe squares (cannot be captured here)
const SAFE_SQUARES = new Set([
    '0,7','7,0','14,7','7,14', // color entry safes
    '6,1','1,8','8,13','13,6', // start squares
]);

// ──────────────────────────────────────────────────
// GAME STATE
// ──────────────────────────────────────────────────

let numPlayers = 2;
let playerNames = {};
let playerColors = [];
let tokens = {};        // color -> [{pos: 'home'|number(0-57)|'done', id}]
let currentPlayerIdx = 0;
let diceValue = 0;
let hasRolled = false;
let gameActive = false;
let finishOrder = [];

// ──────────────────────────────────────────────────
// SETUP SCREEN
// ──────────────────────────────────────────────────

const setupScreen  = document.getElementById('setup-screen');
const gameScreen   = document.getElementById('game-screen');
const rollBtn      = document.getElementById('roll-btn');

// Count buttons
document.querySelectorAll('.count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        numPlayers = parseInt(btn.dataset.count);
        buildNameInputs();
    });
});

function buildNameInputs() {
    const grid = document.getElementById('player-names-grid');
    grid.innerHTML = '';

    // 2 players: Red vs Blue; 3: Red, Green, Blue; 4: all
    const activeColors = numPlayers === 2 ? ['red','blue']
                       : numPlayers === 3 ? ['red','green','blue']
                       : ['red','green','yellow','blue'];

    activeColors.forEach((color, i) => {
        const div = document.createElement('div');
        div.className = 'player-name-field';
        div.innerHTML = `
            <label style="color: var(--${color});">${COLOR_EMOJI[color]} ${COLOR_LABELS[color]} Player</label>
            <input type="text" id="name-${color}" placeholder="${i === 0 ? (window.CURRENT_USER || 'You') : 'Player ' + (i+1)}" maxlength="16" autocomplete="off">
        `;
        grid.appendChild(div);
    });
}

document.getElementById('start-ludo-btn').addEventListener('click', () => {
    const activeColors = numPlayers === 2 ? ['red','blue']
                       : numPlayers === 3 ? ['red','green','blue']
                       : ['red','green','yellow','blue'];

    playerColors = activeColors;
    activeColors.forEach(color => {
        const input = document.getElementById(`name-${color}`);
        playerNames[color] = (input && input.value.trim()) || COLOR_LABELS[color];
    });

    startGame();
});

buildNameInputs(); // initial

// ──────────────────────────────────────────────────
// GAME INITIALIZATION
// ──────────────────────────────────────────────────

function startGame() {
    // Init tokens – each player has 4 tokens starting at 'home'
    playerColors.forEach(color => {
        tokens[color] = [
            { id: 0, pos: 'home', steps: -1 },
            { id: 1, pos: 'home', steps: -1 },
            { id: 2, pos: 'home', steps: -1 },
            { id: 3, pos: 'home', steps: -1 },
        ];
    });

    currentPlayerIdx = 0;
    diceValue = 0;
    hasRolled = false;
    gameActive = true;
    finishOrder = [];

    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    buildBoard();
    renderAll();
    updateTurnUI();
    addLog(`Game started! ${playerNames[currentColor()]} goes first.`, currentColor());
}

function currentColor() {
    return playerColors[currentPlayerIdx];
}

// ──────────────────────────────────────────────────
// BOARD BUILDING (static grid)
// ──────────────────────────────────────────────────

function buildBoard() {
    const board = document.getElementById('ludo-board');
    board.innerHTML = '';

    for (let row = 0; row < 15; row++) {
        for (let col = 0; col < 15; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${row}-${col}`;
            const type = BOARD_MAP[row][col];
            applyCellStyle(cell, type, row, col);
            board.appendChild(cell);
        }
    }
}

function applyCellStyle(cell, type, row, col) {
    switch(type) {
        case 'R': cell.classList.add('red-home'); break;
        case 'G': cell.classList.add('green-home'); break;
        case 'Y': cell.classList.add('yellow-home'); break;
        case 'B': cell.classList.add('blue-home'); break;
        case 'r': cell.classList.add('red-inner'); break;
        case 'g': cell.classList.add('green-inner'); break;
        case 'y': cell.classList.add('yellow-inner'); break;
        case 'b': cell.classList.add('blue-inner'); break;
        case 'p': cell.classList.add('path'); break;
        case 's': cell.classList.add('path','safe'); break;
        case 'SR': cell.classList.add('path','safe-red'); break;
        case 'SG': cell.classList.add('path','safe-green'); break;
        case 'SY': cell.classList.add('path','safe-yellow'); break;
        case 'SB': cell.classList.add('path','safe-blue'); break;
        case 'HR': cell.classList.add('home-red'); break;
        case 'HG': cell.classList.add('home-green'); break;
        case 'HY': cell.classList.add('home-yellow'); break;
        case 'HB': cell.classList.add('home-blue'); break;
        case 'CT': cell.classList.add('center-top'); break;
        case 'CB': cell.classList.add('center-bottom'); break;
        case 'CL': cell.classList.add('center-left'); break;
        case 'CR': cell.classList.add('center-right'); break;
        case 'X':  cell.classList.add('center-piece'); break;
        default: break;
    }
}

// ──────────────────────────────────────────────────
// POSITION CALCULATION
// ──────────────────────────────────────────────────

// Returns [row, col] for a token given its color and steps walked (0-57)
// steps: -1 = home base, 0-51 = main path, 52-57 = home column, 58 = done
function getTokenCell(color, steps) {
    if (steps < 0) return getHomeCell(color);
    if (steps >= 58) return null; // done

    // Global path index
    const start = COLOR_PATH_START[color];
    const totalPath = GLOBAL_PATH.length; // 52

    if (steps < 52) {
        const idx = (start + steps) % totalPath;
        return GLOBAL_PATH[idx];
    } else {
        // Home column
        const homeStep = steps - 52; // 0-5
        return HOME_COLS[color][homeStep] || null;
    }
}

// Give each color a home base cell by cycling through 4
function getHomeCell(color) {
    // Return null - tokens in home are rendered in home squares
    return null;
}

// ──────────────────────────────────────────────────
// DEFINE GLOBAL 52-CELL PATH (standard Ludo clockwise)
// ──────────────────────────────────────────────────

// Full 52-step main path, starting at Red's 0-position
const GLOBAL_PATH = [
    // ── Red start zone (left, middle rows moving down) ──
    [6,1],[6,2],[6,3],[6,4],[6,5],   // 0–4
    [5,6],[4,6],[3,6],[2,6],[1,6],[0,6], // 5–10
    // ── Turn top ──
    [0,7],                           // 11 (green entry safe)
    [0,8],[1,8],[2,8],[3,8],[4,8],   // 12–16
    [5,8],[5,9],[5,10],[5,11],[5,12],[5,13],[5,14], // 17–23
    // ── Right side ──
    [6,14],[7,14],                   // 24–25
    // ── Blue entry ──
    [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[8,8], // 26–32
    [9,8],[10,8],[11,8],[12,8],[13,8],[14,8], // 33–38
    // ── Bottom ──
    [14,7],                          // 39 (yellow entry safe)
    [14,6],[13,6],[12,6],[11,6],[10,6],[9,6], // 40–45
    [8,6],[8,5],[8,4],[8,3],[8,2],[8,1], // 46–51
    // ── Left side: back to red ──
];
// 52 total

// Blue   starts at index 13 on global path
// Green  starts at index 26 – wait, adjust: 
// Standard ludo: each player starts 13 steps apart
// Red=0, Green=13, Blue=26, Yellow=39 (on the 52-cell path)

// ──────────────────────────────────────────────────
// HOME BASE TOKEN RENDERING
// ──────────────────────────────────────────────────

const HOME_SPOTS = {
    red:    [[1,1],[1,2],[2,1],[2,2]],
    green:  [[1,10],[1,11],[2,10],[2,11]],
    yellow: [[11,10],[11,11],[12,10],[12,11]],
    blue:   [[11,1],[11,2],[12,1],[12,2]],
};

// ──────────────────────────────────────────────────
// RENDERING
// ──────────────────────────────────────────────────

function renderAll() {
    // Clear all tokens from board
    document.querySelectorAll('.token').forEach(t => t.remove());
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('can-move'));

    // Render each player's tokens
    playerColors.forEach(color => {
        let homeIdx = 0;
        tokens[color].forEach((token, tid) => {
            if (token.steps < 0) {
                // In home base
                const spot = HOME_SPOTS[color][homeIdx++];
                if (spot) {
                    const cell = getCellEl(spot[0], spot[1]);
                    if (cell) appendToken(cell, color, tid);
                }
            } else if (token.steps < 58) {
                // On path or home column
                const rc = getTokenCell(color, token.steps);
                if (rc) {
                    const cell = getCellEl(rc[0], rc[1]);
                    if (cell) appendToken(cell, color, tid);
                }
            }
            // steps >= 58 = done, not rendered
        });
    });

    renderScoreBoard();

    // Show selectable tokens if rolled
    if (hasRolled && gameActive) {
        highlightSelectableTokens();
    }
}

function getCellEl(row, col) {
    return document.getElementById(`cell-${row}-${col}`);
}

function appendToken(cell, color, tid) {
    const el = document.createElement('div');
    el.className = `token ${color}`;
    el.dataset.color = color;
    el.dataset.tid = tid;
    el.title = `${playerNames[color]}'s token ${tid + 1}`;
    el.addEventListener('click', () => selectToken(color, tid));
    cell.appendChild(el);
}

function renderScoreBoard() {
    const sb = document.getElementById('score-board');
    sb.innerHTML = '<h3>🏅 Players</h3>';

    playerColors.forEach((color, i) => {
        const done = tokens[color].filter(t => t.steps >= 58).length;
        const row = document.createElement('div');
        row.className = 'score-row' + (i === currentPlayerIdx && gameActive ? ' active-player' : '');
        row.innerHTML = `
            <div class="score-dot" style="background:var(--${color});"></div>
            <span>${playerNames[color]}</span>
            <span class="score-tokens ${done === 4 ? 'complete' : ''}">
                ${done === 4 ? '🏆 Done' : `${done}/4 home`}
            </span>
        `;
        sb.appendChild(row);
    });
}

// ──────────────────────────────────────────────────
// TURN UI
// ──────────────────────────────────────────────────

function updateTurnUI() {
    const color = currentColor();
    const dot   = document.getElementById('turn-color-dot');
    const name  = document.getElementById('turn-player-name');

    dot.style.background = `var(--${color})`;
    dot.style.boxShadow  = `0 0 12px var(--${color})`;
    name.textContent = `${COLOR_EMOJI[color]} ${playerNames[color]}'s Turn`;
    name.style.color = `var(--${color})`;
    rollBtn.disabled = hasRolled;
}

// ──────────────────────────────────────────────────
// DICE
// ──────────────────────────────────────────────────

function rollDice() {
    if (!gameActive || hasRolled) return;

    const diceEl = document.getElementById('dice-face');
    diceEl.classList.add('rolling');
    rollBtn.disabled = true;

    setTimeout(() => {
        diceValue = Math.ceil(Math.random() * 6);
        hasRolled = true;
        diceEl.classList.remove('rolling');
        renderDicePips(diceValue);
        document.getElementById('dice-value').textContent = diceValue;

        const color = currentColor();
        addLog(`${COLOR_EMOJI[color]} ${playerNames[color]} rolled a ${diceValue}`, color);

        // Check if any valid moves exist
        const movable = getMovableTokens(color, diceValue);
        if (movable.length === 0) {
            addLog(`No valid moves. Skipping turn.`, color);
            setTimeout(() => nextTurn(false), 1000);
        } else {
            highlightSelectableTokens();
            renderAll();
        }
    }, 520);
}

function renderDicePips(n) {
    const pips = document.getElementById('dice-pips');
    pips.innerHTML = '';
    // pip positions for each face value
    const layouts = {
        1: [[50,50]],
        2: [[25,25],[75,75]],
        3: [[25,25],[50,50],[75,75]],
        4: [[25,25],[75,25],[25,75],[75,75]],
        5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
        6: [[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]],
    };
    const positions = layouts[n] || [];
    pips.style.position = 'relative';
    pips.style.width = '60px';
    pips.style.height = '60px';
    positions.forEach(([x,y]) => {
        const pip = document.createElement('div');
        pip.className = 'pip';
        pip.style.cssText = `position:absolute; width:12px; height:12px; border-radius:50%; background:#fff; box-shadow:0 0 5px rgba(255,255,255,0.7); left:${x}%; top:${y}%; transform:translate(-50%,-50%);`;
        pips.appendChild(pip);
    });
}

// ──────────────────────────────────────────────────
// MOVE LOGIC
// ──────────────────────────────────────────────────

function getMovableTokens(color, roll) {
    return tokens[color].filter(token => {
        if (token.steps >= 58) return false; // already done
        if (token.steps < 0) {
            // In home – can only move out on a 6
            return roll === 6;
        }
        // On path – check won't overshoot home (max steps = 57)
        return token.steps + roll <= 57;
    });
}

function highlightSelectableTokens() {
    if (!hasRolled) return;
    const color = currentColor();
    const movable = getMovableTokens(color, diceValue);
    const movableIds = new Set(movable.map(t => t.id));

    document.querySelectorAll('.token').forEach(el => {
        if (el.dataset.color === color && movableIds.has(parseInt(el.dataset.tid))) {
            el.classList.add('selectable');
        }
    });
}

function selectToken(color, tid) {
    if (!gameActive || !hasRolled) return;
    if (color !== currentColor()) return;

    const token = tokens[color][tid];
    const movable = getMovableTokens(color, diceValue);
    if (!movable.find(t => t.id === tid)) return;

    moveToken(color, tid);
}

function moveToken(color, tid) {
    const token = tokens[color][tid];
    const oldSteps = token.steps;

    if (token.steps < 0 && diceValue === 6) {
        // Move out of home
        token.steps = 0;
        addLog(`${COLOR_EMOJI[color]} ${playerNames[color]}'s token enters the board!`, color);
    } else {
        token.steps += diceValue;
    }

    // Check win
    if (token.steps >= 57) {
        token.steps = 58; // done
        addLog(`${COLOR_EMOJI[color]} ${playerNames[color]}'s token reached home! 🎉`, color);
        checkWin();
    } else {
        // Check capture
        checkCapture(color, tid);
        addLog(`${COLOR_EMOJI[color]} ${playerNames[color]} moved ${diceValue} step${diceValue !== 1 ? 's' : ''}`, color);
    }

    // Extra turn on 6
    const extraTurn = diceValue === 6;

    hasRolled = false;
    renderDicePips(0);
    document.getElementById('dice-value').textContent = '–';
    document.getElementById('dice-pips').innerHTML = '';

    renderAll();

    if (extraTurn && gameActive) {
        addLog(`🎲 ${playerNames[color]} gets another turn (rolled 6)!`, color);
        hasRolled = false;
        rollBtn.disabled = false;
        updateTurnUI();
    } else if (gameActive) {
        nextTurn(true);
    }
}

function checkCapture(color, tid) {
    const token = tokens[color][tid];
    const rc = getTokenCell(color, token.steps);
    if (!rc) return;

    const cellKey = `${rc[0]},${rc[1]}`;
    // Safe cell check
    if (SAFE_SQUARES.has(cellKey)) return;
    // Home column check – safe
    if (token.steps >= 52) return;

    playerColors.forEach(otherColor => {
        if (otherColor === color) return;
        tokens[otherColor].forEach(otherToken => {
            if (otherToken.steps < 0 || otherToken.steps >= 58) return;
            const orc = getTokenCell(otherColor, otherToken.steps);
            if (orc && orc[0] === rc[0] && orc[1] === rc[1]) {
                // Capture!
                otherToken.steps = -1;
                addLog(`💥 ${playerNames[color]} captured ${playerNames[otherColor]}'s token!`, color);
            }
        });
    });
}

function checkWin() {
    const color = currentColor();
    const done = tokens[color].every(t => t.steps >= 58);
    if (done) {
        if (!finishOrder.includes(color)) finishOrder.push(color);
        addLog(`🏆 ${playerNames[color]} has finished all tokens!`, color);

        // Check if game is over (1st place wins, or all players done)
        if (finishOrder.length === 1) {
            // First winner!
            setTimeout(() => showWin(color), 600);
            gameActive = false;
        }
    }
}

function showWin(color) {
    document.getElementById('win-title').textContent = `${COLOR_EMOJI[color]} ${playerNames[color]} Wins!`;
    document.getElementById('win-subtitle').textContent = `🎉 Congratulations, ${playerNames[color]}! You dominated the board!`;
    document.getElementById('win-modal').classList.remove('hidden');
}

function nextTurn(skipNonActive = false) {
    let next = (currentPlayerIdx + 1) % playerColors.length;
    let attempts = 0;
    while (attempts < playerColors.length) {
        const c = playerColors[next];
        // Skip finished players
        if (tokens[c].every(t => t.steps >= 58)) {
            next = (next + 1) % playerColors.length;
            attempts++;
            continue;
        }
        break;
    }
    currentPlayerIdx = next;
    hasRolled = false;
    rollBtn.disabled = false;
    renderAll();
    updateTurnUI();
    addLog(`── ${COLOR_EMOJI[currentColor()]} ${playerNames[currentColor()]}'s turn ──`, currentColor());
}

function quitGame() {
    if (confirm('Exit to setup screen?')) location.reload();
}

// ──────────────────────────────────────────────────
// GAME LOG
// ──────────────────────────────────────────────────

function addLog(msg, color) {
    const list = document.getElementById('game-log-list');
    const li = document.createElement('li');
    li.className = 'log-item';
    li.style.borderLeftColor = `var(--${color || 'text'})`;
    li.textContent = msg;
    list.appendChild(li);
    list.scrollTop = list.scrollHeight;
}

// ──────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────

// Refresh dice face on load
renderDicePips(0);
