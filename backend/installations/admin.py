from django.contrib import admin

from .models import Installation, InstallationDevice


class DeviceInline(admin.TabularInline):
    model = InstallationDevice
    extra = 0


@admin.register(Installation)
class InstallationAdmin(admin.ModelAdmin):
    list_display = ("site", "install_date", "team", "partner")
    search_fields = ("site__site_id", "site__name")
    inlines = [DeviceInline]

