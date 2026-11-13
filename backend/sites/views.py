from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.constants import FINISHED_STATUSES, ONGOING_STATUSES

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
