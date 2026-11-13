from rest_framework import serializers

from .models import CctvAccount, Site, SiteStatusLog

SITE_FIELDS = [
    "id",
    "site_id",
    "project_id",
    "name",
    "site_label",
    "regional",
    "city",
    "tower_type",
    "ip_vpn",
    "latitude",
    "longitude",
    "address",
    "maps_url",
    "partner",
    "milestone",
    "implementation_team",
    "team_leader",
    "iot_number",
    "branch",
    "source",
    "created_at",
    "updated_at",
]


class CctvAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = CctvAccount
        fields = ["id", "cctv_name", "account_email", "note"]


class SiteStatusLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteStatusLog
        fields = ["id", "date", "status", "vpn_status", "response", "reason", "pic", "note", "source"]
        read_only_fields = ["source"]


class SiteConditionMixin(serializers.Serializer):
    last_status = serializers.SerializerMethodField()
    last_status_date = serializers.SerializerMethodField()
    last_vpn_status = serializers.SerializerMethodField()
    last_response = serializers.SerializerMethodField()
    ts_count = serializers.SerializerMethodField()

    def get_last_status(self, obj):
        return getattr(obj, "last_status", None)

    def get_last_status_date(self, obj):
        v = getattr(obj, "last_status_date", None)
        return v.isoformat() if v else None

    def get_last_vpn_status(self, obj):
        return getattr(obj, "last_vpn_status", None)

    def get_last_response(self, obj):
        return getattr(obj, "last_response", None)

    def get_ts_count(self, obj):
        return getattr(obj, "ts_count", None)


class SiteSerializer(SiteConditionMixin, serializers.ModelSerializer):
    google_maps_url = serializers.CharField(read_only=True)

    class Meta:
        model = Site
        fields = SITE_FIELDS + [
            "google_maps_url",
            "last_status",
            "last_status_date",
            "last_vpn_status",
            "last_response",
            "ts_count",
        ]
        read_only_fields = ["source", "created_at", "updated_at"]
        # Validasi unik site_id dilakukan manual (tidak membedakan huruf besar/kecil)
        extra_kwargs = {"site_id": {"validators": []}}

    def validate_site_id(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Site ID wajib diisi.")
        if self.instance is not None:
            # Site ID tidak boleh diubah (LS-4)
            return self.instance.site_id
        if Site.objects.filter(site_id__iexact=value).exists():
            raise serializers.ValidationError(f"Site ID {value} sudah terdaftar.")
        return value

    def validate_name(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Nama site wajib diisi.")
        return value

    def validate_regional(self, value):
        return (value or "").strip().upper()


class SiteDetailSerializer(SiteSerializer):
    cctv_accounts = CctvAccountSerializer(many=True, read_only=True)
    has_installation = serializers.SerializerMethodField()
    installation_id = serializers.SerializerMethodField()

    class Meta(SiteSerializer.Meta):
        fields = SiteSerializer.Meta.fields + ["cctv_accounts", "has_installation", "installation_id"]

    def get_has_installation(self, obj):
        return hasattr(obj, "installation")

    def get_installation_id(self, obj):
        return obj.installation.id if hasattr(obj, "installation") else None


class SiteLookupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Site
        fields = ["site_id", "name", "regional", "city"]

