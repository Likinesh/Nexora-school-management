from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Student, Attendance, Invoice, Notification

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'role': self.user.role
        }
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'first_name', 'last_name']
        read_only_fields = ['id']


class StudentSerializer(serializers.ModelSerializer):
    parent_name = serializers.SerializerMethodField(read_only=True)
    parent_email = serializers.EmailField(source='parent.email', read_only=True)

    class Meta:
        model = Student
        fields = ['id', 'first_name', 'last_name', 'parent', 'parent_name', 'parent_email', 'class_name']
        read_only_fields = ['id']

    def get_parent_name(self, obj):
        full_name = f"{obj.parent.first_name} {obj.parent.last_name}".strip()
        return full_name if full_name else obj.parent.username


class AttendanceSerializer(serializers.ModelSerializer):
    student_detail = StudentSerializer(source='student', read_only=True)
    marked_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Attendance
        fields = ['id', 'student', 'student_detail', 'date', 'status', 'marked_by', 'marked_by_name']
        read_only_fields = ['id', 'marked_by']

    def get_marked_by_name(self, obj):
        if not obj.marked_by:
            return "System"
        full_name = f"{obj.marked_by.first_name} {obj.marked_by.last_name}".strip()
        return full_name if full_name else obj.marked_by.username


class InvoiceSerializer(serializers.ModelSerializer):
    student_detail = StudentSerializer(source='student', read_only=True)

    class Meta:
        model = Invoice
        fields = ['id', 'student', 'student_detail', 'title', 'amount', 'due_date', 'status']
        read_only_fields = ['id']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'message', 'created_at', 'is_read']
        read_only_fields = ['id', 'created_at']
