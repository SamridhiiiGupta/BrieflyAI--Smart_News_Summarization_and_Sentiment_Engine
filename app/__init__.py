from flask import Flask
from flask_cors import CORS
from app.config import Config


def create_app():
    """Application factory — creates and configures the Flask app."""
    app = Flask(__name__, template_folder="../templates", static_folder="../static")
    app.config.from_object(Config)

    CORS(app)

    # Register blueprints
    from app.routes.api import api_bp
    from app.routes.views import views_bp

    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(views_bp)

    return app
