from django.contrib import admin

from .models import Troubleshoot, TsDevice


class TsDeviceInline(admin.TabularInline):
    model = TsDevice
    extra = 0


@admin.register(Troubleshoot)
class TroubleshootAdmin(admin.ModelAdmin):
    list_display = ("site", "status", "plan_date", "actual_date", "source")
    list_filter = ("status", "source")
    search_fields = ("site__site_id", "site__name", "description", "problem")
    inlines = [TsDeviceInline]

