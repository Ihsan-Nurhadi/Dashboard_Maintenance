from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from core import views as core_views
from installations.views import InstallationViewSet
from pics.views import PicViewSet
from sites.views import CctvAccountViewSet, SiteStatusLogViewSet, SiteViewSet
from troubleshoots.views import TroubleshootViewSet

router = DefaultRouter(trailing_slash=True)
router.register("sites", SiteViewSet, basename="site")
router.register("status-logs", SiteStatusLogViewSet, basename="status-log")
router.register("cctv", CctvAccountViewSet, basename="cctv")
router.register("troubleshoots", TroubleshootViewSet, basename="troubleshoot")
router.register("installations", InstallationViewSet, basename="installation")
router.register("pics", PicViewSet, basename="pic")

api_patterns = [
    path("auth/login/", core_views.LoginView.as_view()),
    path("auth/logout/", core_views.LogoutView.as_view()),
    path("auth/me/", core_views.MeView.as_view()),
    path("auth/change-password/", core_views.ChangePasswordView.as_view()),
    path("dashboard/summary/", core_views.DashboardSummaryView.as_view()),
    path("meta/", core_views.MetaView.as_view()),
    path("export/troubleshoots.xlsx", core_views.ExportTroubleshootsView.as_view()),
    path("export/sites.xlsx", core_views.ExportSitesView.as_view()),
    path("", include(router.urls)),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api_patterns)),
]

