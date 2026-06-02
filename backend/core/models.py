from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

class User(AbstractUser):
    """
    Custom user model extending Django's AbstractUser to implement role-based access.
    
    Roles supported:
    - ADMIN: Full system administration and data management capabilities.
    - TEACHER: Can view, mark, and modify attendance.
    - PARENT: Can view attendance and invoices for their registered children.
    
    Interview Defense:
    - We index the `role` field since role-based access control (RBAC) and permissions 
      checks are run on almost every API request, reducing query evaluation costs.
    """
    class Roles(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        TEACHER = 'TEACHER', 'Teacher'
        PARENT = 'PARENT', 'Parent'

    role = models.CharField(
        max_length=10,
        choices=Roles.choices,
        default=Roles.PARENT,
        db_index=True
    )

    def __str__(self):
        return f"{self.username} ({self.role})"


class Student(models.Model):
    """
    Student model containing student details and referencing a PARENT User.
    
    Interview Defense:
    - We use `limit_choices_to` on the parent field to restrict selection to Parents in the Django Admin.
    - We write custom clean() validation to strictly enforce at the application layer that the parent 
      user profile actually belongs to a Parent user.
    - We add a database-index on `class_name` because filtering by class is highly standard for daily class lists.
    """
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    parent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='children',
        limit_choices_to={'role': User.Roles.PARENT}
    )
    class_name = models.CharField(max_length=50, db_index=True)

    def clean(self):
        super().clean()
        # Application-layer integrity: enforce that the selected parent has the PARENT role.
        if self.parent and self.parent.role != User.Roles.PARENT:
            raise ValidationError({'parent': "Only users with PARENT role can be assigned as parents."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.class_name})"


class Attendance(models.Model):
    """
    Attendance records mapping students to dates and marking states (PRESENT/ABSENT).
    
    Interview Defense:
    - UniqueConstraint is defined on (student, date) to prevent duplicate daily tracking records 
      for a student, guaranteeing consistency at the database level.
    - Index on `date` is critical since queries for active classroom lists or history will 
      frequently filter and sort by date, accelerating API latency.
    """
    class Statuses(models.TextChoices):
        PRESENT = 'PRESENT', 'Present'
        ABSENT = 'ABSENT', 'Absent'

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='attendances'
    )
    date = models.DateField(db_index=True)
    status = models.CharField(
        max_length=10,
        choices=Statuses.choices
    )
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='marked_attendances'
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'date'],
                name='unique_student_attendance_per_day'
            )
        ]
        ordering = ['-date', 'student__last_name', 'student__first_name']

    def __str__(self):
        return f"{self.student} - {self.date}: {self.status}"


class Invoice(models.Model):
    """
    Invoice model representing school fees associated with a particular student.
    
    Statuses:
    - PAID: Fully settled.
    - PENDING: Awaiting payment.
    - OVERDUE: Outstanding payment beyond due date.
    
    Interview Defense:
    - High-frequency lookups by invoice status and due_date justify indexing, which accelerates 
      reports compiling aggregate balances or collecting outstanding items.
    """
    class Statuses(models.TextChoices):
        PAID = 'PAID', 'Paid'
        PENDING = 'PENDING', 'Pending'
        OVERDUE = 'OVERDUE', 'Overdue'

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField(db_index=True)
    status = models.CharField(
        max_length=15,
        choices=Statuses.choices,
        default=Statuses.PENDING,
        db_index=True
    )

    class Meta:
        ordering = ['due_date', 'student__last_name']

    def __str__(self):
        return f"{self.title} - {self.student}: {self.amount} ({self.status})"
