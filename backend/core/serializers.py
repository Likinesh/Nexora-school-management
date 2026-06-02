from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Student, Attendance, Invoice

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Subclasses SimpleJWT's TokenObtainPairSerializer to inject role metadata.
    
    Interview Defense:
    - We customize JWT claims. By embedding user info (id, username, email, role) 
      into the access token, the React client can decode the token (via jwt-decode) 
      and instantly mount user sessions without executing an expensive GET request 
      to a /profile/ endpoint, reducing total login latency.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Inject user attributes into the initial HTTP response body for direct access
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'role': self.user.role
        }
        return data


class UserSerializer(serializers.ModelSerializer):
    """
    Simple serialization model for User profiles.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'first_name', 'last_name']
        read_only_fields = ['id']


class StudentSerializer(serializers.ModelSerializer):
    """
    Serializer for the Student database records.
    
    Interview Defense:
    - Includes computed read-only properties for parent profiles to eliminate 
      the frontend needing to query user endpoints separately.
    """
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
    """
    Serializer for Attendance model records.
    
    Interview Defense:
    - Design Pattern: Shallow Write, Deep Read.
    - We take a standard `student` ID for write (POST/PUT) paths to avoid the 
      complex, error-prone parsing of nested dictionary writes.
    - We dynamically map to `student_detail` (using StudentSerializer) on read 
      (GET) paths, returning hydrated details so the client has immediate access.
    """
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
    """
    Serializer for Invoice details.
    
    Interview Defense:
    - Employs Shallow Write, Deep Read structure similar to the Attendance serializer.
    - Serves student demographic details within nested data streams so fee ledgers 
      can render student identification parameters seamlessly without separate requests.
    """
    student_detail = StudentSerializer(source='student', read_only=True)

    class Meta:
        model = Invoice
        fields = ['id', 'student', 'student_detail', 'title', 'amount', 'due_date', 'status']
        read_only_fields = ['id']
