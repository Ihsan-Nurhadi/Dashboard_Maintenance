from django.utils import timezone
from rest_framework import serializers

from core.constants import DEVICE_CHOICES, FINISHED_STATUSES, ONGOING_STATUSES
from sites.models import Site

from .models import Troubleshoot, TsDevice

DEVICE_ORDER = [d for d, _ in DEVICE_CHOICES]


class DeviceField(serializers.Field):
    def to_representation(self, value):
        return sorted(
            (d.device for d in value.all()),
            key=lambda d: DEVICE_ORDER.index(d) if d in DEVICE_ORDER else 99,
        )

    def to_internal_value(self, data):
        if not isinstance(data, list):
            raise serializers.ValidationError("Harus berupa list perangkat.")
        valid_choices = {c[0] for c in DEVICE_CHOICES}
        for item in data:
            if item not in valid_choices:
                raise serializers.ValidationError(f"Perangkat tidak valid: {item}")
        return data


def set_devices(obj, related_model, fk_name, devices):
    devices = [d for d in DEVICE_ORDER if d in set(devices or [])]
    related_model.objects.filter(**{fk_name: obj}).exclude(device__in=devices).delete()
    existing = set(related_model.objects.filter(**{fk_name: obj}).values_list("device", flat=True))
    related_model.objects.bulk_create(
        [related_model(**{fk_name: obj, "device": d}) for d in devices if d not in existing]
    )


class TroubleshootSerializer(serializers.ModelSerializer):
    site_id = serializers.CharField(write_only=True, required=False)
    site_code = serializers.CharField(source="site.site_id", read_only=True)
    site_name = serializers.CharField(source="site.name", read_only=True)
    regional = serializers.CharField(source="site.regional", read_only=True)
    city = serializers.CharField(source="site.city", read_only=True)
    site_archived = serializers.BooleanField(source="site.is_archived", read_only=True)
    devices = DeviceField(required=False)
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Troubleshoot
        fields = [
            "id",
            "site_id",
            "site_code",
            "site_name",
            "regional",
            "city",
            "site_archived",
            "status",
            "vpn_status",
            "response",
            "pic1",
            "pic2",
            "plan_date",
            "actual_date",
            "problem",
            "description",
            "result_note",
            "devices",
            "parent",
            "source",
            "is_overdue",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["source", "created_at", "updated_at"]

    def get_is_overdue(self, obj):
        return bool(
            obj.status in ONGOING_STATUSES
            and obj.plan_date
            and obj.plan_date < timezone.localdate()
        )

    def validate(self, attrs):
        creating = self.instance is None
        if creating:
            site_id = (attrs.pop("site_id", "") or "").strip()
            if not site_id:
                raise serializers.ValidationError({"site_id": "Site ID wajib diisi."})
            site = Site.objects.filter(site_id__iexact=site_id, is_archived=False).first()
            if not site:
                raise serializers.ValidationError({"site_id": "Site ID tidak ditemukan."})
            attrs["site"] = site
            attrs.setdefault("status", "PLAN")
            if attrs["status"] in ONGOING_STATUSES and not attrs.get("plan_date"):
                raise serializers.ValidationError({"plan_date": "Plan kunjungan wajib diisi."})
        else:
            attrs.pop("site_id", None)

        status = attrs.get("status", getattr(self.instance, "status", "PLAN"))
        actual = attrs.get("actual_date", getattr(self.instance, "actual_date", None))
        if status in FINISHED_STATUSES and not actual:
            raise serializers.ValidationError({"actual_date": "Tanggal aktual TS wajib diisi."})
        if actual and actual > timezone.localdate():
            raise serializers.ValidationError({"actual_date": "Tanggal aktual tidak boleh melebihi hari ini."})
        return attrs

    def create(self, validated_data):
        devices = validated_data.pop("devices", None)
        obj = Troubleshoot.objects.create(**validated_data)
        if devices is not None:
            set_devices(obj, TsDevice, "ts", devices)
        return obj

    def update(self, instance, validated_data):
        devices = validated_data.pop("devices", None)
        obj = super().update(instance, validated_data)
        if devices is not None:
            set_devices(obj, TsDevice, "ts", devices)
        return obj


class ReportSerializer(serializers.Serializer):
    plan_date = serializers.DateField(required=False, allow_null=True)
    actual_date = serializers.DateField()
    devices = serializers.ListField(child=serializers.ChoiceField(choices=DEVICE_CHOICES), required=False)
    description = serializers.CharField(allow_blank=False, error_messages={"blank": "Keterangan wajib diisi.", "required": "Keterangan wajib diisi."})
    result = serializers.ChoiceField(choices=[("DONE", "Selesai"), ("TROUBLE", "Masih Trouble")], error_messages={"required": "Hasil wajib dipilih."})
    result_note = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_actual_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Tanggal aktual tidak boleh melebihi hari ini.")
        return value

