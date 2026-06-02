from django.urls import path
from .views import (
    DailyAttendanceListView,
    InvoiceListView,
    StudentListView,
    NotificationListView,
    MarkNotificationsReadView,
    BulkAttendanceView,
    BulkStudentCreateView
)

urlpatterns = [
    path('students/', StudentListView.as_view(), name='student_list'),
    path('students/bulk/', BulkStudentCreateView.as_view(), name='student_bulk_create'),
    path('attendance/', DailyAttendanceListView.as_view(), name='attendance_list'),
    path('attendance/bulk/', BulkAttendanceView.as_view(), name='attendance_bulk_mark'),
    path('invoices/', InvoiceListView.as_view(), name='invoice_list'),
    path('notifications/', NotificationListView.as_view(), name='notification_list'),
    path('notifications/read-all/', MarkNotificationsReadView.as_view(), name='notifications_mark_read'),
]
