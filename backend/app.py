from flask import Flask, render_template, jsonify, request, session, redirect, url_for, flash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
import chess
import uuid
import os
import sqlite3
import bcrypt

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-chess-key-change-in-production')

# ─── Flask-Login Setup ────────────────────────────────────────────
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth'          # redirect here if not logged in
login_manager.login_message = ''

# ─── Database Setup ───────────────────────────────────────────────
DB_FILE = os.path.join(os.path.dirname(__file__), 'chess_stats.db')

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT    UNIQUE NOT NULL,
            password TEXT    NOT NULL
        );
        CREATE TABLE IF NOT EXISTS players (
            username TEXT PRIMARY KEY,
            wins     INTEGER DEFAULT 0,
            losses   INTEGER DEFAULT 0,
            draws    INTEGER DEFAULT 0
        );
    ''')
    conn.commit()
    conn.close()

init_db()

# ─── User Model (Flask-Login) ─────────────────────────────────────
class User(UserMixin):
    def __init__(self, id_, username):
        self.id       = id_
        self.username = username

@login_manager.user_loader
def load_user(user_id):
    conn = get_db()
    row  = conn.execute('SELECT id, username FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    if row:
        return User(row['id'], row['username'])
    return None

# ─── In-memory game state ─────────────────────────────────────────
games = {}

INITIAL_WHITE_PIECES = {'P': 8, 'N': 2, 'B': 2, 'R': 2, 'Q': 1, 'K': 1}
INITIAL_BLACK_PIECES = {'p': 8, 'n': 2, 'b': 2, 'r': 2, 'q': 1, 'k': 1}

def get_user_game():
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    sid = session['session_id']
    if sid not in games:
        games[sid] = {'board': chess.Board(), 'move_history': [], 'devil_mode_active': False}
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
        for cap_list, pawn_sym, queen_sym in [(captured_by_white, 'p', 'q'), (captured_by_black, 'P', 'Q')]:
            extra_queens = current_counts.get(queen_sym, 0) - 1
            while extra_queens > 0 and pawn_sym in cap_list:
                cap_list.remove(pawn_sym)
                extra_queens -= 1

    return captured_by_white, captured_by_black

# ─── Auth Routes ──────────────────────────────────────────────────
@app.route('/auth', methods=['GET', 'POST'])
def auth():
    if current_user.is_authenticated:
        return redirect(url_for('home'))

    error   = None
    success = None

    if request.method == 'POST':
        action   = request.form.get('action')          # 'login' or 'register'
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()

        if not username or not password:
            error = 'Username and password are required.'
        elif action == 'register':
            conn = get_db()
            existing = conn.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone()
            if existing:
                error = 'Username already taken. Please choose another.'
                conn.close()
            else:
                hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
                conn.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, hashed))
                conn.execute('INSERT OR IGNORE INTO players (username) VALUES (?)', (username,))
                conn.commit()
                conn.close()
                success = 'Account created! You can now log in.'
        elif action == 'login':
            conn = get_db()
            row = conn.execute('SELECT id, username, password FROM users WHERE username = ?', (username,)).fetchone()
            conn.close()
            if row and bcrypt.checkpw(password.encode(), row['password']):
                user = User(row['id'], row['username'])
                login_user(user, remember=True)
                return redirect(url_for('home'))
            else:
                error = 'Invalid username or password.'

    return render_template('auth.html', error=error, success=success)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth'))

# ─── Game Routes ──────────────────────────────────────────────────
@app.route('/')
@login_required
def home():
    get_user_game()
    return render_template('index.html', username=current_user.username)

@app.route('/ludo')
@login_required
def ludo():
    return render_template('ludo.html', username=current_user.username)

@app.route('/api/board')
@login_required
def get_board():
    game_state = get_user_game()
    board = game_state['board']
    cap_white, cap_black = get_captured_pieces(game_state)
    return jsonify({
        'fen':              board.fen(),
        'turn':             'white' if board.turn == chess.WHITE else 'black',
        'is_check':         board.is_check(),
        'is_checkmate':     board.is_checkmate(),
        'is_stalemate':     board.is_stalemate(),
        'is_draw':          board.is_game_over() and not board.is_checkmate(),
        'move_history':     game_state['move_history'],
        'captured_by_white': cap_white,
        'captured_by_black': cap_black,
    })

@app.route('/api/move', methods=['POST'])
@login_required
def make_move():
    game_state = get_user_game()
    board      = game_state['board']
    data       = request.json
    source     = data.get('source')
    target     = data.get('target')
    move_str   = f'{source}{target}'
    try:
        move = chess.Move.from_uci(move_str)
        if move in board.legal_moves:
            game_state['move_history'].append(board.san(move))
            board.push(move)
            return jsonify({'success': True})
        move_promo = chess.Move.from_uci(move_str + 'q')
        if move_promo in board.legal_moves:
            game_state['move_history'].append(board.san(move_promo))
            board.push(move_promo)
            return jsonify({'success': True})
    except ValueError:
        pass
    return jsonify({'success': False, 'message': 'Invalid move'}), 400

@app.route('/api/legal_moves')
@login_required
def legal_moves():
    game_state = get_user_game()
    board      = game_state['board']
    sq_name    = request.args.get('sq')
    if not sq_name:
        return jsonify({'moves': []})
    try:
        sq_index = chess.parse_square(sq_name)
    except ValueError:
        return jsonify({'moves': []})
    moves = [chess.square_name(m.to_square) for m in board.legal_moves if m.from_square == sq_index]
    return jsonify({'moves': moves})

@app.route('/api/hint')
@login_required
def get_hint():
    import random
    game_state = get_user_game()
    board      = game_state['board']
    moves      = list(board.legal_moves)
    if not moves:
        return jsonify({'source': None, 'target': None})
    captures   = [m for m in moves if board.is_capture(m)]
    chosen     = random.choice(captures) if captures else random.choice(moves)
    return jsonify({'source': chess.square_name(chosen.from_square), 'target': chess.square_name(chosen.to_square)})

@app.route('/api/devil_mode', methods=['POST'])
@login_required
def devil_mode():
    game_state   = get_user_game()
    board        = game_state['board']
    game_state['devil_mode_active'] = True
    active_color = board.turn
    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if piece and piece.piece_type == chess.PAWN and piece.color == active_color:
            board.set_piece_at(sq, chess.Piece(chess.QUEEN, active_color))
    return jsonify({'success': True})

@app.route('/api/reset', methods=['POST'])
@login_required
def reset_game():
    if 'session_id' in session:
        games[session['session_id']] = {'board': chess.Board(), 'move_history': [], 'devil_mode_active': False}
    return jsonify({'success': True})

@app.route('/api/record_game', methods=['POST'])
@login_required
def record_game():
    data         = request.json
    white_player = data.get('white', 'Guest').strip()
    black_player = data.get('black', 'Guest').strip()
    result       = data.get('result')

    if not white_player or not black_player or not result:
        return jsonify({'success': False}), 400

    conn = get_db()
    for player in [white_player, black_player]:
        conn.execute('INSERT OR IGNORE INTO players (username) VALUES (?)', (player,))
    if result == 'white':
        conn.execute('UPDATE players SET wins   = wins   + 1 WHERE username = ?', (white_player,))
        conn.execute('UPDATE players SET losses = losses + 1 WHERE username = ?', (black_player,))
    elif result == 'black':
        conn.execute('UPDATE players SET wins   = wins   + 1 WHERE username = ?', (black_player,))
        conn.execute('UPDATE players SET losses = losses + 1 WHERE username = ?', (white_player,))
    elif result == 'draw':
        conn.execute('UPDATE players SET draws = draws + 1 WHERE username = ?', (white_player,))
        conn.execute('UPDATE players SET draws = draws + 1 WHERE username = ?', (black_player,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/leaderboard')
@login_required
def leaderboard():
    conn = get_db()
    rows = conn.execute(
        'SELECT username, wins, losses, draws FROM players ORDER BY wins DESC LIMIT 20'
    ).fetchall()
    conn.close()
    return jsonify({'leaderboard': [dict(r) for r in rows]})

@app.route('/api/bot_move', methods=['POST'])
@login_required
def bot_move():
    """Smart bot: checkmate → captures (by value) → checks → random."""
    import random
    game_state = get_user_game()
    board      = game_state['board']

    # Piece values for capture scoring
    PIECE_VALUES = {
        chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
        chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0
    }

    legal = list(board.legal_moves)
    if not legal:
        return jsonify({'success': False, 'message': 'No legal moves'}), 400

    best_move = None

    # 1. Look for immediate checkmate
    for move in legal:
        board.push(move)
        if board.is_checkmate():
            board.pop()
            best_move = move
            break
        board.pop()

    # 2. Highest-value capture
    if not best_move:
        capture_moves = [(m, PIECE_VALUES.get(
            board.piece_at(m.to_square).piece_type, 0)
            if board.piece_at(m.to_square) else 0)
            for m in legal if board.is_capture(m)]
        if capture_moves:
            best_move = max(capture_moves, key=lambda x: x[1])[0]

    # 3. Any move that gives check
    if not best_move:
        for move in legal:
            board.push(move)
            if board.is_check():
                board.pop()
                best_move = move
                break
            board.pop()

    # 4. Fallback: random
    if not best_move:
        best_move = random.choice(legal)

    san = board.san(best_move)
    game_state['move_history'].append(san)
    board.push(best_move)

    cap_white, cap_black = get_captured_pieces(game_state)
    return jsonify({
        'success': True,
        'move':    san,
        'fen':             board.fen(),
        'turn':            'white' if board.turn == chess.WHITE else 'black',
        'is_check':        board.is_check(),
        'is_checkmate':    board.is_checkmate(),
        'is_stalemate':    board.is_stalemate(),
        'is_draw':         board.is_game_over() and not board.is_checkmate(),
        'move_history':    game_state['move_history'],
        'captured_by_white': cap_white,
        'captured_by_black': cap_black,
    })

if __name__ == '__main__':
    app.run(debug=True)