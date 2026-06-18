from rest_framework import generics, permissions, status, exceptions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.db import transaction

from .models import Student, Attendance, Invoice, Notification, Classroom, PaymentAttempt, Announcement
from .serializers import (
    CustomTokenObtainPairSerializer,
    StudentSerializer,
    AttendanceSerializer,
    InvoiceSerializer,
    NotificationSerializer,
    ClassroomSerializer,
    PaymentAttemptSerializer,
    UserSerializer,
    AnnouncementSerializer,
)
from .permissions import IsTeacherOrAdmin, IsAdmin

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class ClassroomListCreateView(generics.ListCreateAPIView):
    serializer_class = ClassroomSerializer
    queryset = Classroom.objects.select_related('teacher').all()

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

class DailyAttendanceListView(generics.ListCreateAPIView):
    serializer_class = AttendanceSerializer
    permission_classes = [IsTeacherOrAdmin]

    def get_queryset(self):
        user = self.request.user
        queryset = Attendance.objects.select_related(
            'student', 'student__parent', 'marked_by', 'classroom'
        )

        if user.role == User.Roles.PARENT:
            queryset = queryset.filter(student__parent=user)
            date_param = self.request.query_params.get('date')
            if date_param:
                queryset = queryset.filter(date=date_param)
            return queryset

        date_param = self.request.query_params.get('date')
        class_param = self.request.query_params.get('class_name')
        classroom_param = self.request.query_params.get('classroom')

        if date_param:
            queryset = queryset.filter(date=date_param)
        if class_param:
            queryset = queryset.filter(student__class_name=class_param)
        if classroom_param:
            queryset = queryset.filter(classroom_id=classroom_param)

        return queryset

    def create(self, request, *args, **kwargs):
        student_id = request.data.get('student')
        date_val = request.data.get('date')
        status_val = request.data.get('status')
        classroom_id = request.data.get('classroom')

        if not student_id or not date_val or not status_val:
            return Response(
                {"detail": "Missing parameters. 'student', 'date', and 'status' are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if classroom_id and request.user.role == User.Roles.TEACHER:
            try:
                classroom = Classroom.objects.get(id=classroom_id)
                if classroom.teacher_id != request.user.id:
                    return Response(
                        {"detail": "You are not the assigned teacher for this classroom."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Classroom.DoesNotExist:
                return Response({"detail": "Classroom not found."}, status=status.HTTP_404_NOT_FOUND)

        attendance, created = Attendance.objects.update_or_create(
            student_id=student_id,
            date=date_val,
            defaults={
                'status': status_val,
                'marked_by': request.user,
                'classroom_id': classroom_id or None
            }
        )

        try:
            parent_user = attendance.student.parent
            if status_val == 'ABSENT':
                Notification.objects.create(
                    user=parent_user,
                    message=f"Alert: {attendance.student.first_name} was marked ABSENT today ({date_val}) by Teacher {request.user.username}."
                )
            elif status_val == 'PRESENT' and not created:
                Notification.objects.create(
                    user=parent_user,
                    message=f"Update: {attendance.student.first_name} is now marked PRESENT today ({date_val})."
                )
        except Exception as e:
            print(f"Deferred notification dispatch error: {e}")

        serializer = self.get_serializer(attendance)
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=status_code)

class InvoiceListView(generics.ListAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Invoice.objects.select_related(
            'student', 'student__parent'
        ).prefetch_related('payment_attempts')

        if user.role == User.Roles.PARENT:
            return queryset.filter(student__parent=user)

        if user.role in [User.Roles.ADMIN, User.Roles.TEACHER]:
            status_param = self.request.query_params.get('status')
            class_param = self.request.query_params.get('class_name')

            if status_param:
                queryset = queryset.filter(status=status_param)
            if class_param:
                queryset = queryset.filter(student__class_name=class_param)

            return queryset

        return Invoice.objects.none()

class InvoiceCreateView(generics.CreateAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        serializer.save(status=Invoice.Statuses.PENDING)

class PaymentAttemptCreateView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, *args, **kwargs):
        invoice_id = request.data.get('invoice')
        amount_paid = request.data.get('amount_paid')
        notes = request.data.get('notes', '')

        if not invoice_id or not amount_paid:
            return Response(
                {"detail": "'invoice' and 'amount_paid' are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                invoice = Invoice.objects.select_for_update().get(id=invoice_id)

                attempt = PaymentAttempt.objects.create(
                    invoice=invoice,
                    amount_paid=amount_paid,
                    status=PaymentAttempt.Statuses.SUCCESS,
                    notes=notes
                )

                total_paid = sum(
                    p.amount_paid
                    for p in PaymentAttempt.objects.filter(
                        invoice=invoice,
                        status=PaymentAttempt.Statuses.SUCCESS
                    )
                )

                if total_paid >= invoice.amount:
                    invoice.status = Invoice.Statuses.PAID
                elif total_paid > 0:
                    invoice.status = Invoice.Statuses.PARTIAL
                invoice.save(update_fields=['status'])

                try:
                    Notification.objects.create(
                        user=invoice.student.parent,
                        message=(
                            f"Payment of ${amount_paid} received for '{invoice.title}'. "
                            f"Invoice is now {invoice.status}."
                        )
                    )
                except Exception as e:
                    print(f"Payment notification error: {e}")

            serializer = PaymentAttemptSerializer(attempt)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Invoice.DoesNotExist:
            return Response({"detail": "Invoice not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response(
                {"detail": f"Payment processing failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class StudentListView(generics.ListAPIView):
    serializer_class = StudentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Student.objects.select_related('parent')

        if user.role == User.Roles.PARENT:
            return queryset.filter(parent=user)

        class_param = self.request.query_params.get('class_name')
        if class_param:
            queryset = queryset.filter(class_name=class_param)

        return queryset

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).select_related('user')

class MarkNotificationsReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"detail": "All notifications marked as read."}, status=status.HTTP_200_OK)

class BulkAttendanceView(APIView):
    permission_classes = [IsTeacherOrAdmin]

    def post(self, request, *args, **kwargs):
        records = request.data.get('records', [])
        date_val = request.data.get('date')
        classroom_id = request.data.get('classroom')

        if not records or not date_val:
            return Response(
                {"detail": "Missing parameters. 'records' list and 'date' are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if classroom_id and request.user.role == User.Roles.TEACHER:
            try:
                classroom = Classroom.objects.get(id=classroom_id)
                if classroom.teacher_id != request.user.id:
                    return Response(
                        {"detail": "You are not the assigned teacher for this classroom."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Classroom.DoesNotExist:
                return Response({"detail": "Classroom not found."}, status=status.HTTP_404_NOT_FOUND)

        updated_records = []
        notifications_to_create = []

        try:
            with transaction.atomic():
                for item in records:
                    student_id = item.get('student')
                    status_val = item.get('status')

                    if not student_id or not status_val:
                        continue

                    attendance, created = Attendance.objects.update_or_create(
                        student_id=student_id,
                        date=date_val,
                        defaults={
                            'status': status_val,
                            'marked_by': request.user,
                            'classroom_id': classroom_id or None
                        }
                    )
                    updated_records.append(attendance)

                    if status_val == 'ABSENT':
                        notifications_to_create.append(
                            Notification(
                                user=attendance.student.parent,
                                message=f"Alert: {attendance.student.first_name} was marked ABSENT today ({date_val})."
                            )
                        )

                if notifications_to_create:
                    Notification.objects.bulk_create(notifications_to_create)

            serializer = AttendanceSerializer(updated_records, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"detail": f"Bulk transaction failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BulkStudentCreateView(APIView):
    permission_classes = [IsTeacherOrAdmin]

    def post(self, request, *args, **kwargs):
        students_data = request.data.get('students', [])
        if not students_data:
            return Response({"detail": "No student records provided."}, status=status.HTTP_400_BAD_REQUEST)

        students_to_create = []
        errors = []

        try:
            with transaction.atomic():
                for idx, data in enumerate(students_data):
                    first_name = data.get('first_name')
                    last_name = data.get('last_name')
                    parent_username = data.get('parent_username')
                    class_name = data.get('class_name')

                    if not first_name or not last_name or not parent_username or not class_name:
                        errors.append(f"Row {idx}: Missing student demographics.")
                        continue

                    try:
                        parent_user = User.objects.get(username=parent_username, role=User.Roles.PARENT)
                    except User.DoesNotExist:
                        parent_user = User.objects.create_user(
                            username=parent_username,
                            email=f"{parent_username}@example.com",
                            password="parentpassword",
                            role=User.Roles.PARENT,
                            first_name=parent_username.capitalize(),
                            last_name="Parent"
                        )

                    students_to_create.append(
                        Student(
                            first_name=first_name,
                            last_name=last_name,
                            parent=parent_user,
                            class_name=class_name
                        )
                    )

                if students_to_create:
                    Student.objects.bulk_create(students_to_create)

            return Response({
                "detail": f"Successfully imported {len(students_to_create)} student records.",
                "errors": errors
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"detail": f"Bulk import failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TeacherCreateAPIView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        email = request.data.get('email')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        date_of_birth = request.data.get('date_of_birth')

        if not all([username, email, first_name, last_name, date_of_birth]):
            return Response(
                {"detail": "All fields (username, email, first_name, last_name, date_of_birth) are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username=username).exists():
            return Response({"detail": "A user with that username already exists."}, status=status.HTTP_400_BAD_REQUEST)

        dob_str = str(date_of_birth).strip()
        first_clean = str(first_name).strip().lower()
        raw_password = f"{first_clean}@{dob_str}"

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    date_of_birth=date_of_birth,
                    role=User.Roles.TEACHER
                )
                user.set_password(raw_password)
                user.save()

            return Response({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "date_of_birth": str(user.date_of_birth),
                "role": user.role,
                "raw_password": raw_password
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": f"Failed to create teacher: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ParentCreateAPIView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        email = request.data.get('email')
        first_name = request.data.get('first_name') or ''
        last_name = request.data.get('last_name') or ''
        
        student_first_name = request.data.get('student_first_name')
        student_last_name = request.data.get('student_last_name')
        student_date_of_birth = request.data.get('student_date_of_birth')
        class_name = request.data.get('class_name')

        if not all([username, email, student_first_name, student_last_name, student_date_of_birth, class_name]):
            return Response(
                {"detail": "Parent username/email and all student details are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username=username).exists():
            return Response({"detail": "A user with that username already exists."}, status=status.HTTP_400_BAD_REQUEST)

        dob_str = str(student_date_of_birth).strip()
        first_clean = str(student_first_name).strip().lower()
        raw_password = f"{first_clean}@{dob_str}"

        try:
            with transaction.atomic():
                parent = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=first_name or student_first_name,
                    last_name=last_name or student_last_name,
                    role=User.Roles.PARENT
                )
                parent.set_password(raw_password)
                parent.save()

                student = Student.objects.create(
                    first_name=student_first_name,
                    last_name=student_last_name,
                    parent=parent,
                    class_name=class_name,
                    date_of_birth=student_date_of_birth
                )

            return Response({
                "parent": {
                    "id": parent.id,
                    "username": parent.username,
                    "email": parent.email,
                    "role": parent.role
                },
                "student": {
                    "id": student.id,
                    "first_name": student.first_name,
                    "last_name": student.last_name,
                    "class_name": student.class_name,
                    "date_of_birth": str(student.date_of_birth)
                },
                "raw_password": raw_password
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": f"Failed to create parent/student: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TeacherListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return User.objects.filter(role=User.Roles.TEACHER)


class AnnouncementListCreateView(generics.ListCreateAPIView):
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsTeacherOrAdmin()]

    def get_queryset(self):
        user = self.request.user
        queryset = Announcement.objects.select_related('classroom', 'author').all()

        if user.role == User.Roles.PARENT:
            class_names = Student.objects.filter(parent=user).values_list('class_name', flat=True)
            from django.db.models import Q
            return queryset.filter(Q(classroom__isnull=True) | Q(classroom__class_name__in=class_names))

        elif user.role == User.Roles.TEACHER:
            from django.db.models import Q
            return queryset.filter(Q(classroom__isnull=True) | Q(classroom__teacher=user))

        return queryset

    def perform_create(self, serializer):
        classroom_id = self.request.data.get('classroom')
        if classroom_id and self.request.user.role == User.Roles.TEACHER:
            try:
                classroom = Classroom.objects.get(id=classroom_id)
                if classroom.teacher_id != self.request.user.id:
                    raise exceptions.PermissionDenied("You are not the assigned teacher for this classroom.")
            except Classroom.DoesNotExist:
                raise exceptions.ValidationError({"classroom": "Classroom not found."})

        serializer.save(author=self.request.user)
