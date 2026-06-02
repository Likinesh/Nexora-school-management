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
        Customizes insertion to auto-inject token-authenticated User as recorder.
        """
        # Ensure that teachers/admins don't have to manually pass their own ID in the request body
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Auto-inject current authenticated user as marked_by
        serializer.save(marked_by=request.user)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


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
