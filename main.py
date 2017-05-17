import threading
import webbrowser
from flask import Flask
from grapetree import app


def open_browser(PORT=5000):
    """Start a browser after waiting for half a second."""
    def _open_browser():
        webbrowser.open('http://localhost:%s' % PORT)
    thread = threading.Timer(0.5, _open_browser)
    thread.start()


if __name__ == "__main__":
    open_browser(app.config.get('PORT'))
    app.run()
