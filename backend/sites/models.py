from django.db import models

from core.constants import RESPONSE_CHOICES, SITE_STATUS_CHOICES, VPN_STATUS_CHOICES


class Site(models.Model):
    SOURCE_CHOICES = [("IMPORT", "Import Excel"), ("NEW", "Site Baru")]

    site_id = models.CharField("Site ID", max_length=30, unique=True)
    project_id = models.CharField("Project ID", max_length=30, blank=True, default="")
    name = models.CharField("Nama Site", max_length=150)
    site_label = models.CharField(max_length=200, blank=True, default="")
    regional = models.CharField(max_length=30, blank=True, default="", db_index=True)
    city = models.CharField("Kab/Kota", max_length=100, blank=True, default="")
    tower_type = models.CharField(max_length=50, blank=True, default="")
    ip_vpn = models.CharField(max_length=45, blank=True, default="")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    address = models.TextField(blank=True, default="")
    maps_url = models.CharField(max_length=500, blank=True, default="")
    partner = models.CharField("Mitra", max_length=30, blank=True, default="")
    milestone = models.CharField(max_length=30, blank=True, default="")
    implementation_team = models.CharField(max_length=200, blank=True, default="")
    team_leader = models.CharField(max_length=200, blank=True, default="")
    iot_number = models.CharField(max_length=20, blank=True, default="")
    branch = models.CharField(max_length=50, blank=True, default="")
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default="NEW")
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["site_id"]

    def __str__(self):
        return f"{self.site_id} - {self.name}"

    @property
    def google_maps_url(self):
        if self.maps_url:
            return self.maps_url
        if self.latitude is not None and self.longitude is not None:
            return f"https://www.google.com/maps?q={self.latitude},{self.longitude}"
        return ""


class CctvAccount(models.Model):
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="cctv_accounts")
    cctv_name = models.CharField(max_length=150, blank=True, default="")
    account_email = models.CharField(max_length=150, blank=True, default="")
    note = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.site.site_id} - {self.cctv_name}"


class SiteStatusLog(models.Model):
    SOURCE_CHOICES = [
        ("REPORT_SITE", "Report Site (Excel)"),
        ("DEGREED", "Degraded (Excel)"),
        ("MANUAL", "Input Manual"),
    ]

    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="status_logs")
    date = models.DateTimeField()
    status = models.CharField(max_length=10, choices=SITE_STATUS_CHOICES, null=True, blank=True)
    vpn_status = models.CharField(max_length=10, choices=VPN_STATUS_CHOICES, null=True, blank=True)
    response = models.CharField(max_length=20, choices=RESPONSE_CHOICES, null=True, blank=True)
    reason = models.CharField(max_length=255, blank=True, default="")
    pic = models.CharField(max_length=200, blank=True, default="")
    note = models.TextField(blank=True, default="")
    source = models.CharField(max_length=15, choices=SOURCE_CHOICES, default="MANUAL")
    import_key = models.CharField(max_length=255, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"{self.site.site_id} {self.date:%Y-%m-%d} {self.status}"

