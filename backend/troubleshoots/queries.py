from django.db.models import F, Q
from django.db.models.functions import Coalesce

from core.constants import ONGOING_STATUSES


def with_event_date(qs):
    return qs.annotate(event_date=Coalesce("actual_date", "plan_date"))


def filter_troubleshoots(qs, params):
    qs = with_event_date(qs)
    status = params.get("status")
    if status == "ONGOING":
        qs = qs.filter(status__in=ONGOING_STATUSES)
    elif status == "FINISHED":
        qs = qs.filter(status__in=("DONE", "TROUBLE"))
    elif status:
        qs = qs.filter(status__in=[s.strip() for s in status.split(",") if s.strip()])
    site = (params.get("site") or "").strip()
    if site:
        qs = qs.filter(site__site_id__iexact=site)
    regional = params.get("regional")
    if regional:
        qs = qs.filter(site__regional__iexact=regional)
    date_from = params.get("date_from")
    if date_from:
        qs = qs.filter(event_date__gte=date_from)
    date_to = params.get("date_to")
    if date_to:
        qs = qs.filter(event_date__lte=date_to)
    device = params.get("device")
    if device:
        qs = qs.filter(devices__device=device)
    source = params.get("source")
    if source:
        qs = qs.filter(source=source)
    search = (params.get("search") or "").strip()
    if search:
        qs = qs.filter(
            Q(site__site_id__icontains=search)
            | Q(site__name__icontains=search)
            | Q(site__regional__icontains=search)
            | Q(site__city__icontains=search)
            | Q(description__icontains=search)
            | Q(problem__icontains=search)
            | Q(result_note__icontains=search)
            | Q(pic1__icontains=search)
            | Q(pic2__icontains=search)
        )
    if params.get("overdue") == "1":
        from django.utils import timezone

        qs = qs.filter(status__in=ONGOING_STATUSES, plan_date__lt=timezone.localdate())

    ordering = params.get("ordering")
    if ordering == "plan":
        # Ongoing: plan terdekat (dan yang terlambat) di atas
        qs = qs.order_by(F("plan_date").asc(nulls_last=True), "id")
    else:
        qs = qs.order_by(F("event_date").desc(nulls_last=True), "-id")
    return qs.distinct()

