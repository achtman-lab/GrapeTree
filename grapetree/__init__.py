from flask import Flask
import config

app = Flask(__name__, static_folder='../static')
app.config.from_object(config)

from grapetree import views
