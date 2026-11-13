from django.contrib import admin

from .models import CctvAccount, Site, SiteStatusLog


class CctvInline(admin.TabularInline):
    model = CctvAccount
    extra = 0


@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ("site_id", "name", "regional", "city", "partner", "source", "is_archived")
    list_filter = ("regional", "partner", "source", "is_archived")
    search_fields = ("site_id", "name", "project_id")
    inlines = [CctvInline]


@admin.register(SiteStatusLog)
class SiteStatusLogAdmin(admin.ModelAdmin):
    list_display = ("site", "date", "status", "vpn_status", "response", "reason", "source")
    list_filter = ("status", "source")
    search_fields = ("site__site_id", "site__name", "reason")

