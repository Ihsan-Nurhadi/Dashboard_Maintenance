from io import BytesIO

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.core.cache import cache
from django.http import HttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from openpyxl import Workbook
from openpyxl.styles import Font
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from sites.models import Site
from sites.queries import annotate_sites, filter_sites
from troubleshoots.models import Troubleshoot
from troubleshoots.queries import filter_troubleshoots

from .constants import (
    DEVICE_CHOICES,
    ONGOING_STATUSES,
    RESPONSE_CHOICES,
    SITE_STATUS_CHOICES,
    TS_STATUS_CHOICES,
    VPN_STATUS_CHOICES,
    choices_to_list,
)


def _client_ip(request):
    fwd = request.META.get("HTTP_X_FORWARDED_FOR")
    return (fwd.split(",")[0] if fwd else request.META.get("REMOTE_ADDR", "")).strip()


@method_decorator(ensure_csrf_cookie, name="dispatch")
class MeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            return Response({"authenticated": True, "username": request.user.get_username()})
        return Response({"authenticated": False, "username": None})


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        key = f"login-fail:{_client_ip(request)}"
        fails = cache.get(key, 0)
        if fails >= settings.LOGIN_MAX_ATTEMPTS:
            return Response(
                {"detail": "Terlalu banyak percobaan login. Coba lagi dalam 15 menit."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        username = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""
        user = authenticate(request, username=username, password=password)
        if user is None or not user.is_active:
            cache.set(key, fails + 1, settings.LOGIN_LOCK_SECONDS)
            return Response(
                {"detail": "Username atau password salah."}, status=status.HTTP_400_BAD_REQUEST
            )
        cache.delete(key)
        login(request, user)
        return Response({"authenticated": True, "username": user.get_username()})


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({"authenticated": False})


class MetaView(APIView):
    """Daftar pilihan (choices) untuk dropdown di frontend."""

    def get(self, request):
        return Response(
            {
                "devices": choices_to_list(DEVICE_CHOICES),
                "vpn_statuses": choices_to_list(VPN_STATUS_CHOICES),
                "responses": choices_to_list(RESPONSE_CHOICES),
                "site_statuses": choices_to_list(SITE_STATUS_CHOICES),
                "ts_statuses": choices_to_list(TS_STATUS_CHOICES),
            }
        )


class DashboardSummaryView(APIView):
    def get(self, request):
        today = timezone.localdate()
        ongoing = Troubleshoot.objects.filter(status__in=ONGOING_STATUSES)
        done_month = Troubleshoot.objects.filter(
            status="DONE", actual_date__year=today.year, actual_date__month=today.month
        )
        degraded = annotate_sites(Site.objects.filter(is_archived=False)).filter(last_status="DEGRADED")
        return Response(
            {
                "ongoing": ongoing.count(),
                "overdue": ongoing.filter(plan_date__lt=today).count(),
                "done_this_month": done_month.count(),
                "degraded_sites": degraded.count(),
                "total_sites": Site.objects.filter(is_archived=False).count(),
            }
        )


def _xlsx_response(filename, headers, rows):
    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for c in ws[1]:
        c.font = Font(bold=True)
    for r in rows:
        ws.append(r)
    for col in ws.columns:
        width = max(len(str(c.value or "")) for c in col[:200])
        ws.column_dimensions[col[0].column_letter].width = min(max(width + 2, 10), 50)
    buf = BytesIO()
    wb.save(buf)
    resp = HttpResponse(
        buf.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    resp["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp


VPN_LABEL = dict(VPN_STATUS_CHOICES)
RESP_LABEL = dict(RESPONSE_CHOICES)
TS_LABEL = dict(TS_STATUS_CHOICES)
DEVICE_LABEL = dict(DEVICE_CHOICES)
SITE_STATUS_LABEL = dict(SITE_STATUS_CHOICES)


class ExportTroubleshootsView(APIView):
    def get(self, request):
        qs = filter_troubleshoots(
            Troubleshoot.objects.select_related("site").prefetch_related("devices"), request.query_params
        )
        headers = [
            "SITE ID", "PROJECT ID", "NAMA SITE", "REGIONAL", "KAB/KOTA", "STATUS VPN", "RESPON",
            "PIC1", "PIC2", "TANGGAL PLAN", "TANGGAL TS", "PERANGKAT", "KETERANGAN", "PROGRESS",
            "CATATAN HASIL", "SUMBER",
        ]
        rows = []
        for t in qs:
            rows.append([
                t.site.site_id, t.site.project_id, t.site.name, t.site.regional, t.site.city,
                VPN_LABEL.get(t.vpn_status, ""), RESP_LABEL.get(t.response, ""), t.pic1, t.pic2,
                t.plan_date, t.actual_date,
                ", ".join(DEVICE_LABEL.get(d.device, d.device) for d in t.devices.all()),
                t.description or t.problem, TS_LABEL.get(t.status, t.status), t.result_note,
                "Import Excel" if t.source == "IMPORT" else "Input",
            ])
        return _xlsx_response(f"riwayat-ts-{timezone.localdate()}.xlsx", headers, rows)


class ExportSitesView(APIView):
    def get(self, request):
        qs = filter_sites(annotate_sites(Site.objects.filter(is_archived=False)), request.query_params)
        headers = [
            "SITE ID", "ID PROJECT", "SITE NAME", "REGIONAL", "KABUPATEN/KODYA", "TINGGI & TIPE TOWER",
            "IP VPN", "LATITUDE", "LONGITUDE", "ALAMAT", "LINK GOOGLE MAPS", "MITRA", "MILESTONE",
            "TIM IMPLEMENTASI", "TEAM LEADER", "NO IOT", "BRANCH", "KONDISI TERAKHIR", "JUMLAH TS",
        ]
        rows = [
            [
                s.site_id, s.project_id, s.name, s.regional, s.city, s.tower_type, s.ip_vpn,
                float(s.latitude) if s.latitude is not None else None,
                float(s.longitude) if s.longitude is not None else None,
                s.address, s.google_maps_url, s.partner, s.milestone, s.implementation_team,
                s.team_leader, s.iot_number, s.branch, SITE_STATUS_LABEL.get(s.last_status, ""), s.ts_count,
            ]
            for s in qs.order_by("site_id")
        ]
        return _xlsx_response(f"list-site-{timezone.localdate()}.xlsx", headers, rows)

