from .._version import __version__


VERSION = __version__
JAVASCRIPT_VERSION = '0.1.8'
DEBUG = False
PORT = 8000

# Flask 3.1 limits each non-file form field to 500 KiB by default. Profile
# matrices are intentionally submitted as a single form field and routinely
# exceed that size, so retain a bounded but practical application limit.
MAX_FORM_MEMORY_SIZE = 64 * 1024 * 1024
MAX_CONTENT_LENGTH = 64 * 1024 * 1024

# Web requests use one worker so they remain safe under the multiprocessing
# spawn model used by current macOS and Windows Python builds. CLI users can
# still select parallel workers directly.
PARAMS = dict(method='MSTreeV2', n_proc=1)
