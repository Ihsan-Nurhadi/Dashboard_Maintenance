from django.db import models

from core.constants import DEVICE_CHOICES, RESPONSE_CHOICES, TS_STATUS_CHOICES, VPN_STATUS_CHOICES
from sites.models import Site


class Troubleshoot(models.Model):
    SOURCE_CHOICES = [("IMPORT", "Import Excel"), ("INPUT", "Input")]

    site = models.ForeignKey(Site, on_delete=models.PROTECT, related_name="troubleshoots")
    status = models.CharField(max_length=10, choices=TS_STATUS_CHOICES, default="PLAN", db_index=True)
    vpn_status = models.CharField(max_length=10, choices=VPN_STATUS_CHOICES, null=True, blank=True)
    response = models.CharField(max_length=20, choices=RESPONSE_CHOICES, null=True, blank=True)
    pic1 = models.CharField(max_length=200, blank=True, default="")
    pic2 = models.CharField(max_length=200, blank=True, default="")
    plan_date = models.DateField(null=True, blank=True)
    actual_date = models.DateField(null=True, blank=True)
    problem = models.TextField("Keterangan masalah", blank=True, default="")
    description = models.TextField("Keterangan hasil kunjungan", blank=True, default="")
    result_note = models.CharField(max_length=255, blank=True, default="")
    parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="follow_ups"
    )
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default="INPUT")
    import_key = models.CharField(max_length=255, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-actual_date", "-plan_date", "-id"]

    def __str__(self):
        return f"TS {self.site.site_id} ({self.get_status_display()})"


class TsDevice(models.Model):
    ts = models.ForeignKey(Troubleshoot, on_delete=models.CASCADE, related_name="devices")
    device = models.CharField(max_length=10, choices=DEVICE_CHOICES)

    class Meta:
        unique_together = [("ts", "device")]

    def __str__(self):
        return self.device

