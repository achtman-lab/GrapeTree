import os
import sys

from flask import Flask

from . import config


package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if getattr(sys, 'frozen', False):
    asset_root = sys._MEIPASS
elif os.path.isfile(os.path.join(package_root, 'MSTree_holder.html')):
    asset_root = package_root
else:
    # Editable installs use the package from ``grapetree/`` while the static
    # GitHub Pages application remains at the repository root.
    asset_root = os.path.dirname(package_root)

app = Flask(
    __name__,
    template_folder=asset_root,
    static_folder=os.path.join(asset_root, 'static'),
)

app.config.from_object(config)

from . import views
