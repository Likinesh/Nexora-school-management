import os
from django.core.wsgi import get_wsgi_application

# Tell Django which settings module to load
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Initialize the WSGI application callable
application = get_wsgi_application()
