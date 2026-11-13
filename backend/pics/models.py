from django.db import models


class Pic(models.Model):
    ROLE_CHOICES = [
        ("FIELD_ENGINEER", "Teknisi Lapangan / Tim Implementasi"),
        ("TEAM_LEADER", "Team Leader"),
        ("COORDINATOR", "Koordinator Regional"),
        ("NOC", "NOC / Support"),
    ]

    name = models.CharField("Nama Lengkap", max_length=150, db_index=True)
    phone = models.CharField("Nomor HP / WhatsApp", max_length=50, blank=True, default="")
    role = models.CharField("Peran / Posisi", max_length=30, choices=ROLE_CHOICES, default="FIELD_ENGINEER")
    regional = models.CharField("Regional", max_length=50, blank=True, default="", db_index=True)
    partner = models.CharField("Mitra Perusahaan", max_length=50, blank=True, default="")
    notes = models.TextField("Catatan", blank=True, default="")
    is_active = models.BooleanField("Aktif", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "PIC"
        verbose_name_plural = "Daftar PIC"

    def __str__(self):
        role_label = self.get_role_display()
        contact = f" ({self.phone})" if self.phone else ""
        return f"{self.name}{contact} - {role_label}"

    @property
    def display_contact(self):
        if self.phone:
            return f"{self.name} / {self.phone}"
        return self.name

