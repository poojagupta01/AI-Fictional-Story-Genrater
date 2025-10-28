from flask import Flask, request, jsonify, send_from_directory, session, redirect, url_for
import os
from openai import OpenAI
from dotenv import load_dotenv
from functools import wraps
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import secrets

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', secrets.token_hex(32))

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Database setup
def init_db():
    """Initialize the database with users table"""
    conn = sqlite3.connect('plotpilot.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            character_name TEXT,
            theme TEXT,
            genre TEXT,
            location TEXT,
            story_text TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"success": False, "error": "Please log in to continue"}), 401
        return f(*args, **kwargs)
    return decorated_function

# Database helper functions
def get_db():
    conn = sqlite3.connect('plotpilot.db')
    conn.row_factory = sqlite3.Row
    return conn

def generate_ai_story(character_name, theme, genre, location, length):
    """Generate story using OpenAI GPT"""
    
    # Map length to word count
    length_map = {
        "short": "500-800 words",
        "medium": "1000-1500 words",
        "long": "2000-3000 words"
    }
    
    word_count = length_map.get(length, "1000-1500 words")
    
    # Create the prompt
    prompt = f"""Write an engaging and creative story with the following specifications:
Character Name: {character_name}
Theme: {theme}
Genre: {genre}
Location/Setting: {location}
Length: {word_count}

Please write a complete, well-structured story with a clear beginning, middle, and end. Make it immersive, descriptive, and engaging. Include dialogue where appropriate and bring the characters and setting to life."""

    try:
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a creative storytelling expert who writes engaging, immersive stories."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4096,
            temperature=0.9
        )
        
        story_text = response.choices[0].message.content
        
        return {
            "success": True,
            "story": story_text,
            "character": character_name,
            "theme": theme,
            "genre": genre,
            "location": location
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

# Routes for serving static files
@app.route('/')
def index():
    if 'user_id' not in session:
        return send_from_directory('.', 'login.html')
    return send_from_directory('.', 'index.html')

@app.route('/login.html')
def login_page():
    return send_from_directory('.', 'login.html')

@app.route('/index.html')
def app_page():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    return send_from_directory('.', 'index.html')

@app.route('/styles.css')
def style():
    return send_from_directory('.', 'styles.css')

@app.route('/auth-styles.css')
def auth_style():
    return send_from_directory('.', 'auth-styles.css')

@app.route('/script.js')
def script():
    return send_from_directory('.', 'script.js')

@app.route('/auth.js')
def auth_script():
    return send_from_directory('.', 'auth.js')

# Authentication Routes
@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        # Validation
        if not username or len(username) < 3:
            return jsonify({"success": False, "error": "Username must be at least 3 characters"}), 400
        
        if not email or '@' not in email:
            return jsonify({"success": False, "error": "Please enter a valid email"}), 400
        
        if not password or len(password) < 6:
            return jsonify({"success": False, "error": "Password must be at least 6 characters"}), 400
        
        # Check if user already exists
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM users WHERE username = ? OR email = ?", (username, email))
        existing_user = cursor.fetchone()
        
        if existing_user:
            conn.close()
            return jsonify({"success": False, "error": "Username or email already exists"}), 400
        
        # Create new user
        password_hash = generate_password_hash(password)
        cursor.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            (username, email, password_hash)
        )
        conn.commit()
        
        user_id = cursor.lastrowid
        conn.close()
        
        # Create session
        session['user_id'] = user_id
        session['username'] = username
        
        return jsonify({
            "success": True,
            "message": "Account created successfully!",
            "username": username
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({"success": False, "error": "Please enter both username and password"}), 400
        
        # Find user
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, password_hash FROM users WHERE username = ? OR email = ?", 
                      (username, username))
        user = cursor.fetchone()
        conn.close()
        
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({"success": False, "error": "Invalid username or password"}), 401
        
        # Create session
        session['user_id'] = user['id']
        session['username'] = user['username']
        
        return jsonify({
            "success": True,
            "message": "Login successful!",
            "username": user['username']
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully"})

@app.route('/api/check-session', methods=['GET'])
def check_session():
    if 'user_id' in session:
        return jsonify({
            "success": True,
            "logged_in": True,
            "username": session.get('username')
        })
    return jsonify({"success": True, "logged_in": False})

# Story Generation Route (Protected)
@app.route('/api/generate', methods=['POST'])
@login_required
def generate():
    try:
        data = request.json
        
        character_name = data.get('characterName', 'The Protagonist')
        theme = data.get('theme', 'Adventure')
        genre = data.get('genre', 'Fantasy')
        location = data.get('location', 'Unknown Land')
        length = data.get('length', 'medium')
        
        result = generate_ai_story(character_name, theme, genre, location, length)
        
        if result['success']:
            # Save story to database
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO stories (user_id, character_name, theme, genre, location, story_text) VALUES (?, ?, ?, ?, ?, ?)",
                (session['user_id'], character_name, theme, genre, location, result['story'])
            )
            conn.commit()
            conn.close()
            
            return jsonify(result)
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Get user's stories
@app.route('/api/my-stories', methods=['GET'])
@login_required
def get_my_stories():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, character_name, theme, genre, location, created_at FROM stories WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
            (session['user_id'],)
        )
        stories = cursor.fetchall()
        conn.close()
        
        stories_list = [{
            "id": story['id'],
            "character_name": story['character_name'],
            "theme": story['theme'],
            "genre": story['genre'],
            "location": story['location'],
            "created_at": story['created_at']
        } for story in stories]
        
        return jsonify({"success": True, "stories": stories_list})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)