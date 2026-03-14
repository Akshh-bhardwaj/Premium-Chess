# ♔ Premium Chess

A sophisticated full-stack chess web application built using Python (Flask) on the backend and HTML/CSS/JS for the responsive frontend. 

The application uses the robust `python-chess` library to strictly enforce move validation, check/checkmate detection, castling, and pawn promotion. Each connected user is automatically assigned a unique session identifier to ensure their board state is fully isolated.

## 🚀 Features
- **Real-time Validation**: Fast move verification powered by `python-chess`.
- **Game State Tracking**: Accurately tracks check, checkmate, stalemate, and draws.
- **Pawn Promotion**: Seamless queen promotion logic.
- **Multi-session Support**: Designed to handle multiple clients simultaneously without board-state collisions.
- **Modern UI**: Clean, responsive frontend designed with HTML, CSS, and vanilla JS.

## 🛠 Tech Stack
- **Backend:** Python, Flask, python-chess
- **Frontend:** HTML5, modern CSS3, Vanilla JavaScript (Fetch API)

## 💻 How to Run Locally

### Prerequisites
1. Ensure you have Python installed.
2. Clone the repository.

### Installation
1. Navigate into the repository and create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Install the backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Server
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Run the Flask application:
   ```bash
   python app.py
   ```
3. Open your browser and navigate to `http://127.0.0.1:5000` to start playing!

---

**Built with ❤️ by Akshit Sharma**
