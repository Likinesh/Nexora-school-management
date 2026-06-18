from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Student, Attendance, Invoice, Notification, Classroom, PaymentAttempt, Announcement

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
        fields = ['id', 'username', 'email', 'role', 'first_name', 'last_name', 'date_of_birth']
        read_only_fields = ['id']


class StudentSerializer(serializers.ModelSerializer):
    parent_name = serializers.SerializerMethodField(read_only=True)
    parent_email = serializers.EmailField(source='parent.email', read_only=True)

    class Meta:
        model = Student
        fields = ['id', 'first_name', 'last_name', 'parent', 'parent_name', 'parent_email', 'class_name', 'date_of_birth']
        read_only_fields = ['id']

    def get_parent_name(self, obj):
        full_name = f"{obj.parent.first_name} {obj.parent.last_name}".strip()
        return full_name if full_name else obj.parent.username


class ClassroomSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Classroom
        fields = ['id', 'name', 'teacher', 'teacher_name', 'class_name']
        read_only_fields = ['id']

    def get_teacher_name(self, obj):
        if not obj.teacher:
            return "Unassigned"
        full_name = f"{obj.teacher.first_name} {obj.teacher.last_name}".strip()
        return full_name if full_name else obj.teacher.username


class AttendanceSerializer(serializers.ModelSerializer):
    student_detail = StudentSerializer(source='student', read_only=True)
    marked_by_name = serializers.SerializerMethodField(read_only=True)
    classroom_name = serializers.CharField(source='classroom.name', read_only=True, default=None)

    class Meta:
        model = Attendance
        fields = [
            'id', 'student', 'student_detail', 'classroom', 'classroom_name',
            'date', 'status', 'marked_by', 'marked_by_name'
        ]
        read_only_fields = ['id', 'marked_by']

    def get_marked_by_name(self, obj):
        if not obj.marked_by:
            return "System"
        full_name = f"{obj.marked_by.first_name} {obj.marked_by.last_name}".strip()
        return full_name if full_name else obj.marked_by.username


class PaymentAttemptSerializer(serializers.ModelSerializer):
    invoice_title = serializers.CharField(source='invoice.title', read_only=True)
    invoice_amount = serializers.DecimalField(
        source='invoice.amount', max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = PaymentAttempt
        fields = [
            'id', 'invoice', 'invoice_title', 'invoice_amount',
            'amount_paid', 'transaction_date', 'status', 'notes'
        ]
        read_only_fields = ['id', 'transaction_date', 'status']


class InvoiceSerializer(serializers.ModelSerializer):
    student_detail = StudentSerializer(source='student', read_only=True)
    payment_attempts = PaymentAttemptSerializer(many=True, read_only=True)
    amount_settled = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'student', 'student_detail', 'title', 'amount',
            'due_date', 'status', 'payment_attempts', 'amount_settled'
        ]
        read_only_fields = ['id', 'status']

    def get_amount_settled(self, obj):
        successful = obj.payment_attempts.filter(status=PaymentAttempt.Statuses.SUCCESS)
        return sum(p.amount_paid for p in successful)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'message', 'created_at', 'is_read']
        read_only_fields = ['id', 'created_at']


class AnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField(read_only=True)
    classroom_name = serializers.CharField(source='classroom.name', read_only=True, default="School-wide")
    classroom_class_name = serializers.CharField(source='classroom.class_name', read_only=True, default=None)

    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'content', 'classroom', 'classroom_name',
            'classroom_class_name', 'author', 'author_name', 'created_at'
        ]
        read_only_fields = ['id', 'author', 'created_at']

    def get_author_name(self, obj):
        full_name = f"{obj.author.first_name} {obj.author.last_name}".strip()
        return full_name if full_name else obj.author.username
