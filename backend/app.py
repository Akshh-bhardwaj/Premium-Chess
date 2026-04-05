from flask import Flask, render_template, jsonify, request, session
import chess
import uuid
import os
import sqlite3

app = Flask(__name__)
# Generate a simple secret key for sessions
app.secret_key = os.urandom(24)

# Database Setup
DB_FILE = 'chess_stats.db'

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS players (
            username TEXT PRIMARY KEY,
            wins INTEGER DEFAULT 0,
            losses INTEGER DEFAULT 0,
            draws INTEGER DEFAULT 0
        )
    ''')
    conn.commit()
    conn.close()

# Initialize DB on script load
init_db()

# Keep the board state in memory mapped to session IDs
# Structure: games[sid] = {'board': chess.Board(), 'move_history': [], 'devil_mode_active': False}
games = {}

INITIAL_WHITE_PIECES = {'P': 8, 'N': 2, 'B': 2, 'R': 2, 'Q': 1, 'K': 1}
INITIAL_BLACK_PIECES = {'p': 8, 'n': 2, 'b': 2, 'r': 2, 'q': 1, 'k': 1}

def get_user_game():
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    
    sid = session['session_id']
    if sid not in games:
        games[sid] = {
            'board': chess.Board(),
            'move_history': [],
            'devil_mode_active': False
        }
        
    return games[sid]

def get_captured_pieces(game_state):
    board = game_state['board']
    current_counts = {}
    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if piece:
            sym = piece.symbol()
            current_counts[sym] = current_counts.get(sym, 0) + 1
            
    captured_by_white = []
    for piece, limit in INITIAL_BLACK_PIECES.items():
        missing = limit - current_counts.get(piece, 0)
        if missing > 0:
            captured_by_white.extend([piece] * missing)
            
    captured_by_black = []
    for piece, limit in INITIAL_WHITE_PIECES.items():
        missing = limit - current_counts.get(piece, 0)
        if missing > 0:
            captured_by_black.extend([piece] * missing)

    if game_state['devil_mode_active']:
        # Cancel out pawns that were promoted to queens by devil mode
        for cap_list, pawn_sym, queen_sym in [(captured_by_white, 'p', 'q'), (captured_by_black, 'P', 'Q')]:
            extra_queens = current_counts.get(queen_sym, 0) - 1
            while extra_queens > 0 and pawn_sym in cap_list:
                cap_list.remove(pawn_sym)
                extra_queens -= 1
                
    return captured_by_white, captured_by_black

@app.route("/")
def home():
    get_user_game() # ensure session is created on load
    return render_template("index.html")

@app.route("/api/board")
def get_board():
    game_state = get_user_game()
    board = game_state['board']
    cap_white, cap_black = get_captured_pieces(game_state)
    return jsonify({
        "fen": board.fen(),
        "turn": "white" if board.turn == chess.WHITE else "black",
        "is_check": board.is_check(),
        "is_checkmate": board.is_checkmate(),
        "is_stalemate": board.is_stalemate(),
        "is_draw": board.is_game_over() and not board.is_checkmate(),
        "move_history": game_state['move_history'],
        "captured_by_white": cap_white,
        "captured_by_black": cap_black
    })

@app.route("/api/move", methods=["POST"])
def make_move():
    game_state = get_user_game()
    board = game_state['board']
    data = request.json
    source = data.get("source")
    target = data.get("target")

    # Assuming source and target are standard algebraic notation, e.g., 'e2', 'e4'
    move_str = f"{source}{target}"
    
    # Check for promotion: if a pawn reaches the last rank, default auto-promote to Queen for simplicity
    try:
        # Move without promotion specifier
        move = chess.Move.from_uci(move_str)
        if move in board.legal_moves:
            game_state['move_history'].append(board.san(move))
            board.push(move)
            return jsonify({"success": True, "message": "Move successful"})
        
        # Check if it was a pawn promotion move
        move_promo = chess.Move.from_uci(move_str + "q")
        if move_promo in board.legal_moves:
            game_state['move_history'].append(board.san(move_promo))
            board.push(move_promo)
            return jsonify({"success": True, "message": "Promotion successful"})
            
    except ValueError:
        pass
        
    return jsonify({"success": False, "message": "Invalid move"}), 400

@app.route("/api/legal_moves")
def legal_moves():
    game_state = get_user_game()
    board = game_state['board']
    sq_name = request.args.get("sq")
    if not sq_name:
        return jsonify({"moves": []})
        
    try:
        sq_index = chess.parse_square(sq_name)
    except ValueError:
        return jsonify({"moves": []})

    moves = []
    for move in board.legal_moves:
        if move.from_square == sq_index:
            moves.append(chess.square_name(move.to_square))
            
    return jsonify({"moves": moves})

@app.route("/api/hint")
def get_hint():
    import random
    game_state = get_user_game()
    board = game_state['board']
    moves = list(board.legal_moves)
    if not moves:
        return jsonify({"source": None, "target": None})
    
    # Prioritize captures
    capture_moves = [m for m in moves if board.is_capture(m)]
    chosen_move = random.choice(capture_moves) if capture_moves else random.choice(moves)
    
    return jsonify({
        "source": chess.square_name(chosen_move.from_square),
        "target": chess.square_name(chosen_move.to_square)
    })

@app.route("/api/devil_mode", methods=["POST"])
def devil_mode():
    game_state = get_user_game()
    board = game_state['board']
    game_state['devil_mode_active'] = True
    active_color = board.turn
    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if piece and piece.piece_type == chess.PAWN and piece.color == active_color:
            board.set_piece_at(sq, chess.Piece(chess.QUEEN, active_color))
    return jsonify({"success": True})

@app.route("/api/reset", methods=["POST"])
def reset_game():
    if 'session_id' in session:
        games[session['session_id']] = {
            'board': chess.Board(),
            'move_history': [],
            'devil_mode_active': False
        }
    return jsonify({"success": True})

@app.route("/api/record_game", methods=["POST"])
def record_game():
    data = request.json
    white_player = data.get("white", "Player 1").strip()
    black_player = data.get("black", "Player 2").strip()
    result = data.get("result") # "white", "black", or "draw"
    
    if not white_player or not black_player or not result:
        return jsonify({"success": False, "message": "Missing data"}), 400

    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # Ensure players exist
    for player in [white_player, black_player]:
        c.execute('INSERT OR IGNORE INTO players (username) VALUES (?)', (player,))
        
    if result == "white":
        c.execute('UPDATE players SET wins = wins + 1 WHERE username = ?', (white_player,))
        c.execute('UPDATE players SET losses = losses + 1 WHERE username = ?', (black_player,))
    elif result == "black":
        c.execute('UPDATE players SET wins = wins + 1 WHERE username = ?', (black_player,))
        c.execute('UPDATE players SET losses = losses + 1 WHERE username = ?', (white_player,))
    elif result == "draw":
        c.execute('UPDATE players SET draws = draws + 1 WHERE username = ?', (white_player,))
        c.execute('UPDATE players SET draws = draws + 1 WHERE username = ?', (black_player,))
        
    conn.commit()
    conn.close()
    
    return jsonify({"success": True})

@app.route("/api/leaderboard", methods=["GET"])
def leaderboard():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT username, wins, losses, draws FROM players ORDER BY wins DESC LIMIT 20')
    top_players = [{"username": row[0], "wins": row[1], "losses": row[2], "draws": row[3]} for row in c.fetchall()]
    conn.close()
    
    return jsonify({"leaderboard": top_players})

if __name__ == "__main__":
    app.run(debug=True)