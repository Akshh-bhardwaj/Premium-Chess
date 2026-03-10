from flask import Flask, render_template, jsonify, request
import chess

app = Flask(__name__)
# Keep the board state in memory (Note: for single-player global state only; for multi-user we would need sessions)
board = chess.Board()

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/board")
def get_board():
    return jsonify({
        "fen": board.fen(),
        "turn": "white" if board.turn == chess.WHITE else "black",
        "is_check": board.is_check(),
        "is_checkmate": board.is_checkmate(),
        "is_stalemate": board.is_stalemate(),
        "is_draw": board.is_game_over() and not board.is_checkmate()
    })

@app.route("/api/move", methods=["POST"])
def make_move():
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
            board.push(move)
            return jsonify({"success": True, "message": "Move successful"})
        
        # Check if it was a pawn promotion move
        move_promo = chess.Move.from_uci(move_str + "q")
        if move_promo in board.legal_moves:
            board.push(move_promo)
            return jsonify({"success": True, "message": "Promotion successful"})
            
    except ValueError:
        pass
        
    return jsonify({"success": False, "message": "Invalid move"}), 400

@app.route("/api/reset", methods=["POST"])
def reset_game():
    global board
    board = chess.Board()
    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(debug=True)