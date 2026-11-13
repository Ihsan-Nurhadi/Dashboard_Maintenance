from django.db import transaction
from django.db.models import Count, Max, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.constants import ONGOING_STATUSES

from .models import Troubleshoot, TsDevice
from .queries import filter_troubleshoots, with_event_date
from .serializers import ReportSerializer, TroubleshootSerializer, set_devices


class TroubleshootViewSet(viewsets.ModelViewSet):
    serializer_class = TroubleshootSerializer

    def get_queryset(self):
        qs = Troubleshoot.objects.select_related("site").prefetch_related("devices")
        if self.action == "list":
            return filter_troubleshoots(qs, self.request.query_params)
        return qs

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        ts = self.get_object()
        if ts.status != "PLAN":
            return Response(
                {"detail": "Hanya TS berstatus Direncanakan yang bisa ditandai Sedang Dikerjakan."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ts.status = "PROGRESS"
        ts.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(ts).data)

    @action(detail=True, methods=["post"])
    def report(self, request, pk=None):
        ts = self.get_object()
        if ts.status not in ONGOING_STATUSES:
            return Response(
                {"detail": "TS ini sudah memiliki report. Ubah lewat menu Riwayat TS."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = ReportSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        with transaction.atomic():
            if "plan_date" in data:
                ts.plan_date = data["plan_date"]
            ts.actual_date = data["actual_date"]
            ts.description = data["description"]
            ts.result_note = data.get("result_note", "")
            ts.status = data["result"]
            ts.save()
            set_devices(ts, TsDevice, "ts", data.get("devices", []))
        ts.refresh_from_db()
        return Response(self.get_serializer(ts).data)

    @action(detail=False, methods=["get"], url_path="by-site")
    def by_site(self, request):
        """RT-3: riwayat TS dikelompokkan per site."""
        params = request.query_params.copy()
        if not params.get("status"):
            params["status"] = "FINISHED"
        qs = filter_troubleshoots(Troubleshoot.objects.all(), params).order_by()
        grouped = (
            with_event_date(Troubleshoot.objects.filter(pk__in=qs.values("pk")))
            .values("site__site_id", "site__name", "site__regional")
            .annotate(
                total=Count("id"),
                done=Count("id", filter=Q(status="DONE")),
                trouble=Count("id", filter=Q(status="TROUBLE")),
                last_date=Max("event_date"),
            )
            .order_by("-last_date", "site__site_id")
        )
        page = self.paginate_queryset(grouped)
        rows = [
            {
                "site_id": g["site__site_id"],
                "site_name": g["site__name"],
                "regional": g["site__regional"],
                "total": g["total"],
                "done": g["done"],
                "trouble": g["trouble"],
                "last_date": g["last_date"],
            }
            for g in page
        ]
        return self.get_paginated_response(rows)

