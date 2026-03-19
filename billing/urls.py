from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet, InvoiceItemViewSet, BillingRecordViewSet, BulkCreateBillingView

router = DefaultRouter()
router.register(r'invoices', InvoiceViewSet)
router.register(r'invoice-items', InvoiceItemViewSet)
router.register(r'records', BillingRecordViewSet, basename='billing-records')

urlpatterns = [
    path('', include(router.urls)),
    path('bulk-create/', BulkCreateBillingView.as_view(), name='billing-bulk-create'),
]
