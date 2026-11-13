"""Pilihan (choices) yang dipakai bersama oleh beberapa app."""

DEVICE_CHOICES = [
    ("CCTV1", "CCTV 1"),
    ("CCTV2", "CCTV 2"),
    ("BLACKBOX", "Blackbox"),
    ("VPN", "VPN"),
    ("ROTARY", "Rotary"),
    ("SPEAKER", "Speaker"),
    ("RUT", "RUT"),
]

VPN_STATUS_CHOICES = [
    ("NEW_VPN", "NEW VPN"),
    ("OLD_VPN", "OLD VPN"),
    ("VPN_GONE", "VPN GONE"),
]

RESPONSE_CHOICES = [
    ("NO_RESPONSE", "NO RESPONSE"),
    ("RESPONSE", "RESPONSE"),
    ("RESPONSE_OFFLINE", "RESPONSE | OFFLINE"),
]

SITE_STATUS_CHOICES = [
    ("ONLINE", "Online"),
    ("OFFLINE", "Offline"),
    ("DEGRADED", "Degraded"),
]

TS_STATUS_CHOICES = [
    ("PLAN", "Direncanakan"),
    ("PROGRESS", "Sedang Dikerjakan"),
    ("DONE", "Selesai"),
    ("TROUBLE", "Masih Trouble"),
]

ONGOING_STATUSES = ("PLAN", "PROGRESS")
FINISHED_STATUSES = ("DONE", "TROUBLE")


def choices_to_list(choices):
    return [{"value": v, "label": l} for v, l in choices]

