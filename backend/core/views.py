from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.utils.timezone import now
from django.db import transaction

from .models import Student, Attendance, Invoice, Notification
from .serializers import (
    CustomTokenObtainPairSerializer,
    StudentSerializer,
    AttendanceSerializer,
    InvoiceSerializer,
    NotificationSerializer
)
from .permissions import IsTeacherOrAdmin

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class DailyAttendanceListView(generics.ListCreateAPIView):
    serializer_class = AttendanceSerializer
    permission_classes = [IsTeacherOrAdmin]

    def get_queryset(self):
        user = self.request.user
        queryset = Attendance.objects.select_related('student', 'student__parent', 'marked_by')

        if user.role == User.Roles.PARENT:
            return queryset.filter(student__parent=user)

        date_param = self.request.query_params.get('date')
        class_param = self.request.query_params.get('class_name')

        if date_param:
            queryset = queryset.filter(date=date_param)
        if class_param:
            queryset = queryset.filter(student__class_name=class_param)

        return queryset

    def create(self, request, *args, **kwargs):
        student_id = request.data.get('student')
        date_val = request.data.get('date')
        status_val = request.data.get('status')
        
        if not student_id or not date_val or not status_val:
            return Response(
                {"detail": "Missing parameters. 'student', 'date', and 'status' are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        attendance, created = Attendance.objects.update_or_create(
            student_id=student_id,
            date=date_val,
            defaults={'status': status_val, 'marked_by': request.user}
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
        queryset = Invoice.objects.select_related('student', 'student__parent')

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

        if not records or not date_val:
            return Response(
                {"detail": "Missing parameters. 'records' list and 'date' are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

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
                        defaults={'status': status_val, 'marked_by': request.user}
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
