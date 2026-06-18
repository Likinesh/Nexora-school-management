from django.urls import path
from .views import (
    DailyAttendanceListView,
    InvoiceListView,
    InvoiceCreateView,
    StudentListView,
    NotificationListView,
    MarkNotificationsReadView,
    BulkAttendanceView,
    BulkStudentCreateView,
    ClassroomListCreateView,
    PaymentAttemptCreateView,
    TeacherCreateAPIView,
    ParentCreateAPIView,
    TeacherListView,
    AnnouncementListCreateView,
)

urlpatterns = [
    path('students/', StudentListView.as_view(), name='student_list'),
    path('students/bulk/', BulkStudentCreateView.as_view(), name='student_bulk_create'),
    path('classrooms/', ClassroomListCreateView.as_view(), name='classroom_list'),
    path('attendance/', DailyAttendanceListView.as_view(), name='attendance_list'),
    path('attendance/bulk/', BulkAttendanceView.as_view(), name='attendance_bulk_mark'),
    path('invoices/', InvoiceListView.as_view(), name='invoice_list'),
    path('invoices/create/', InvoiceCreateView.as_view(), name='invoice_create'),
    path('payments/', PaymentAttemptCreateView.as_view(), name='payment_create'),
    path('notifications/', NotificationListView.as_view(), name='notification_list'),
    path('notifications/read-all/', MarkNotificationsReadView.as_view(), name='notifications_mark_read'),
    path('users/create-teacher/', TeacherCreateAPIView.as_view(), name='user_create_teacher'),
    path('users/create-parent/', ParentCreateAPIView.as_view(), name='user_create_parent'),
    path('users/teachers/', TeacherListView.as_view(), name='teacher_list'),
    path('announcements/', AnnouncementListCreateView.as_view(), name='announcement_list_create'),
]
