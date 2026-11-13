from django.db.models import Count, OuterRef, Q, Subquery

from .models import SiteStatusLog


def annotate_sites(qs):
    """Tambahkan kondisi terakhir & jumlah TS ke queryset Site."""
    with_status = SiteStatusLog.objects.filter(site=OuterRef("pk"), status__isnull=False).order_by("-date", "-id")
    with_vpn = SiteStatusLog.objects.filter(site=OuterRef("pk"), vpn_status__isnull=False).order_by("-date", "-id")
    with_resp = SiteStatusLog.objects.filter(site=OuterRef("pk"), response__isnull=False).order_by("-date", "-id")
    return qs.annotate(
        last_status=Subquery(with_status.values("status")[:1]),
        last_status_date=Subquery(with_status.values("date")[:1]),
        last_vpn_status=Subquery(with_vpn.values("vpn_status")[:1]),
        last_response=Subquery(with_resp.values("response")[:1]),
        ts_count=Count("troubleshoots", distinct=True),
    )


def filter_sites(qs, params):
    search = (params.get("search") or "").strip()
    if search:
        qs = qs.filter(
            Q(site_id__icontains=search)
            | Q(name__icontains=search)
            | Q(project_id__icontains=search)
            | Q(site_label__icontains=search)
        )
    regional = params.get("regional")
    if regional:
        qs = qs.filter(regional__iexact=regional)
    partner = params.get("partner")
    if partner:
        qs = qs.filter(partner__iexact=partner)
    source = params.get("source")
    if source:
        qs = qs.filter(source=source)
    condition = params.get("condition")
    if condition == "NONE":
        qs = qs.filter(last_status__isnull=True)
    elif condition:
        qs = qs.filter(last_status=condition)
    return qs

