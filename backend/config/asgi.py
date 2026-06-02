import os
from django.core.asgi import get_asgi_application

# Tell Django which settings module to load
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Initialize the ASGI application callable
application = get_asgi_application()
