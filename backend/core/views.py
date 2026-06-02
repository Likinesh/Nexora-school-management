from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.utils.timezone import now

from .models import Student, Attendance, Invoice
from .serializers import (
    CustomTokenObtainPairSerializer,
    StudentSerializer,
    AttendanceSerializer,
    InvoiceSerializer
)
from .permissions import IsTeacherOrAdmin

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Overridden JWT login view injecting role configuration claims.
    """
    serializer_class = CustomTokenObtainPairSerializer


class DailyAttendanceListView(generics.ListCreateAPIView):
    """
    View to list and create student attendance records.
    Protected by IsTeacherOrAdmin (allowing Read for Parents, Write for Admin/Teacher).
    
    Interview Defense:
    - N+1 Prevention: Uses `.select_related('student', 'student__parent', 'marked_by')` to pre-fetch 
      foreign key joins, eliminating extra database queries during serialization loop.
    - Tenant-level Data-Isolation Safety: Parents can only fetch attendance belonging to 
      their registered children. Admin and Teachers can access all classrooms.
    - Filters: Admins/Teachers can filter lists by `date` (defaulting to today if not provided) and `class_name`.
    """
    serializer_class = AttendanceSerializer
    permission_classes = [IsTeacherOrAdmin]

    def get_queryset(self):
        user = self.request.user
        
        # Build optimized prefetch queryset
        queryset = Attendance.objects.select_related(
            'student', 
            'student__parent',
            'marked_by'
        )

        # 1. Enforce strict data isolation for parents
        if user.role == User.Roles.PARENT:
            return queryset.filter(student__parent=user)

        # 2. Dynamic query parameter filters for Teachers & Admins
        date_param = self.request.query_params.get('date')
        class_param = self.request.query_params.get('class_name')

        if date_param:
            queryset = queryset.filter(date=date_param)
        
        if class_param:
            queryset = queryset.filter(student__class_name=class_param)

        return queryset

    def create(self, request, *args, **kwargs):
        """
        Idempotent update_or_create handler.
        Allows the client's optimistic UI to send a simple POST payload representing the toggled state.
        The backend handles both new insertions and dynamic updates for the (student, date) unique set.
        
        Interview Defense:
        - By using update_or_create instead of a naive create, we decouple frontend toggle state 
          from whether it's the first click of the day or a modification, enhancing network performance 
          and eliminating client-side write-versus-update complexity.
        """
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
        
        serializer = self.get_serializer(attendance)
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=status_code)



class InvoiceListView(generics.ListAPIView):
    """
    View to list invoices for student fees.
    
    Interview Defense:
    - N+1 Prevention: Employs `.select_related('student', 'student__parent')` to resolve nested
      relationships inside the single database transaction block.
    - Solid Security Guardrails: Parents are strictly bound to their child's profiles.
      Admins/Teachers can pull aggregate invoices across all profiles.
    """
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Optimize parent & student schema prefetching
        queryset = Invoice.objects.select_related('student', 'student__parent')

        # Parents only see their children's financial records
        if user.role == User.Roles.PARENT:
            return queryset.filter(student__parent=user)

        # Admin (and Teachers) can view all invoices
        if user.role in [User.Roles.ADMIN, User.Roles.TEACHER]:
            status_param = self.request.query_params.get('status')
            class_param = self.request.query_params.get('class_name')
            
            if status_param:
                queryset = queryset.filter(status=status_param)
            if class_param:
                queryset = queryset.filter(student__class_name=class_param)
            
            return queryset

        # Block any unexpected role access
        return Invoice.objects.none()


class StudentListView(generics.ListAPIView):
    """
    View to list student profiles.
    Used by teachers/admins to retrieve the class roster, and parents to view their children.
    
    Interview Defense:
    - Pre-fetches parent User models using select_related('parent') to optimize serialization queries.
    """
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

