
from flask import Flask, render_template, send_from_directory, Response
import os

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")


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


@app.route("/service-worker.js")
def service_worker():
    return send_from_directory(
        app.root_path,
        "service-worker.js",
        mimetype="application/javascript"
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
