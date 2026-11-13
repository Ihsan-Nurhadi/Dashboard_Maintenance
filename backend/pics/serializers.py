from django.db.models import Q
from rest_framework import serializers

from troubleshoots.models import Troubleshoot
from troubleshoots.serializers import TroubleshootSerializer
from sites.models import Site
from .models import Pic


class PicSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    ongoing_count = serializers.SerializerMethodField()
    history_count = serializers.SerializerMethodField()
    assigned_sites_count = serializers.SerializerMethodField()

    class Meta:
        model = Pic
        fields = [
            "id",
            "name",
            "phone",
            "role",
            "role_display",
            "regional",
            "partner",
            "notes",
            "is_active",
            "ongoing_count",
            "history_count",
            "assigned_sites_count",
            "created_at",
            "updated_at",
        ]

    def _get_ts_query(self, obj):
        q = Q(pic1__icontains=obj.name) | Q(pic2__icontains=obj.name)
        if obj.phone and len(obj.phone) >= 7:
            clean_digits = "".join(filter(str.isdigit, obj.phone))[-7:]
            q |= Q(pic1__icontains=clean_digits) | Q(pic2__icontains=clean_digits)
        return q

    def get_ongoing_count(self, obj):
        return Troubleshoot.objects.filter(
            self._get_ts_query(obj),
            status__in=["PLAN", "PROGRESS"],
        ).count()

    def get_history_count(self, obj):
        return Troubleshoot.objects.filter(
            self._get_ts_query(obj),
            status__in=["DONE", "TROUBLE"],
        ).count()

    def get_assigned_sites_count(self, obj):
        q = Q(implementation_team__icontains=obj.name) | Q(team_leader__icontains=obj.name)
        return Site.objects.filter(q, is_archived=False).count()


class PicActivitySerializer(PicSerializer):
    ongoing_troubleshoots = serializers.SerializerMethodField()
    recent_history_troubleshoots = serializers.SerializerMethodField()
    assigned_sites = serializers.SerializerMethodField()

    class Meta(PicSerializer.Meta):
        fields = PicSerializer.Meta.fields + [
            "ongoing_troubleshoots",
            "recent_history_troubleshoots",
            "assigned_sites",
        ]

    def get_ongoing_troubleshoots(self, obj):
        qs = Troubleshoot.objects.filter(
            self._get_ts_query(obj),
            status__in=["PLAN", "PROGRESS"],
        ).select_related("site").prefetch_related("devices").order_by("plan_date", "id")
        return TroubleshootSerializer(qs, many=True).data

    def get_recent_history_troubleshoots(self, obj):
        qs = Troubleshoot.objects.filter(
            self._get_ts_query(obj),
            status__in=["DONE", "TROUBLE"],
        ).select_related("site").prefetch_related("devices").order_by("-actual_date", "-id")[:20]
        return TroubleshootSerializer(qs, many=True).data

    def get_assigned_sites(self, obj):
        q = Q(implementation_team__icontains=obj.name) | Q(team_leader__icontains=obj.name)
        sites = Site.objects.filter(q, is_archived=False).values("site_id", "name", "regional", "city")[:20]
        return list(sites)

