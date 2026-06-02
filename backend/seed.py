import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import Student, Attendance, Invoice
from core.serializers import CustomTokenObtainPairSerializer
from datetime import date, timedelta
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

def seed_data():
    User.objects.all().delete()
    Student.objects.all().delete()
    Attendance.objects.all().delete()
    Invoice.objects.all().delete()

    admin = User.objects.create_superuser(
        username='admin',
        email='admin@edutinker.com',
        password='adminpassword',
        role=User.Roles.ADMIN,
        first_name='System',
        last_name='Admin'
    )

    teacher = User.objects.create_user(
        username='teacher',
        email='teacher@edutinker.com',
        password='teacherpassword',
        role=User.Roles.TEACHER,
        first_name='Jane',
        last_name='Doe'
    )

    parent = User.objects.create_user(
        username='parent',
        email='parent@edutinker.com',
        password='parentpassword',
        role=User.Roles.PARENT,
        first_name='John',
        last_name='Smith'
    )

    student1 = Student.objects.create(
        first_name='Jimmy',
        last_name='Smith',
        parent=parent,
        class_name='Grade 5-A'
    )
    student2 = Student.objects.create(
        first_name='Sarah',
        last_name='Smith',
        parent=parent,
        class_name='Grade 3-B'
    )

    Attendance.objects.create(
        student=student1,
        date=date.today(),
        status=Attendance.Statuses.PRESENT,
        marked_by=teacher
    )
    Attendance.objects.create(
        student=student2,
        date=date.today(),
        status=Attendance.Statuses.ABSENT,
        marked_by=teacher
    )

    Invoice.objects.create(
        student=student1,
        title='Tution Fee - Q2',
        amount=1250.00,
        due_date=date.today() + timedelta(days=15),
        status=Invoice.Statuses.PENDING
    )
    Invoice.objects.create(
        student=student2,
        title='Bus Transport Fee - Q2',
        amount=350.00,
        due_date=date.today() - timedelta(days=5),
        status=Invoice.Statuses.OVERDUE
    )
    Invoice.objects.create(
        student=student1,
        title='Activity Club Fee - Q1',
        amount=150.00,
        due_date=date.today() - timedelta(days=30),
        status=Invoice.Statuses.PAID
    )

    for u in [admin, teacher, parent]:
        token = CustomTokenObtainPairSerializer.get_token(u)
        payload = token.payload

if __name__ == '__main__':
    seed_data()
