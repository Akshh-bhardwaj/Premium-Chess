const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const resetBtn = document.getElementById("reset-btn");
const modal = document.getElementById("game-over-modal");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalBtn = document.getElementById("modal-btn");

let selectedSquare = null;

const pieceMap = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙', // White
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'  // Black
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
    boardElement.innerHTML = "";
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

    // Render HTML Grid
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement("div");
            square.classList.add("square");
            
            // Checkerboard pattern
            if ((row + col) % 2 === 0) {
                square.classList.add("white");
            } else {
                square.classList.add("black");
            }

            const sqName = getSquareName(row, col);
            square.dataset.sq = sqName;
            
            if (selectedSquare === sqName) {
                square.classList.add("selected");
            }

            const pieceChar = grid[row][col];
            if (pieceChar) {
                square.textContent = pieceMap[pieceChar];
                square.classList.add("piece");
                // Optional: set specific colors for white/black pieces if not relying on character color
                square.style.color = pieceChar === pieceChar.toUpperCase() ? '#fff' : '#000';
            }

            square.addEventListener("click", () => handleSquareClick(sqName));
            boardElement.appendChild(square);
        }
    }

    updateStatus(data);
}

function updateStatus(data) {
    let statusText = `${data.turn === 'white' ? "White" : "Black"}'s Turn`;
    
    if (data.is_checkmate) {
        const winner = data.turn === 'white' ? 'Black' : 'White';
        showModal("Checkmate!", `${winner} wins the game.`);
        statusText = "Checkmate!";
    } else if (data.is_stalemate) {
        showModal("Stalemate!", "The game is a draw.");
        statusText = "Stalemate!";
    } else if (data.is_draw) {
        showModal("Draw!", "The game ended in a draw.");
        statusText = "Draw!";
    } else if (data.is_check) {
        statusText += " (Check)";
    }

    statusElement.textContent = statusText;
}

async function handleSquareClick(sqName) {
    if (!selectedSquare) {
        // Select square
        selectedSquare = sqName;
        // Re-render to show selection
        fetchBoardState();
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

resetBtn.addEventListener("click", resetGame);
modalBtn.addEventListener("click", resetGame);

// Initial load
fetchBoardState();