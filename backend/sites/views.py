import os
from decimal import Decimal
import openpyxl
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.constants import FINISHED_STATUSES, ONGOING_STATUSES
from importer.utils import clean_oneline, clean_pic, clean_text, norm_key, parse_latlong

from .models import CctvAccount, Site, SiteStatusLog
from .queries import annotate_sites, filter_sites
from .serializers import (
    CctvAccountSerializer,
    SiteDetailSerializer,
    SiteLookupSerializer,
    SiteSerializer,
    SiteStatusLogSerializer,
)


class SiteViewSet(viewsets.ModelViewSet):
    lookup_field = "site_id"
    lookup_value_regex = r"[^/]+"

    def get_queryset(self):
        qs = Site.objects.filter(is_archived=False)
        qs = annotate_sites(qs)
        if self.action == "list":
            qs = filter_sites(qs, self.request.query_params)
        return qs.order_by("site_id")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SiteDetailSerializer
        return SiteSerializer

    def get_object(self):
        obj = get_object_or_404(self.get_queryset(), site_id__iexact=self.kwargs["site_id"])
        self.check_object_permissions(self.request, obj)
        return obj

    def perform_create(self, serializer):
        serializer.save(source="NEW")

    def destroy(self, request, *args, **kwargs):
        # LS-5: hapus = arsipkan, riwayat TS tetap disimpan
        site = self.get_object()
        Site.objects.filter(pk=site.pk).update(is_archived=True)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def lookup(self, request):
        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response([])
        qs = Site.objects.filter(is_archived=False).filter(
            Q(site_id__icontains=q) | Q(name__icontains=q)
        )
        # Site ID yang diawali query tampil lebih dulu
        starts = list(qs.filter(site_id__istartswith=q).order_by("site_id")[:10])
        rest = list(qs.exclude(site_id__istartswith=q).order_by("site_id")[: 10 - len(starts)])
        return Response(SiteLookupSerializer(starts + rest, many=True).data)

    @action(detail=False, methods=["get"], url_path="options")
    def filter_options(self, request):
        """Daftar regional & mitra untuk dropdown filter."""
        base = Site.objects.filter(is_archived=False)
        regionals = sorted({r for r in base.values_list("regional", flat=True) if r})
        partners = sorted({p for p in base.values_list("partner", flat=True) if p})
        return Response({"regionals": regionals, "partners": partners})

    @action(detail=False, methods=["get"], url_path="template")
    def template(self, request):
        """Download file template Excel untuk import site beserta data dummy."""
        path = os.path.join(settings.BASE_DIR, "template_import_site.xlsx")
        if not os.path.exists(path):
            path = os.path.join(settings.BASE_DIR, "..", "template_import_site.xlsx")
        if os.path.exists(path):
            with open(path, "rb") as f:
                content = f.read()
            resp = HttpResponse(
                content,
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            resp["Content-Disposition"] = 'attachment; filename="template_import_site.xlsx"'
            return resp
        return Response({"detail": "File template tidak ditemukan."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=["post"], url_path="import-excel")
    def import_excel(self, request):
        """Import master site dari file Excel sesuai template PRD & LISTSITE."""
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"detail": "File Excel (.xlsx) harus diunggah."}, status=status.HTTP_400_BAD_REQUEST)

        if not file_obj.name.lower().endswith((".xlsx", ".xls")):
            return Response({"detail": "Format file tidak didukung. Harap unggah file .xlsx."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            wb = openpyxl.load_workbook(file_obj, data_only=True)
        except Exception as e:
            return Response({"detail": f"Gagal membaca file Excel: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Cari sheet yang memuat kolom SITE ID pada 10 baris pertama
        target_sheet = None
        header_idx = None
        for sheet in wb.worksheets:
            for idx, row in enumerate(sheet.iter_rows(max_row=10, values_only=True)):
                if any(c is not None and "SITE ID" in str(c).upper() for c in row):
                    target_sheet = sheet
                    header_idx = idx
                    break
            if target_sheet is not None:
                break

        if target_sheet is None:
            return Response(
                {"detail": "Kolom 'SITE ID' tidak ditemukan di sheet manapun. Pastikan menggunakan format template yang benar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rows = list(target_sheet.iter_rows(values_only=True))
        raw_headers = rows[header_idx]

        # Normalisasi mapping kolom
        header_map = {}
        for col_i, h in enumerate(raw_headers):
            if h is None:
                continue
            key = norm_key(str(h))
            if "SITE ID SITE NAME" in key or "SITE ID/NAME" in key:
                header_map["site_label"] = col_i
            elif "SITE ID" in key or key == "SITEID":
                header_map["site_id"] = col_i
            elif "PROJECT" in key:
                header_map["project_id"] = col_i
            elif "SITE NAME" in key or "NAMA SITE" in key:
                header_map["name"] = col_i
            elif "REGIONAL" in key:
                header_map["regional"] = col_i
            elif "KABUPATEN" in key or "KODYA" in key or "KAB/KOTA" in key or "KOTA" in key:
                header_map["city"] = col_i
            elif "TOWER" in key or "TINGGI" in key:
                header_map["tower_type"] = col_i
            elif "IP VPN" in key or "IPVPN" in key:
                header_map["ip_vpn"] = col_i
            elif "LAT LONG" in key or "LATLONG" in key:
                header_map["lat_long"] = col_i
            elif "LATITUDE" in key:
                header_map["latitude"] = col_i
            elif "LONGITUDE" in key:
                header_map["longitude"] = col_i
            elif "ALAMAT" in key or "ADDRESS" in key:
                header_map["address"] = col_i
            elif "GOOGLE MAPS" in key or "MAPS" in key:
                header_map["maps_url"] = col_i
            elif "MITRA" in key or "PARTNER" in key:
                header_map["partner"] = col_i
            elif "MILESTONE" in key:
                header_map["milestone"] = col_i
            elif "TIM IMPLEMENTASI" in key or "IMPLEMENTASI" in key:
                header_map["implementation_team"] = col_i
            elif "TEAM LEADER" in key or "LEADER" in key:
                header_map["team_leader"] = col_i
            elif "NAMA CCTV" in key or "CCTV NAME" in key:
                header_map["cctv_name"] = col_i
            elif "EMAIL CCTV" in key or "CCTV EMAIL" in key:
                header_map["cctv_email"] = col_i
            elif "IOT" in key:
                header_map["iot_number"] = col_i
            elif "BRANCH" in key:
                header_map["branch"] = col_i

        if "site_id" not in header_map:
            return Response({"detail": "Kolom 'SITE ID' tidak dapat dipetakan."}, status=status.HTTP_400_BAD_REQUEST)

        created_count = 0
        updated_count = 0
        skipped_count = 0
        sample_imported = []

        with transaction.atomic():
            for r_idx, row in enumerate(rows[header_idx + 1:], start=header_idx + 2):
                if not row or all(v is None for v in row):
                    continue

                def get_val(key):
                    idx = header_map.get(key)
                    if idx is not None and idx < len(row):
                        return row[idx]
                    return None

                raw_sid = clean_text(get_val("site_id"))
                if not raw_sid:
                    skipped_count += 1
                    continue

                name = clean_oneline(get_val("name")) or raw_sid
                project_id = clean_text(get_val("project_id"))
                label = clean_oneline(get_val("site_label")) or f"{raw_sid} - {name}"
                reg = clean_oneline(get_val("regional")).upper()
                city = clean_oneline(get_val("city"))
                tower_type = clean_oneline(get_val("tower_type"))
                ip_vpn = clean_text(get_val("ip_vpn"))
                addr = clean_text(get_val("address"))
                maps_url = clean_text(get_val("maps_url"))
                partner = clean_oneline(get_val("partner"))
                milestone = clean_oneline(get_val("milestone"))
                tim_impl = clean_pic(get_val("implementation_team"))
                tl = clean_pic(get_val("team_leader"))
                iot_num = clean_text(get_val("iot_number"))
                branch = clean_oneline(get_val("branch"))

                # Koordinat lat & long
                lat, lng = parse_latlong(get_val("lat_long"))
                if lat is None and get_val("latitude") is not None:
                    try:
                        lat = Decimal(str(get_val("latitude")).strip()).quantize(Decimal("0.000001"))
                    except Exception:
                        lat = None
                if lng is None and get_val("longitude") is not None:
                    try:
                        lng = Decimal(str(get_val("longitude")).strip()).quantize(Decimal("0.000001"))
                    except Exception:
                        lng = None

                site_obj, created = Site.objects.get_or_create(
                    site_id=raw_sid,
                    defaults={
                        "project_id": project_id,
                        "name": name,
                        "site_label": label,
                        "regional": reg,
                        "city": city,
                        "tower_type": tower_type,
                        "ip_vpn": ip_vpn,
                        "latitude": lat,
                        "longitude": lng,
                        "address": addr,
                        "maps_url": maps_url,
                        "partner": partner,
                        "milestone": milestone,
                        "implementation_team": tim_impl,
                        "team_leader": tl,
                        "iot_number": iot_num,
                        "branch": branch,
                        "source": "IMPORT",
                        "is_archived": False,
                    },
                )

                if not created:
                    if project_id: site_obj.project_id = project_id
                    if name: site_obj.name = name
                    if label: site_obj.site_label = label
                    if reg: site_obj.regional = reg
                    if city: site_obj.city = city
                    if tower_type: site_obj.tower_type = tower_type
                    if ip_vpn: site_obj.ip_vpn = ip_vpn
                    if lat is not None: site_obj.latitude = lat
                    if lng is not None: site_obj.longitude = lng
                    if addr: site_obj.address = addr
                    if maps_url: site_obj.maps_url = maps_url
                    if partner: site_obj.partner = partner
                    if milestone: site_obj.milestone = milestone
                    if tim_impl: site_obj.implementation_team = tim_impl
                    if tl: site_obj.team_leader = tl
                    if iot_num: site_obj.iot_number = iot_num
                    if branch: site_obj.branch = branch
                    site_obj.is_archived = False
                    site_obj.save()
                    updated_count += 1
                else:
                    created_count += 1

                # Akun CCTV jika ada
                cctv_name = clean_text(get_val("cctv_name"))
                cctv_email = clean_text(get_val("cctv_email"))
                if cctv_name or cctv_email:
                    cctv_qs = CctvAccount.objects.filter(site=site_obj)
                    if cctv_name:
                        cctv_qs = cctv_qs.filter(cctv_name=cctv_name)
                    cctv_obj = cctv_qs.first()
                    if cctv_obj:
                        if cctv_email and not cctv_obj.account_email:
                            cctv_obj.account_email = cctv_email
                            cctv_obj.save()
                    else:
                        CctvAccount.objects.create(
                            site=site_obj,
                            cctv_name=cctv_name or "CCTV",
                            account_email=cctv_email,
                        )

                if len(sample_imported) < 5:
                    sample_imported.append(f"{raw_sid} - {name}")

        return Response({
            "success": True,
            "message": f"Import berhasil! {created_count} site baru ditambahkan, {updated_count} site diperbarui.",
            "created_count": created_count,
            "updated_count": updated_count,
            "skipped_count": skipped_count,
            "total": created_count + updated_count,
            "sample": sample_imported,
        })

    @action(detail=True, methods=["get"])
    def summary(self, request, site_id=None):
        """Data untuk Form TS: info site, 3 TS terakhir, dan TS yang masih berjalan."""
        from troubleshoots.models import Troubleshoot
        from troubleshoots.serializers import TroubleshootSerializer

        site = self.get_object()
        ts_qs = Troubleshoot.objects.filter(site=site).prefetch_related("devices").select_related("site")
        finished = ts_qs.filter(status__in=FINISHED_STATUSES).order_by("-actual_date", "-id")
        ongoing = ts_qs.filter(status__in=ONGOING_STATUSES).order_by("plan_date", "id")
        return Response(
            {
                "site": SiteSerializer(site).data,
                "history_total": finished.count(),
                "recent_history": TroubleshootSerializer(finished[:3], many=True).data,
                "ongoing": TroubleshootSerializer(ongoing, many=True).data,
            }
        )

    @action(detail=True, methods=["get", "post"], url_path="status-logs")
    def status_logs(self, request, site_id=None):
        site = self.get_object()
        if request.method == "POST":
            ser = SiteStatusLogSerializer(data=request.data)
            ser.is_valid(raise_exception=True)
            ser.save(site=site, source="MANUAL")
            return Response(ser.data, status=status.HTTP_201_CREATED)
        logs = site.status_logs.all()
        page = self.paginate_queryset(logs)
        return self.get_paginated_response(SiteStatusLogSerializer(page, many=True).data)

    @action(detail=True, methods=["get", "post"])
    def cctv(self, request, site_id=None):
        site = self.get_object()
        if request.method == "POST":
            ser = CctvAccountSerializer(data=request.data)
            ser.is_valid(raise_exception=True)
            ser.save(site=site)
            return Response(ser.data, status=status.HTTP_201_CREATED)
        return Response(CctvAccountSerializer(site.cctv_accounts.all(), many=True).data)


class SiteStatusLogViewSet(
    mixins.RetrieveModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    queryset = SiteStatusLog.objects.all()
    serializer_class = SiteStatusLogSerializer


class CctvAccountViewSet(
    mixins.RetrieveModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    queryset = CctvAccount.objects.all()
    serializer_class = CctvAccountSerializer
