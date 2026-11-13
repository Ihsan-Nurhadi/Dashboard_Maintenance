from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from core.constants import DEVICE_CHOICES
from sites.serializers import SiteSerializer
from troubleshoots.serializers import DEVICE_ORDER, DeviceField, set_devices

from .models import Installation, InstallationDevice


class InstallationSerializer(serializers.ModelSerializer):
    site = SiteSerializer(required=False)
    site_code = serializers.CharField(source="site.site_id", read_only=True)
    site_name = serializers.CharField(source="site.name", read_only=True)
    regional = serializers.CharField(source="site.regional", read_only=True)
    site_archived = serializers.BooleanField(source="site.is_archived", read_only=True)
    devices = DeviceField(required=False)

    class Meta:
        model = Installation
        fields = [
            "id",
            "site",
            "site_code",
            "site_name",
            "regional",
            "site_archived",
            "install_date",
            "team",
            "partner",
            "ip_vpn",
            "note",
            "devices",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_install_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Tanggal pemasangan tidak boleh melebihi hari ini.")
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get("site"):
            raise serializers.ValidationError({"site": "Data site wajib diisi."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        site_data = validated_data.pop("site")
        devices = validated_data.pop("devices", [])
        # Lengkapi data site dari data pemasangan bila kosong
        site_data.setdefault("ip_vpn", validated_data.get("ip_vpn", ""))
        if not site_data.get("ip_vpn"):
            site_data["ip_vpn"] = validated_data.get("ip_vpn", "")
        if not site_data.get("partner"):
            site_data["partner"] = validated_data.get("partner", "")
        if not site_data.get("implementation_team"):
            site_data["implementation_team"] = validated_data.get("team", "")
        site_ser = SiteSerializer(data=site_data)
        site_ser.is_valid(raise_exception=True)
        site = site_ser.save(source="NEW")
        inst = Installation.objects.create(site=site, **validated_data)
        set_devices(inst, InstallationDevice, "installation", devices)
        return inst

    def update(self, instance, validated_data):
        validated_data.pop("site", None)  # data site diubah lewat List Site
        devices = validated_data.pop("devices", None)
        inst = super().update(instance, validated_data)
        if devices is not None:
            set_devices(inst, InstallationDevice, "installation", devices)
        return inst

