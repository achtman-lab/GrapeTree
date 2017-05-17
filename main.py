import threading
import webbrowser
from flask import Flask
from grapetree import app
import shutil

def open_browser(PORT):
    """Start a browser after waiting for half a second."""
    def _open_browser():
        webbrowser.open('http://localhost:%s' % PORT)
    thread = threading.Timer(0.5, _open_browser)
    thread.start()

def install_static():
    shutil.copyfile('MSTree_holder.html', 'grapetree/templates/MSTree_launch.html')


if __name__ == "__main__":
    install_static()
    open_browser(app.config.get('PORT'))
    app.run(port=app.config.get('PORT'))
