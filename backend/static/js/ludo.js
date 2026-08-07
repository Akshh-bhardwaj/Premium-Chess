/* ════════════════════════════════════════════════════════════
   LUDO ROYALE – Full Game Engine
   Board: Red TL · Green TR · Yellow BL · Blue BR
   Symmetric 15×15 — each yard is 6×6 with exactly 4 marble pads
   ════════════════════════════════════════════════════════════ */

'use strict';

const COLOR_LABELS = { red: 'Red', green: 'Green', yellow: 'Yellow', blue: 'Blue' };
const COLOR_EMOJI  = { red: '🔴', green: '🟢', yellow: '🟡', blue: '🔵' };

/*
  Standard Ludo 15×15:
  Red    rows 0–5,  cols 0–5
  Green  rows 0–5,  cols 9–14
  Yellow rows 9–14, cols 0–5
  Blue   rows 9–14, cols 9–14
  Cross  rows/cols 6–8

  Yard cells: solid frame (R/G/Y/B) + exactly four pads (r/g/y/b)
*/
const BOARD_MAP = [
    // 0     1     2     3     4     5     6     7     8     9    10    11    12    13    14
    [ 'R',  'R',  'R',  'R',  'R',  'R',  'p',  'SG', 'p',  'G',  'G',  'G',  'G',  'G',  'G'  ], // 0
    [ 'R',  'R',  'R',  'R',  'R',  'R',  'p',  'HG', 'SG', 'G',  'G',  'G',  'G',  'G',  'G'  ], // 1
    [ 'R',  'R',  'r',  'r',  'R',  'R',  'p',  'HG', 'p',  'G',  'G',  'g',  'g',  'G',  'G'  ], // 2
    [ 'R',  'R',  'r',  'r',  'R',  'R',  'p',  'HG', 'p',  'G',  'G',  'g',  'g',  'G',  'G'  ], // 3
    [ 'R',  'R',  'R',  'R',  'R',  'R',  'p',  'HG', 'p',  'G',  'G',  'G',  'G',  'G',  'G'  ], // 4
    [ 'R',  'R',  'R',  'R',  'R',  'R',  'p',  'HG', 'p',  'p',  'p',  'p',  'p',  'p',  'p'  ], // 5
    [ 'p',  'SR', 'p',  'p',  'p',  'p',  'p',  'CT', 'p',  'p',  'p',  'p',  'p',  'p',  'p'  ], // 6
    [ 'SR', 'HR', 'HR', 'HR', 'HR', 'HR', 'CL', 'X',  'CR', 'HB', 'HB', 'HB', 'HB', 'HB', 'SB' ], // 7
    [ 'p',  'p',  'p',  'p',  'p',  'p',  'p',  'CB', 'p',  'p',  'p',  'p',  'p',  'SB', 'p'  ], // 8
    [ 'Y',  'Y',  'Y',  'Y',  'Y',  'Y',  'p',  'HY', 'p',  'B',  'B',  'B',  'B',  'B',  'B'  ], // 9
    [ 'Y',  'Y',  'Y',  'Y',  'Y',  'Y',  'p',  'HY', 'p',  'B',  'B',  'B',  'B',  'B',  'B'  ], // 10
    [ 'Y',  'Y',  'y',  'y',  'Y',  'Y',  'p',  'HY', 'p',  'B',  'B',  'b',  'b',  'B',  'B'  ], // 11
    [ 'Y',  'Y',  'y',  'y',  'Y',  'Y',  'p',  'HY', 'p',  'B',  'B',  'b',  'b',  'B',  'B'  ], // 12
    [ 'Y',  'Y',  'Y',  'Y',  'Y',  'Y',  'SY', 'HY', 'p',  'B',  'B',  'B',  'B',  'B',  'B'  ], // 13
    [ 'Y',  'Y',  'Y',  'Y',  'Y',  'Y',  'p',  'SY', 'p',  'B',  'B',  'B',  'B',  'B',  'B'  ], // 14
];

// Arrow glyphs drawn on path / home-stretch / start cells: [row][col] -> arrow
const ARROWS = {
    // Red start & stretch (→ into board / toward center)
    '6,1': '→', '7,1': '→', '7,2': '→', '7,3': '→', '7,4': '→', '7,5': '→',
    // Green start & stretch (↓)
    '1,8': '↓', '1,7': '↓', '2,7': '↓', '3,7': '↓', '4,7': '↓', '5,7': '↓',
    // Blue start & stretch (←)
    '8,13': '←', '7,13': '←', '7,12': '←', '7,11': '←', '7,10': '←', '7,9': '←',
    // Yellow start & stretch (↑)
    '13,6': '↑', '13,7': '↑', '12,7': '↑', '11,7': '↑', '10,7': '↑', '9,7': '↑',
    // Corner direction hints on the outer ring
    '0,7': '→', '7,14': '↓', '14,7': '←', '7,0': '↑',
};

// 52-cell track, clockwise from Red start [6,1]
const GLOBAL_PATH = [
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    [0, 7],
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    [5, 9], [5, 10], [5, 11], [5, 12], [5, 13], [5, 14],
    [6, 14], [7, 14],
    [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    [14, 7],
    [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
    [8, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1],
    [8, 0],
];

const COLOR_PATH_START = {
    red: 0,
    green: 13,
    blue: 27,
    yellow: 40
};

const HOME_COLS = {
    red:    [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    green:  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
    blue:   [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
};

// Exactly 4 pads per yard (2×2), centered in each 6×6 home
const HOME_SPOTS = {
    red:    [[2, 2], [2, 3], [3, 2], [3, 3]],
    green:  [[2, 11], [2, 12], [3, 11], [3, 12]],
    yellow: [[11, 2], [11, 3], [12, 2], [12, 3]],
    blue:   [[11, 11], [11, 12], [12, 11], [12, 12]],
};

const SAFE_SQUARES = new Set([
    '6,1', '1,8', '8,13', '13,6',
    '0,7', '7,0', '14,7', '7,14',
]);

const MAIN_LEN = 51;
const HOME_LEN = 5;
const DONE_STEPS = MAIN_LEN + HOME_LEN;

let numPlayers = 2;
let playerNames = {};
let playerColors = [];
let tokens = {};
let currentPlayerIdx = 0;
let diceValue = 0;
let hasRolled = false;
let gameActive = false;
let finishOrder = [];

const setupScreen = document.getElementById('setup-screen');
const gameScreen  = document.getElementById('game-screen');
const rollBtn     = document.getElementById('roll-btn');

document.querySelectorAll('.count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        numPlayers = parseInt(btn.dataset.count, 10);
        buildNameInputs();
    });
});

function activeColorsForCount(n) {
    if (n === 2) return ['red', 'blue'];
    if (n === 3) return ['red', 'green', 'blue'];
    return ['red', 'green', 'yellow', 'blue'];
}

function buildNameInputs() {
    const grid = document.getElementById('player-names-grid');
    grid.innerHTML = '';
    activeColorsForCount(numPlayers).forEach((color, i) => {
        const div = document.createElement('div');
        div.className = 'player-name-field';
        div.innerHTML =
            '<label style="color: var(--' + color + ');">' +
            COLOR_EMOJI[color] + ' ' + COLOR_LABELS[color] + ' Player</label>' +
            '<input type="text" id="name-' + color + '" maxlength="16" autocomplete="off" ' +
            'placeholder="' + (i === 0 ? (window.CURRENT_USER || 'You') : 'Player ' + (i + 1)) + '">';
        grid.appendChild(div);
    });
}

document.getElementById('start-ludo-btn').addEventListener('click', () => {
    playerColors = activeColorsForCount(numPlayers);
    playerColors.forEach(color => {
        const input = document.getElementById('name-' + color);
        playerNames[color] = (input && input.value.trim()) || COLOR_LABELS[color];
    });
    startGame();
});

buildNameInputs();

function startGame() {
    playerColors.forEach(color => {
        tokens[color] = [0, 1, 2, 3].map(id => ({ id, steps: -1 }));
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
    addLog('Game started! ' + playerNames[currentColor()] + ' goes first.', currentColor());
}

function currentColor() {
    return playerColors[currentPlayerIdx];
}

function buildBoard() {
    const board = document.getElementById('ludo-board');
    board.innerHTML = '';
    for (let row = 0; row < 15; row++) {
        for (let col = 0; col < 15; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = 'cell-' + row + '-' + col;
            applyCellStyle(cell, BOARD_MAP[row][col], row, col);
            board.appendChild(cell);
        }
    }
}

function applyCellStyle(cell, type, row, col) {
    const map = {
        R: 'red-home yard', G: 'green-home yard', Y: 'yellow-home yard', B: 'blue-home yard',
        r: 'red-pad pad', g: 'green-pad pad', y: 'yellow-pad pad', b: 'blue-pad pad',
        p: 'path',
        SR: 'path safe-red', SG: 'path safe-green',
        SY: 'path safe-yellow', SB: 'path safe-blue',
        HR: 'home-red', HG: 'home-green', HY: 'home-yellow', HB: 'home-blue',
        CT: 'center-top', CB: 'center-bottom', CL: 'center-left', CR: 'center-right',
        X: 'center-piece',
    };
    (map[type] || '').split(' ').filter(Boolean).forEach(c => cell.classList.add(c));

    const arrow = ARROWS[row + ',' + col];
    if (arrow) {
        const tip = document.createElement('span');
        tip.className = 'arrow';
        tip.textContent = arrow;
        cell.appendChild(tip);
    }
}

function getTokenCell(color, steps) {
    if (steps < 0 || steps >= DONE_STEPS) return null;
    if (steps < MAIN_LEN) {
        return GLOBAL_PATH[(COLOR_PATH_START[color] + steps) % 52];
    }
    return HOME_COLS[color][steps - MAIN_LEN] || null;
}

function renderAll() {
    document.querySelectorAll('.token').forEach(t => t.remove());
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('can-move'));

    playerColors.forEach(color => {
        let homeIdx = 0;
        tokens[color].forEach((token, tid) => {
            if (token.steps < 0) {
                const spot = HOME_SPOTS[color][homeIdx++];
                if (spot) {
                    const cell = getCellEl(spot[0], spot[1]);
                    if (cell) appendToken(cell, color, tid);
                }
            } else if (token.steps < DONE_STEPS) {
                const rc = getTokenCell(color, token.steps);
                if (rc) {
                    const cell = getCellEl(rc[0], rc[1]);
                    if (cell) appendToken(cell, color, tid);
                }
            }
        });
    });

    renderScoreBoard();
    if (hasRolled && gameActive) highlightSelectableTokens();
}

function getCellEl(row, col) {
    return document.getElementById('cell-' + row + '-' + col);
}

function appendToken(cell, color, tid) {
    const el = document.createElement('div');
    el.className = 'token ' + color;
    el.dataset.color = color;
    el.dataset.tid = String(tid);
    el.title = playerNames[color] + "'s token " + (tid + 1);
    el.addEventListener('click', () => selectToken(color, tid));
    cell.appendChild(el);
}

function renderScoreBoard() {
    const sb = document.getElementById('score-board');
    sb.innerHTML = '<h3>🏅 Players</h3>';
    playerColors.forEach((color, i) => {
        const done = tokens[color].filter(t => t.steps >= DONE_STEPS).length;
        const row = document.createElement('div');
        row.className = 'score-row' + (i === currentPlayerIdx && gameActive ? ' active-player' : '');
        row.innerHTML =
            '<div class="score-dot" style="background:var(--' + color + ');"></div>' +
            '<span>' + playerNames[color] + '</span>' +
            '<span class="score-tokens ' + (done === 4 ? 'complete' : '') + '">' +
            (done === 4 ? '🏆 Done' : done + '/4 home') +
            '</span>';
        sb.appendChild(row);
    });
}

function updateTurnUI() {
    const color = currentColor();
    const dot  = document.getElementById('turn-color-dot');
    const name = document.getElementById('turn-player-name');
    dot.style.background = 'var(--' + color + ')';
    dot.style.boxShadow  = '0 0 12px var(--' + color + ')';
    name.textContent = COLOR_EMOJI[color] + ' ' + playerNames[color] + "'s Turn";
    name.style.color = 'var(--' + color + ')';
    rollBtn.disabled = hasRolled;
}

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
        addLog(COLOR_EMOJI[color] + ' ' + playerNames[color] + ' rolled a ' + diceValue, color);

        const movable = getMovableTokens(color, diceValue);
        if (movable.length === 0) {
            addLog('No valid moves. Skipping turn.', color);
            setTimeout(() => nextTurn(), 900);
        } else if (movable.length === 1) {
            setTimeout(() => moveToken(color, movable[0].id), 350);
        } else {
            highlightSelectableTokens();
        }
    }, 480);
}

function renderDicePips(n) {
    const pips = document.getElementById('dice-pips');
    pips.innerHTML = '';
    const layouts = {
        1: [[50, 50]],
        2: [[25, 25], [75, 75]],
        3: [[25, 25], [50, 50], [75, 75]],
        4: [[25, 25], [75, 25], [25, 75], [75, 75]],
        5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
        6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
    };
    pips.style.cssText = 'position:relative;width:60px;height:60px;';
    (layouts[n] || []).forEach(function (xy) {
        const pip = document.createElement('div');
        pip.className = 'pip';
        pip.style.cssText =
            'position:absolute;width:12px;height:12px;border-radius:50%;background:#fff;' +
            'box-shadow:0 0 5px rgba(255,255,255,0.7);left:' + xy[0] + '%;top:' + xy[1] +
            '%;transform:translate(-50%,-50%);';
        pips.appendChild(pip);
    });
}

function getMovableTokens(color, roll) {
    return tokens[color].filter(token => {
        if (token.steps >= DONE_STEPS) return false;
        if (token.steps < 0) return roll === 6;
        return token.steps + roll <= DONE_STEPS;
    });
}

function highlightSelectableTokens() {
    if (!hasRolled) return;
    const color = currentColor();
    const movableIds = new Set(getMovableTokens(color, diceValue).map(t => t.id));
    document.querySelectorAll('.token').forEach(el => {
        if (el.dataset.color === color && movableIds.has(parseInt(el.dataset.tid, 10))) {
            el.classList.add('selectable');
        }
    });
}

function selectToken(color, tid) {
    if (!gameActive || !hasRolled) return;
    if (color !== currentColor()) return;
    if (!getMovableTokens(color, diceValue).find(t => t.id === tid)) return;
    moveToken(color, tid);
}

function moveToken(color, tid) {
    const token = tokens[color][tid];

    if (token.steps < 0 && diceValue === 6) {
        token.steps = 0;
        addLog(COLOR_EMOJI[color] + ' ' + playerNames[color] + "'s token enters the board!", color);
    } else {
        token.steps += diceValue;
    }

    if (token.steps >= DONE_STEPS) {
        token.steps = DONE_STEPS;
        addLog(COLOR_EMOJI[color] + ' ' + playerNames[color] + "'s token reached home! 🎉", color);
        checkWin();
    } else {
        checkCapture(color, tid);
        addLog(COLOR_EMOJI[color] + ' ' + playerNames[color] + ' moved ' + diceValue +
            ' step' + (diceValue !== 1 ? 's' : ''), color);
    }

    const extraTurn = diceValue === 6;
    hasRolled = false;
    diceValue = 0;
    document.getElementById('dice-value').textContent = '–';
    document.getElementById('dice-pips').innerHTML = '';

    renderAll();
    if (!gameActive) return;

    if (extraTurn) {
        addLog('🎲 ' + playerNames[color] + ' gets another turn (rolled 6)!', color);
        rollBtn.disabled = false;
        updateTurnUI();
    } else {
        nextTurn();
    }
}

function checkCapture(color, tid) {
    const token = tokens[color][tid];
    if (token.steps >= MAIN_LEN) return;

    const rc = getTokenCell(color, token.steps);
    if (!rc) return;
    if (SAFE_SQUARES.has(rc[0] + ',' + rc[1])) return;

    playerColors.forEach(otherColor => {
        if (otherColor === color) return;
        tokens[otherColor].forEach(otherToken => {
            if (otherToken.steps < 0 || otherToken.steps >= DONE_STEPS) return;
            if (otherToken.steps >= MAIN_LEN) return;
            const orc = getTokenCell(otherColor, otherToken.steps);
            if (orc && orc[0] === rc[0] && orc[1] === rc[1]) {
                otherToken.steps = -1;
                addLog('💥 ' + playerNames[color] + ' captured ' + playerNames[otherColor] + "'s token!", color);
            }
        });
    });
}

function checkWin() {
    const color = currentColor();
    if (!tokens[color].every(t => t.steps >= DONE_STEPS)) return;
    if (!finishOrder.includes(color)) finishOrder.push(color);
    addLog('🏆 ' + playerNames[color] + ' has finished all tokens!', color);
    if (finishOrder.length === 1) {
        gameActive = false;
        setTimeout(() => showWin(color), 500);
    }
}

function showWin(color) {
    document.getElementById('win-title').textContent = COLOR_EMOJI[color] + ' ' + playerNames[color] + ' Wins!';
    document.getElementById('win-subtitle').textContent =
        '🎉 Congratulations, ' + playerNames[color] + '! You dominated the board!';
    document.getElementById('win-modal').classList.remove('hidden');
}

function nextTurn() {
    let next = (currentPlayerIdx + 1) % playerColors.length;
    for (let i = 0; i < playerColors.length; i++) {
        const c = playerColors[next];
        if (!tokens[c].every(t => t.steps >= DONE_STEPS)) break;
        next = (next + 1) % playerColors.length;
    }
    currentPlayerIdx = next;
    hasRolled = false;
    rollBtn.disabled = false;
    renderAll();
    updateTurnUI();
    addLog('── ' + COLOR_EMOJI[currentColor()] + ' ' + playerNames[currentColor()] + "'s turn ──", currentColor());
}

function quitGame() {
    if (confirm('Exit to setup screen?')) location.reload();
}

function addLog(msg, color) {
    const list = document.getElementById('game-log-list');
    const li = document.createElement('li');
    li.className = 'log-item';
    li.style.borderLeftColor = 'var(--' + (color || 'text') + ')';
    li.textContent = msg;
    list.appendChild(li);
    list.scrollTop = list.scrollHeight;
}

renderDicePips(0);
