
from flask import (
    Flask, render_template, send_from_directory,
    Response, request, jsonify, session
)
from werkzeug.security import generate_password_hash, check_password_hash
from contextlib import contextmanager
import sqlite3
import os
import re

app = Flask(__name__)

# Secret Key
app.secret_key = os.environ.get(
    "SECRET_KEY",
    "nextgen-ai-teacher-development-key-change-me"
)

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=bool(os.environ.get("RENDER"))
)

# Database
os.makedirs(app.instance_path, exist_ok=True)
DATABASE = os.path.join(app.instance_path, "users.db")


@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row

    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# Create Users Table
def create_table():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        """)


create_table()


# HOME PAGE
@app.route("/")
def home():
    return render_template(
        "index.html",
        user_name=session.get("user_name"),
        user_id=session.get("user_id")
    )


# SIGN UP API
@app.route("/api/signup", methods=["POST"])
def signup():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify(
            success=False,
            message="Invalid request."
        ), 400

    name = data.get("name", "")
    email = data.get("email", "")
    password = data.get("password", "")

    if not all(isinstance(x, str) for x in (name, email, password)):
        return jsonify(
            success=False,
            message="Invalid input."
        ), 400

    name = name.strip()
    email = email.strip().lower()

    if not name or not email or not password:
        return jsonify(
            success=False,
            message="Sabhi fields bharna zaroori hai."
        ), 400

    if len(name) > 80:
        return jsonify(
            success=False,
            message="Name bahut lamba hai."
        ), 400

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify(
            success=False,
            message="Valid email address enter karein."
        ), 400

    if len(password) < 8:
        return jsonify(
            success=False,
            message="Password kam se kam 8 characters ka hona chahiye."
        ), 400

    hashed_password = generate_password_hash(password)

    try:
        with get_db() as conn:

            cursor = conn.execute(
                """
                INSERT INTO users (name, email, password)
                VALUES (?, ?, ?)
                """,
                (name, email, hashed_password)
            )

            user_id = cursor.lastrowid

        session.clear()
        session["user_id"] = user_id
        session["user_name"] = name

        return jsonify(
            success=True,
            message="Account successfully create ho gaya!"
        )

    except sqlite3.IntegrityError:
        return jsonify(
            success=False,
            message="Ye email pehle se registered hai. Login karein."
        ), 409


# LOGIN API
@app.route("/api/login", methods=["POST"])
def login():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify(
            success=False,
            message="Invalid request."
        ), 400

    email = data.get("email", "")
    password = data.get("password", "")

    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify(
            success=False,
            message="Invalid input."
        ), 400

    email = email.strip().lower()

    if not email or not password:
        return jsonify(
            success=False,
            message="Email aur password enter karein."
        ), 400

    with get_db() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (email,)
        ).fetchone()

    if user is None or not check_password_hash(
        user["password"], password
    ):
        return jsonify(
            success=False,
            message="Email ya password galat hai."
        ), 401

    session.clear()
    session["user_id"] = user["id"]
    session["user_name"] = user["name"]

    return jsonify(
        success=True,
        message="Login successful!"
    )


# LOGOUT API
@app.route("/api/logout", methods=["POST"])
def logout():

    session.clear()

    return jsonify(
        success=True,
        message="Logout successful!"
    )


# SITEMAP
@app.route("/sitemap.xml")
def sitemap():

    xml = """<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url>
            <loc>https://nextgen-ai-teacher.onrender.com/</loc>
        </url>
    </urlset>
    """

    return Response(xml, mimetype="application/xml")


# SERVICE WORKER
@app.route("/service-worker.js")
def service_worker():

    return send_from_directory(
        app.root_path,
        "service-worker.js",
        mimetype="application/javascript"
    )


# RUN APP
if __name__ == "__main__":

    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=os.environ.get("FLASK_DEBUG") == "1"
    )
