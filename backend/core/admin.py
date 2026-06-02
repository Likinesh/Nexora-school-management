from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Student, Attendance, Invoice

class CustomUserAdmin(UserAdmin):
    model = User
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Role Fields', {'fields': ('role',)}),
    )
    list_display = ['username', 'email', 'role', 'is_staff', 'is_active']
    list_filter = ['role', 'is_staff', 'is_active']

admin.site.register(User, CustomUserAdmin)
admin.site.register(Student)
admin.site.register(Attendance)
admin.site.register(Invoice)
