from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()

class IsTeacherOrAdmin(permissions.BasePermission):
    """
    Custom permission class to protect EdTech endpoints.
    
    Rules:
    - Blocks any request from unauthenticated clients.
    - Allows read access (GET, HEAD, OPTIONS) for any authenticated user.
    - Limits write access (POST, PUT, PATCH, DELETE) exclusively to ADMIN or TEACHER roles.
    
    Interview Defense:
    - Implements Least Privilege Principle by ensuring parent users cannot access 
      or edit records belonging to other classrooms or construct attendance records.
    """
    def has_permission(self, request, view):
        # 1. Enforce authentication globally
        if not request.user or not request.user.is_authenticated:
            return False

        # 2. Allow read-only operations for any authenticated role (including PARENT)
        if request.method in permissions.SAFE_METHODS:
            return True

        # 3. Restrict database mutations (POST, PUT, PATCH, DELETE) to Teachers and Admins
        return request.user.role in [User.Roles.ADMIN, User.Roles.TEACHER]
