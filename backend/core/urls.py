from django.urls import path
from .views import DailyAttendanceListView, InvoiceListView

urlpatterns = [
    # Attendance Route
    # GET: Retrieves daily list (Teacher/Admin reads all; Parent reads child profiles only)
    # POST: Marks attendance (restricted strictly to ADMIN/TEACHER roles)
    path('attendance/', DailyAttendanceListView.as_view(), name='attendance_list'),
    
    # Invoices/Fee Ledger Route
    # GET: Retrieves invoice logs (Admin reads all; Parent reads child invoices only)
    path('invoices/', InvoiceListView.as_view(), name='invoice_list'),
]
