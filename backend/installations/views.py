from django.db.models import Q
from rest_framework import viewsets

from .models import Installation
from .serializers import InstallationSerializer


class InstallationViewSet(viewsets.ModelViewSet):
    serializer_class = InstallationSerializer

    def get_queryset(self):
        qs = Installation.objects.select_related("site").prefetch_related("devices")
        p = self.request.query_params
        if self.action == "list":
            if p.get("search"):
                s = p["search"].strip()
                qs = qs.filter(Q(site__site_id__icontains=s) | Q(site__name__icontains=s))
            if p.get("regional"):
                qs = qs.filter(site__regional__iexact=p["regional"])
            if p.get("partner"):
                qs = qs.filter(partner__iexact=p["partner"])
            if p.get("date_from"):
                qs = qs.filter(install_date__gte=p["date_from"])
            if p.get("date_to"):
                qs = qs.filter(install_date__lte=p["date_to"])
        return qs

