from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from all.views import (
    ObjectViewSet, ApartmentViewSet, UserViewSet, ExpenseTypeViewSet,
    SupplierViewSet, ExpenseViewSet, PaymentViewSet, UserPaymentViewSet,
    DocumentViewSet, SupplierPaymentViewSet, CustomTokenObtainPairView,
    RoomTypeModelViewSet, ReportViewSet,
    TelegramSendMessageView, TelegramSendPhotoView,
)
from rest_framework_simplejwt.views import TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework.permissions import AllowAny

schema_view = get_schema_view(
    openapi.Info(
        title="CRM API",
        default_version='v1',
        description="Travel CRM",
        contact=openapi.Contact(email="soyibnazarovhoji@gmail.com")
    ),
    public=True,
    permission_classes=[AllowAny],
)

router = DefaultRouter()
router.register(r'objects', ObjectViewSet)
router.register(r'apartments', ApartmentViewSet)
router.register(r'users', UserViewSet)
router.register(r'expense-types', ExpenseTypeViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'expenses', ExpenseViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'user-payments', UserPaymentViewSet)
router.register(r'supplier-payments', SupplierPaymentViewSet)
router.register(r'documents', DocumentViewSet)
router.register(r'room-type-models', RoomTypeModelViewSet)
router.register(r'reports', ReportViewSet, basename='report')

api_v1 = [
    path('', include(router.urls)),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair_v1'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh_v1'),
    path('telegram/send-message/', TelegramSendMessageView.as_view(), name='telegram_send_message'),
    path('telegram/send-photo/', TelegramSendPhotoView.as_view(), name='telegram_send_photo'),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('', include(router.urls)),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/v1/', include(api_v1)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)