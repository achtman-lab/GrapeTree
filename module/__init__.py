from flask import Flask
import config
import sys
import os

if getattr(sys, 'frozen', False):
    template_folder = sys._MEIPASS #os.path.join(sys._MEIPASS, 'templates')
    static_folder = os.path.join(sys._MEIPASS, 'static')
    app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
else:
    app = Flask(__name__, template_folder=os.path.dirname(os.path.dirname(os.path.abspath(__file__))), static_folder=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'static'))

app.config.from_object(config)

import views
