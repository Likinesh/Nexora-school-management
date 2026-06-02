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
    date_of_birth = models.DateField(null=True, blank=True)

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
    date_of_birth = models.DateField(null=True, blank=True)

    def clean(self):
        super().clean()
        if self.parent and self.parent.role != User.Roles.PARENT:
            raise ValidationError({'parent': "Only users with PARENT role can be assigned."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.class_name})"


class Classroom(models.Model):
    name = models.CharField(max_length=100, unique=True)
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='classrooms',
        limit_choices_to={'role': User.Roles.TEACHER}
    )
    class_name = models.CharField(max_length=50, db_index=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        teacher_name = self.teacher.username if self.teacher else "Unassigned"
        return f"{self.name} — {self.class_name} ({teacher_name})"


class Attendance(models.Model):
    class Statuses(models.TextChoices):
        PRESENT = 'PRESENT', 'Present'
        ABSENT = 'ABSENT', 'Absent'

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='attendances'
    )
    classroom = models.ForeignKey(
        Classroom,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attendance_records'
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
        PARTIAL = 'PARTIAL', 'Partial'
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


class PaymentAttempt(models.Model):
    class Statuses(models.TextChoices):
        SUCCESS = 'SUCCESS', 'Success'
        FAILED = 'FAILED', 'Failed'
        PENDING = 'PENDING', 'Pending'

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='payment_attempts'
    )
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_date = models.DateTimeField(auto_now_add=True, db_index=True)
    status = models.CharField(
        max_length=10,
        choices=Statuses.choices,
        default=Statuses.PENDING
    )
    notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-transaction_date']

    def __str__(self):
        return f"Payment {self.amount_paid} on Invoice #{self.invoice_id} [{self.status}]"


class TeacherUser(User):
    class Meta:
        proxy = True
        verbose_name = 'Teacher'
        verbose_name_plural = 'Teachers'


class ParentUser(User):
    class Meta:
        proxy = True
        verbose_name = 'Parent'
        verbose_name_plural = 'Parents'


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
