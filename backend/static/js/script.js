const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const resetBtn = document.getElementById("reset-btn");
const modal = document.getElementById("game-over-modal");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalBtn = document.getElementById("modal-btn");
const movesListWhite = document.getElementById("moves-list-white");
const movesListBlack = document.getElementById("moves-list-black");
const capWhiteElement = document.getElementById("cap-white");
const capBlackElement = document.getElementById("cap-black");
const devilBtn = document.getElementById("devil-btn");
const hintBtn = document.getElementById("hint-btn");
const clockWhite = document.getElementById("clock-white");
const clockBlack = document.getElementById("clock-black");

let selectedSquare = null;
let whiteTime = 600;
let blackTime = 600;
let timerInterval = null;
let currentTurn = 'white';
let isPaused = false;

const pauseBtn = document.getElementById("pause-btn");

pauseBtn.addEventListener("click", () => {
    isPaused = !isPaused;
    if (isPaused) {
        pauseBtn.textContent = "▶ Resume Game";
        stopTimer();
    } else {
        pauseBtn.textContent = "⏸ Pause Game";
        startTimer();
    }
});

const pieceMap = {
    'K': 'https://images.chesscomfiles.com/chess-themes/pieces/glass/150/wk.png', 
    'Q': 'https://images.chesscomfiles.com/chess-themes/pieces/glass/150/wq.png', 
    'R': 'https://images.chesscomfiles.com/chess-themes/pieces/glass/150/wr.png', 
    'B': 'https://images.chesscomfiles.com/chess-themes/pieces/glass/150/wb.png', 
    'N': 'https://images.chesscomfiles.com/chess-themes/pieces/glass/150/wn.png', 
    'P': 'https://images.chesscomfiles.com/chess-themes/pieces/glass/150/wp.png', // White
    'k': 'https://images.chesscomfiles.com/chess-themes/pieces/glass/150/bk.png', 
    'q': 'https://images.chesscomfiles.com/chess-themes/pieces/glass/150/bq.png', 
    'r': 'https://images.chesscomfiles.com/chess-themes/pieces/glass/150/br.png', 
    'b': 'https://images.chesscomfiles.com/chess-themes/pieces/glass/150/bb.png', 
    'n': 'https://images.chesscomfiles.com/chess-themes/pieces/glass/150/bn.png', 
    'p': 'https://images.chesscomfiles.com/chess-themes/pieces/glass/150/bp.png'  // Black
};

function getSquareName(row, col) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const rank = 8 - row; // 0th row is rank 8
    return `${files[col]}${rank}`;
}

async function fetchBoardState() {
    try {
        const response = await fetch('/api/board');
        const data = await response.json();
        renderBoard(data);
    } catch (err) {
        console.error("Error fetching board state:", err);
    }
}

function renderBoard(data) {
    if (boardElement.children.length === 0) {
        // Initial setup
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement("div");
                square.classList.add("square");
                if ((row + col) % 2 === 0) square.classList.add("white");
                else square.classList.add("black");

                const sqName = getSquareName(row, col);
                square.dataset.sq = sqName;
                square.id = `sq-${sqName}`;
                
                square.addEventListener("click", () => handleSquareClick(sqName));
                boardElement.appendChild(square);
            }
        }
    }

    const fenParts = data.fen.split(' ');
    const boardRows = fenParts[0].split('/');
    
    // Build 2D array representation
    let grid = [];
    for (let charRow of boardRows) {
        let rowData = [];
        for (let char of charRow) {
            if (!isNaN(char)) {
                // Number of empty squares
                for (let i = 0; i < parseInt(char); i++) {
                    rowData.push(null);
                }
            } else {
                rowData.push(char);
            }
        }
        grid.push(rowData);
    }

    // Update squares without recreation
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const sqName = getSquareName(row, col);
            const square = document.getElementById(`sq-${sqName}`);
            
            // Clean state
            square.innerHTML = "";
            square.classList.remove("selected", "piece", "legal-hint");
            
            if (selectedSquare === sqName) {
                square.classList.add("selected");
            }

            const pieceChar = grid[row][col];
            if (pieceChar) {
                const img = document.createElement("img");
                img.src = pieceMap[pieceChar];
                img.style.width = "60px";
                img.style.height = "60px";
                img.style.pointerEvents = "none"; 
                img.style.filter = "drop-shadow(4px 10px 8px rgba(0,0,0,0.8)) drop-shadow(0px -1px 2px rgba(255,255,255,0.4))"; 
                
                square.appendChild(img);
                square.classList.add("piece");
            }
        }
    }

    updateStatus(data);
    updateMoveHistory(data.move_history || []);
    renderCapturedPieces(data.captured_by_white || [], data.captured_by_black || []);
}

function renderCapturedPieces(capturedByWhite, capturedByBlack) {
    capWhiteElement.innerHTML = "";
    capBlackElement.innerHTML = "";

    capturedByWhite.forEach(piece => {
        if (pieceMap[piece]) {
            const img = document.createElement("img");
            img.src = pieceMap[piece];
            capWhiteElement.appendChild(img);
        }
    });

    capturedByBlack.forEach(piece => {
        if (pieceMap[piece]) {
            const img = document.createElement("img");
            img.src = pieceMap[piece];
            capBlackElement.appendChild(img);
        }
    });
}

function updateMoveHistory(history) {
    movesListWhite.innerHTML = "";
    movesListBlack.innerHTML = "";
    
    history.forEach((move, index) => {
        const li = document.createElement("li");
        li.textContent = `${Math.floor(index/2) + 1}. ${move}`;
        li.classList.add("move-item");
        
        if (index % 2 === 0) {
            li.classList.add("white-move");
            movesListWhite.appendChild(li);
        } else {
            li.classList.add("black-move");
            movesListBlack.appendChild(li);
        }
    });

    // Auto-scroll to bottom, works even if hidden
    movesListWhite.scrollTop = movesListWhite.scrollHeight;
    movesListBlack.scrollTop = movesListBlack.scrollHeight;
}

// Add click listeners to expand
movesListWhite.addEventListener("click", function() {
    this.classList.toggle("expanded");
});

movesListBlack.addEventListener("click", function() {
    this.classList.toggle("expanded");
});

function updateStatus(data) {
    currentTurn = data.turn;
    let statusText = `${currentTurn === 'white' ? "White" : "Black"}'s Turn`;
    let isGameOver = false;
    
    if (data.is_checkmate) {
        const winner = data.turn === 'white' ? 'Black' : 'White';
        showModal("Checkmate!", `${winner} wins the game.`);
        statusText = "Checkmate!";
        isGameOver = true;
    } else if (data.is_stalemate) {
        showModal("Stalemate!", "The game is a draw.");
        statusText = "Stalemate!";
        isGameOver = true;
    } else if (data.is_draw) {
        showModal("Draw!", "The game ended in a draw.");
        statusText = "Draw!";
        isGameOver = true;
    } else if (data.is_check) {
        statusText += " (Check)";
    }

    statusElement.textContent = statusText;
    
    if (isGameOver) {
        stopTimer();
    } else {
        startTimer();
    }
}

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateClocks() {
    if (clockWhite) clockWhite.textContent = formatTime(whiteTime);
    if (clockBlack) clockBlack.textContent = formatTime(blackTime);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    if (clockWhite) clockWhite.classList.remove("active");
    if (clockBlack) clockBlack.classList.remove("active");
}

function startTimer() {
    if (!clockWhite || !clockBlack) return;
    
    if (timerInterval) clearInterval(timerInterval);
    
    if (currentTurn === 'white') {
        clockWhite.classList.add("active");
        clockBlack.classList.remove("active");
    } else {
        clockWhite.classList.remove("active");
        clockBlack.classList.add("active");
    }

    timerInterval = setInterval(() => {
        if (currentTurn === 'white') whiteTime--;
        else blackTime--;
        
        updateClocks();
        
        if (whiteTime <= 0 || blackTime <= 0) {
            stopTimer();
            const winner = whiteTime <= 0 ? 'Black' : 'White';
            showModal("Timeout!", `${winner} wins on time.`);
        }
    }, 1000);
}

async function fetchLegalMoves(sqName) {
    try {
        const res = await fetch(`/api/legal_moves?sq=${sqName}`);
        const data = await res.json();
        data.moves.forEach(m => {
            const sq = document.getElementById(`sq-${m}`);
            if (sq) sq.classList.add("legal-hint");
        });
    } catch(e) {
        console.error("Legal moves fetch error:", e);
    }
}

async function handleSquareClick(sqName) {
    if (isPaused) return;
    
    if (!selectedSquare) {
        // Select square
        selectedSquare = sqName;
        // Re-render to show selection
        await fetchBoardState();
        fetchLegalMoves(sqName); // Add highlight overlay
    } else {
        if (selectedSquare === sqName) {
            // Deselect
            selectedSquare = null;
            fetchBoardState();
        } else {
            // Attempt move
            const source = selectedSquare;
            const target = sqName;
            selectedSquare = null;
            await submitMove(source, target);
        }
    }
}

async function submitMove(source, target) {
    try {
        const response = await fetch('/api/move', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ source, target })
        });
        
        if (!response.ok) {
            const data = await response.json();
            // Optional: Show invalid move briefly
            console.log(data.message);
        }
        
        // Refresh board regardless (clears selection, updates state)
        fetchBoardState();
    } catch (err) {
        console.error("Move error:", err);
    }
}

async function resetGame() {
    try {
        await fetch('/api/reset', { method: 'POST' });
        selectedSquare = null;
        whiteTime = 600;
        blackTime = 600;
        updateClocks();
        modal.classList.add('hidden');
        fetchBoardState();
    } catch (err) {
        console.error("Reset error:", err);
    }
}

function showModal(title, message) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modal.classList.remove('hidden');
}

// Global Chat State
const chatMessages = [];

window.sendChatMessage = function(player, inputId) {
    const input = document.getElementById(inputId);
    const text = input.value.trim();
    if (!text) return;
    
    chatMessages.push({ player, text });
    input.value = '';
    renderChat();
};

window.insertEmoji = function(inputId, emoji) {
    const input = document.getElementById(inputId);
    input.value += emoji;
    input.focus();
};

function renderChat() {
    const hw = document.getElementById("chat-history-white");
    const hb = document.getElementById("chat-history-black");
    if (!hw || !hb) return;
    
    hw.innerHTML = "";
    hb.innerHTML = "";
    
    chatMessages.forEach(msg => {
        const title = msg.player === 'white' ? 'P1' : 'P2';
        
        const div1 = document.createElement("div");
        div1.className = "chat-message";
        div1.innerHTML = `<strong>${title}:</strong> ${msg.text}`;
        hw.appendChild(div1);
        
        const div2 = document.createElement("div");
        div2.className = "chat-message";
        div2.innerHTML = `<strong>${title}:</strong> ${msg.text}`;
        hb.appendChild(div2);
    });
    
    hw.scrollTop = hw.scrollHeight;
    hb.scrollTop = hb.scrollHeight;
}

resetBtn.addEventListener("click", resetGame);
modalBtn.addEventListener("click", resetGame);
devilBtn.addEventListener("click", async () => {
    try {
        await fetch('/api/devil_mode', { method: 'POST' });
        fetchBoardState();
    } catch (err) {
        console.error("Devil mode error:", err);
    }
});

hintBtn.addEventListener("click", async () => {
    try {
        const res = await fetch('/api/hint');
        const data = await res.json();
        if (data.source && data.target) {
            // Deselect anything current
            selectedSquare = data.source;
            await fetchBoardState();
            
            // Highlight target
            const sq = document.getElementById(`sq-${data.target}`);
            if (sq) sq.classList.add("legal-hint");
        } else {
            console.log("No valid hint found!");
        }
    } catch(err) {
        console.error("Hint error:", err);
    }
});

// Initial load
fetchBoardState();