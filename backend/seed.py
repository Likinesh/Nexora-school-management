import os
import django
import json

# Setup django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import Student, Attendance, Invoice
from core.serializers import CustomTokenObtainPairSerializer
from datetime import date, timedelta
from rest_framework_simplejwt.tokens import RefreshToken


User = get_user_model()

def seed_data():
    print("--- Starting Database Seeding ---")
    
    # 1. Clean existing database to ensure test reliability
    User.objects.all().delete()
    Student.objects.all().delete()
    Attendance.objects.all().delete()
    Invoice.objects.all().delete()
    print("Cleared existing records.")

    # 2. Create users with explicit roles
    admin = User.objects.create_superuser(
        username='admin',
        email='admin@edutinker.com',
        password='adminpassword',
        role=User.Roles.ADMIN,
        first_name='System',
        last_name='Admin'
    )
    print("Created Admin user: admin")

    teacher = User.objects.create_user(
        username='teacher',
        email='teacher@edutinker.com',
        password='teacherpassword',
        role=User.Roles.TEACHER,
        first_name='Jane',
        last_name='Doe'
    )
    print("Created Teacher user: teacher")

    parent = User.objects.create_user(
        username='parent',
        email='parent@edutinker.com',
        password='parentpassword',
        role=User.Roles.PARENT,
        first_name='John',
        last_name='Smith'
    )
    print("Created Parent user: parent")

    # 3. Create Students and bind them to the parent
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
    print(f"Created Students: {student1}, {student2} and linked to parentJohn Smith.")

    # 4. Create initial Attendance records
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
    print("Created initial daily attendance records marked by Teacher.")

    # 5. Create school fee Invoices
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
    print("Created initial fee invoices (Pending, Overdue, Paid).")

    print("\n--- Seeding Completed Successfully! ---")
    
    # 6. Verification check: Simulate Token generation and display custom claims
    print("\n--- Verifying Custom JWT Token Claims ---")
    for u in [admin, teacher, parent]:
        # Using our CustomTokenObtainPairSerializer to verify custom claims are properly injected
        token = CustomTokenObtainPairSerializer.get_token(u)
        
        # Access token payloads are readable as a dictionary
        payload = token.payload
        print(f"\nUser: {u.username} (Role: {u.role})")
        print(f"Token Payload Claims (to be parsed by React):")
        print(json.dumps({
            "user_id": payload.get("user_id"),
            "username": payload.get("username"),
            "email": payload.get("email"),
            "role": payload.get("role"),
            "exp": payload.get("exp")
        }, indent=2))


if __name__ == '__main__':
    seed_data()
