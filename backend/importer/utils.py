"""Fungsi bantu pembersihan data Excel (PRD §8.3)."""
import re
from datetime import date, datetime, time
from decimal import Decimal, InvalidOperation

from django.utils import timezone

EMPTY_VALUES = {"", "#N/A", "#REF!", "#VALUE!", "#NAME?", "#DIV/0!", "0", "-", "N/A", "NONE"}
INVISIBLE = dict.fromkeys(map(ord, "\u202a\u202c\u200e\u200f\u200b\ufeff"), None)


def clean_text(value):
    """Ubah nilai sel menjadi teks bersih; nilai kosong/error → ''."""
    if value is None:
        return ""
    if isinstance(value, bool):
        return str(value)
    if isinstance(value, float):
        if value.is_integer():
            value = int(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    text = str(value).translate(INVISIBLE).replace("\xa0", " ").strip()
    if text.upper() in EMPTY_VALUES:
        return ""
    return text


def clean_oneline(value):
    """Teks satu baris (baris baru & spasi ganda dirapikan)."""
    text = clean_text(value)
    text = re.sub(r"\s*\n\s*", " ", text)
    return re.sub(r"\s{2,}", " ", text).strip()


def clean_pic(value):
    """Format PIC menjadi 'Nama / No HP'."""
    text = clean_oneline(value)
    if not text:
        return ""
    text = re.sub(r"\s*/\s*", " / ", text)
    return text.strip(" /")


def norm_key(value):
    return clean_text(value).upper()


def parse_latlong(value):
    text = clean_text(value)
    if not text:
        return None, None
    nums = re.findall(r"-?\d+(?:\.\d+)?", text)
    if len(nums) != 2:
        return None, None
    try:
        lat, lng = Decimal(nums[0]), Decimal(nums[1])
    except InvalidOperation:
        return None, None
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return None, None
    q = Decimal("0.000001")
    return lat.quantize(q), lng.quantize(q)


def to_date(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = clean_text(value)
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def to_datetime(value):
    if isinstance(value, datetime):
        dt = value
    else:
        d = to_date(value)
        if d is None:
            return None
        dt = datetime.combine(d, time(0, 0))
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt.replace(microsecond=0), timezone.get_default_timezone())
    return dt


VPN_MAP = {"NEWVPN": "NEW_VPN", "OLDVPN": "OLD_VPN", "VPNGONE": "VPN_GONE"}
RESPONSE_MAP = {
    "NORESPONSE": "NO_RESPONSE",
    "NORESPONS": "NO_RESPONSE",
    "RESPONSE": "RESPONSE",
    "RESPONS": "RESPONSE",
    "RESPONSE|OFFLINE": "RESPONSE_OFFLINE",
    "RESPONS|OFFLINE": "RESPONSE_OFFLINE",
}
SITE_STATUS_MAP = {"DEGREED": "DEGRADED", "DEGRADED": "DEGRADED", "ONLINE": "ONLINE", "OFFLINE": "OFFLINE"}


def _squash(value):
    return re.sub(r"\s+", "", norm_key(value))


def map_vpn(value):
    return VPN_MAP.get(_squash(value))


def map_response(value):
    return RESPONSE_MAP.get(_squash(value))


def map_site_status(value):
    return SITE_STATUS_MAP.get(_squash(value))


def parse_progress(value):
    """PROGRESS Excel → (status TS, catatan hasil, perlu dicek?)."""
    text = clean_oneline(value)
    upper = text.upper()
    if not text:
        return "TROUBLE", "", True
    if upper == "DONE":
        return "DONE", "", False
    if upper.startswith("DONE"):
        note = text[4:].lstrip(" ,.-:;")
        return "DONE", note, False
    if "TROUBLE" in upper:
        return "TROUBLE", "" if upper == "MASIH TROUBLE" else text, False
    return "TROUBLE", text, True


def read_sheet(wb, sheet_name, marker="SITE ID", search_rows=6):
    """Baca sheet sebagai list (nomor_baris, dict[HEADER]) dengan deteksi baris header otomatis."""
    ws = wb[sheet_name]
    rows = list(ws.iter_rows(values_only=True))
    header_idx = None
    for i, row in enumerate(rows[:search_rows]):
        if any(norm_key(c) == marker for c in row):
            header_idx = i
            break
    if header_idx is None:
        raise ValueError(f"Header '{marker}' tidak ditemukan di sheet {sheet_name}")
    headers = []
    seen = set()
    for c in rows[header_idx]:
        key = re.sub(r"\s+", " ", norm_key(c)) if c is not None else None
        if key in seen:
            key = None
        if key:
            seen.add(key)
        headers.append(key)
    result = []
    for offset, row in enumerate(rows[header_idx + 1:], start=header_idx + 2):
        if row is None or all(v is None for v in row):
            continue
        data = {h: (row[i] if i < len(row) else None) for i, h in enumerate(headers) if h}
        result.append((offset, data))
    return result

