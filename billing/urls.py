"""URL routes for billing module.

Provides invoice endpoints and monthly billing record operations,
including bulk import for accounting cycles.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InvoiceViewSet, InvoiceItemViewSet, BillingRecordViewSet,
    BulkCreateBillingView, BillingReportExportView, BillingReportDataView,
)

router = DefaultRouter()
router.register(r'invoices', InvoiceViewSet)
router.register(r'invoice-items', InvoiceItemViewSet)
router.register(r'records', BillingRecordViewSet, basename='billing-records')

urlpatterns = [
    path('', include(router.urls)),
    path('bulk-create/', BulkCreateBillingView.as_view(), name='billing-bulk-create'),
    # Report endpoints — source: active ClientService records (independent of BillingRecord)
    path('report/export/', BillingReportExportView.as_view(), name='billing-report-export'),
    path('report/data/',   BillingReportDataView.as_view(),   name='billing-report-data'),
]
