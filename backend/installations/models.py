from django.db import models

from core.constants import DEVICE_CHOICES
from sites.models import Site


class Installation(models.Model):
    """Riwayat pemasangan — hanya untuk site baru di luar 1.008 site hasil import."""

    site = models.OneToOneField(Site, on_delete=models.CASCADE, related_name="installation")
    install_date = models.DateField()
    team = models.CharField(max_length=200, blank=True, default="")
    partner = models.CharField(max_length=30, blank=True, default="")
    ip_vpn = models.CharField(max_length=45, blank=True, default="")
    note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-install_date", "-id"]

    def __str__(self):
        return f"Pemasangan {self.site.site_id} ({self.install_date})"


class InstallationDevice(models.Model):
    installation = models.ForeignKey(Installation, on_delete=models.CASCADE, related_name="devices")
    device = models.CharField(max_length=10, choices=DEVICE_CHOICES)

    class Meta:
        unique_together = [("installation", "device")]

