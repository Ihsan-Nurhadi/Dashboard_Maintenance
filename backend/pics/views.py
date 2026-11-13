from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Pic
from .serializers import PicActivitySerializer, PicSerializer


class PicViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        qs = Pic.objects.all()
        p = self.request.query_params
        if self.action == "list":
            search = (p.get("search") or "").strip()
            if search:
                qs = qs.filter(
                    Q(name__icontains=search)
                    | Q(phone__icontains=search)
                    | Q(notes__icontains=search)
                )
            regional = p.get("regional")
            if regional:
                qs = qs.filter(regional__iexact=regional)
            role = p.get("role")
            if role:
                qs = qs.filter(role=role)
            is_active = p.get("is_active")
            if is_active in ("1", "true", "True"):
                qs = qs.filter(is_active=True)
            elif is_active in ("0", "false", "False"):
                qs = qs.filter(is_active=False)
        return qs.order_by("name")

    def get_serializer_class(self):
        if self.action in ("retrieve", "activities"):
            return PicActivitySerializer
        return PicSerializer

    @action(detail=True, methods=["get"])
    def activities(self, request, pk=None):
        pic = self.get_object()
        ser = PicActivitySerializer(pic)
        return Response(ser.data)

    @action(detail=False, methods=["get"])
    def options(self, request):
        roles = [{"value": v, "label": l} for v, l in Pic.ROLE_CHOICES]
        regionals = sorted({r for r in Pic.objects.values_list("regional", flat=True) if r})
        return Response({"roles": roles, "regionals": regionals})

