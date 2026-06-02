from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from core.views import CustomTokenObtainPairView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # SimpleJWT Authenticated Endpoints
    # Interview Defense:
    # - CustomTokenObtainPairView intercepts standard token obtain to attach role-based metadata.
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Application APIs
    path('api/', include('core.urls')),
]
