"""URL routes for billing module.

Provides invoice endpoints and monthly billing record operations,
including bulk import for accounting cycles.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet, InvoiceItemViewSet, BillingRecordViewSet, BulkCreateBillingView

router = DefaultRouter()
router.register(r'invoices', InvoiceViewSet)
router.register(r'invoice-items', InvoiceItemViewSet)
router.register(r'records', BillingRecordViewSet, basename='billing-records')

urlpatterns = [
    # Invoices and billing records API
    path('', include(router.urls)),

    # Bulk billing import
    path('bulk-create/', BulkCreateBillingView.as_view(), name='billing-bulk-create'),
]
