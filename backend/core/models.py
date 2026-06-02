from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

class User(AbstractUser):
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
        if self.parent and self.parent.role != User.Roles.PARENT:
            raise ValidationError({'parent': "Only users with PARENT role can be assigned."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.class_name})"


class Attendance(models.Model):
    class Statuses(models.TextChoices):
        PRESENT = 'PRESENT', 'Present'
        ABSENT = 'ABSENT', 'Absent'

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='attendances'
    )
    date = models.DateField(db_index=True)
    status = models.CharField(max_length=10, choices=Statuses.choices)
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


class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_index=True
    )
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    is_read = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Alert for {self.user.username}: {self.message[:40]}"
