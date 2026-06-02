from django import forms
from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, Student, Attendance, Invoice, Classroom, PaymentAttempt, TeacherUser, ParentUser

admin.site.site_header = "Nexora School Platform"
admin.site.site_title = "Nexora"
admin.site.index_title = "Nexora Admin — Classroom & Finance Control"


class StudentInline(admin.TabularInline):
    model = Student
    fk_name = 'parent'
    extra = 1
    fields = ['first_name', 'last_name', 'class_name', 'date_of_birth']


class PaymentAttemptInline(admin.TabularInline):
    model = PaymentAttempt
    extra = 0
    readonly_fields = ['transaction_date', 'status']
    fields = ['amount_paid', 'status', 'transaction_date', 'notes']


# Core User Admin (All roles, full access) 

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    fieldsets = UserAdmin.fieldsets + (
        ('Role', {'fields': ('role',)}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'first_name', 'last_name'),
        }),
    )
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_active']
    list_filter = ['role', 'is_staff', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']


# Teacher Admin 

class TeacherUserAdmin(UserAdmin):
    model = TeacherUser
    verbose_name = 'Teacher'

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name', 'email', 'date_of_birth')}),
        (_('Status'), {'fields': ('is_active',)}),
    )
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_active']
    list_filter = ['is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']

    def get_queryset(self, request):
        return super().get_queryset(request).filter(role=User.Roles.TEACHER)

    def save_model(self, request, obj, form, change):
        obj.role = User.Roles.TEACHER
        super().save_model(request, obj, form, change)


admin.site.register(TeacherUser, TeacherUserAdmin)


# Parent Admin 

class ParentUserAdmin(UserAdmin):
    model = ParentUser
    verbose_name = 'Parent'

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name', 'email', 'date_of_birth')}),
        (_('Status'), {'fields': ('is_active',)}),
    )
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_active', 'child_count']
    list_filter = ['is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    inlines = [StudentInline]

    def get_queryset(self, request):
        return super().get_queryset(request).filter(role=User.Roles.PARENT)

    def save_model(self, request, obj, form, change):
        obj.role = User.Roles.PARENT
        super().save_model(request, obj, form, change)

    @admin.display(description='Students')
    def child_count(self, obj):
        return obj.children.count()


admin.site.register(ParentUser, ParentUserAdmin)


# Classroom Admin 
@admin.register(Classroom)
class ClassroomAdmin(admin.ModelAdmin):
    list_display = ['name', 'class_name', 'teacher']
    list_filter = ['class_name']
    search_fields = ['name', 'teacher__username', 'teacher__first_name']
    autocomplete_fields = ['teacher']


# Invoice Admin 
@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['title', 'student', 'amount', 'due_date', 'status']
    list_filter = ['status', 'due_date']
    search_fields = ['title', 'student__first_name', 'student__last_name']
    inlines = [PaymentAttemptInline]

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'class_name', 'parent', 'date_of_birth']
    list_filter = ['class_name']
    search_fields = ['first_name', 'last_name', 'parent__username']

admin.site.register(Attendance)