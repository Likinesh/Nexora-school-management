from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()

class IsTeacherOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in [User.Roles.ADMIN, User.Roles.TEACHER]
