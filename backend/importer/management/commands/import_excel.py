import csv
import os
import sys
from django.core.management.base import BaseCommand
from django.db import transaction
import openpyxl

from sites.models import Site, CctvAccount, SiteStatusLog
from troubleshoots.models import Troubleshoot
from importer.utils import (
    clean_text,
    clean_oneline,
    clean_pic,
    norm_key,
    parse_latlong,
    to_date,
    to_datetime,
    map_vpn,
    map_response,
    map_site_status,
    parse_progress,
    read_sheet,
)


class Command(BaseCommand):
    help = "Import data master site, CCTV, status log, dan riwayat TS dari file Excel sesuai PRD"

    def add_arguments(self, parser):
        parser.add_argument(
            "--listsite",
            default="LISTSITE.xlsx",
            help="Path file LISTSITE.xlsx (default: LISTSITE.xlsx)",
        )
        parser.add_argument(
            "--maintenance",
            default="MAINTENANCE - NAYAKA.xlsm",
            help="Path file MAINTENANCE - NAYAKA.xlsm (default: MAINTENANCE - NAYAKA.xlsm)",
        )
        parser.add_argument(
            "--report",
            default="import_report.csv",
            help="Path file CSV laporan import (default: import_report.csv)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Jalankan pemeriksaan tanpa menyimpan ke database",
        )

    def handle(self, *args, **options):
        listsite_path = options["listsite"]
        maintenance_path = options["maintenance"]
        report_path = options["report"]
        dry_run = options["dry_run"]

        if not os.path.exists(listsite_path):
            self.stderr.write(f"File tidak ditemukan: {listsite_path}")
            return
        if not os.path.exists(maintenance_path):
            self.stderr.write(f"File tidak ditemukan: {maintenance_path}")
            return

        report_rows = []

        def log_report(sheet, row_idx, site_id, category, message):
            report_rows.append({
                "sheet": sheet,
                "row": row_idx,
                "site_id": site_id or "",
                "category": category,
                "message": message,
            })

        self.stdout.write("Membaca file Excel...")
        wb_listsite = openpyxl.load_workbook(listsite_path, read_only=True, data_only=True)
        wb_maint = openpyxl.load_workbook(maintenance_path, read_only=True, data_only=True)

        with transaction.atomic():
            # 1. Master Site dari LISTSITE.xlsx
            self.stdout.write("1. Mengimpor master site dari LISTSITE.xlsx...")
            listsite_rows = read_sheet(wb_listsite, "LISTSITE", marker="SITE ID")
            site_cache = {}
            created_sites = 0
            updated_sites = 0

            for r_idx, row in listsite_rows:
                raw_sid = clean_text(row.get("SITE ID"))
                if not raw_sid:
                    log_report("LISTSITE.xlsx", r_idx, None, "SKIPPED", "SITE ID kosong")
                    continue
                sid_norm = norm_key(raw_sid)
                name = clean_oneline(row.get("SITE NAME")) or raw_sid
                project_id = clean_text(row.get("ID PROJECT") or row.get("ID Project"))
                label = clean_oneline(row.get("SITE ID SITE NAME") or row.get("Site id Site Name"))
                reg = clean_oneline(row.get("REGIONAL")).upper()
                city = clean_oneline(row.get("KABUPATEN/KODYA"))
                ip_vpn = clean_text(row.get("IP VPN") or row.get("IP VPN "))
                lat, lng = parse_latlong(row.get("LAT LONG") or row.get("Lat Long"))
                addr = clean_text(row.get("ALAMAT") or row.get("Alamat"))
                tim_impl = clean_pic(row.get("TIM IMPLEMENTASI") or row.get("Tim Implementasi"))
                tl = clean_pic(row.get("NAMA TEAM LEADER") or row.get("Nama Team Leader"))

                site_obj, created = Site.objects.get_or_create(
                    site_id=raw_sid,
                    defaults={
                        "project_id": project_id,
                        "name": name,
                        "site_label": label,
                        "regional": reg,
                        "city": city,
                        "ip_vpn": ip_vpn,
                        "latitude": lat,
                        "longitude": lng,
                        "address": addr,
                        "implementation_team": tim_impl,
                        "team_leader": tl,
                        "source": "IMPORT",
                    },
                )
                if not created:
                    site_obj.project_id = project_id or site_obj.project_id
                    site_obj.name = name or site_obj.name
                    site_obj.site_label = label or site_obj.site_label
                    site_obj.regional = reg or site_obj.regional
                    site_obj.city = city or site_obj.city
                    site_obj.ip_vpn = ip_vpn or site_obj.ip_vpn
                    site_obj.latitude = lat or site_obj.latitude
                    site_obj.longitude = lng or site_obj.longitude
                    site_obj.address = addr or site_obj.address
                    site_obj.implementation_team = tim_impl or site_obj.implementation_team
                    site_obj.team_leader = tl or site_obj.team_leader
                    site_obj.source = "IMPORT"
                    site_obj.save()
                    updated_sites += 1
                else:
                    created_sites += 1

                site_cache[sid_norm] = site_obj

                # Akun CCTV dari kolom tambahan jika ada
                cctv_name = clean_text(row.get("NAMA CCTV") or row.get("Nama CCTV"))
                cctv_email = clean_text(row.get("EMAIL CCTV") or row.get("Email CCTV"))
                if cctv_name or cctv_email:
                    CctvAccount.objects.get_or_create(
                        site=site_obj,
                        cctv_name=cctv_name,
                        account_email=cctv_email,
                    )

            self.stdout.write(f"   Master site: {created_sites} dibuat, {updated_sites} diperbarui.")

            # 2. Lengkapi dari MAINTENANCE - NAYAKA.xlsm (sheet LISTSITE)
            self.stdout.write("2. Melengkapi master site dari MAINTENANCE.xlsm (LISTSITE)...")
            m_listsite = read_sheet(wb_maint, "LISTSITE", marker="SITE ID")
            enriched_count = 0
            for r_idx, row in m_listsite:
                raw_sid = clean_text(row.get("SITE ID"))
                if not raw_sid:
                    continue
                site_obj = site_cache.get(norm_key(raw_sid))
                if not site_obj:
                    continue
                tower = clean_oneline(row.get("TINGGI & TIPE TOWER") or row.get("Tinggi & Tipe Tower"))
                maps = clean_text(row.get("LINK GOOGLE MAPS") or row.get("Link Google Maps"))
                partner = clean_oneline(row.get("MITRA") or row.get("Mitra"))
                milestone = clean_oneline(row.get("MILESTONE") or row.get("Milestone"))

                changed = False
                if tower and not site_obj.tower_type:
                    site_obj.tower_type = tower
                    changed = True
                if maps and not site_obj.maps_url:
                    site_obj.maps_url = maps
                    changed = True
                if partner and not site_obj.partner:
                    site_obj.partner = partner
                    changed = True
                if milestone and not site_obj.milestone:
                    site_obj.milestone = milestone
                    changed = True
                if changed:
                    site_obj.save()
                    enriched_count += 1
            self.stdout.write(f"   {enriched_count} site dilengkapi metadata tower/mitra/milestone.")

            # 3. Akun CCTV dari sheet CCTV MAIVIEW
            self.stdout.write("3. Mengimpor CCTV MAIVIEW...")
            cctv_rows = read_sheet(wb_maint, "CCTV MAIVIEW", marker="SITE ID")
            cctv_imported = 0
            for r_idx, row in cctv_rows:
                raw_sid = clean_text(row.get("SITE ID"))
                if not raw_sid:
                    continue
                site_obj = site_cache.get(norm_key(raw_sid))
                if not site_obj:
                    log_report("CCTV MAIVIEW", r_idx, raw_sid, "ORPHAN", "Site ID tidak ditemukan di Master Site")
                    continue
                c_name = clean_text(row.get("CCTV") or row.get("NAMA SITE"))
                c_email = clean_text(row.get("AKUN"))
                c_note = clean_text(row.get("NOTE"))
                CctvAccount.objects.get_or_create(
                    site=site_obj,
                    cctv_name=c_name,
                    account_email=c_email,
                    defaults={"note": c_note},
                )
                cctv_imported += 1
            self.stdout.write(f"   {cctv_imported} akun CCTV tercatat.")

            # 4. Sheet DEGREED
            self.stdout.write("4. Mengimpor status DEGREED...")
            degreed_rows = read_sheet(wb_maint, "DEGREED", marker="SITE ID")
            degreed_count = 0
            for r_idx, row in degreed_rows:
                raw_sid = clean_text(row.get("SITE ID"))
                if not raw_sid:
                    continue
                site_obj = site_cache.get(norm_key(raw_sid))
                if not site_obj:
                    log_report("DEGREED", r_idx, raw_sid, "ORPHAN", "Site ID tidak ditemukan di Master Site")
                    continue

                no_iot = clean_text(row.get("NO IOT"))
                branch = clean_oneline(row.get("BRANCH"))
                if no_iot and not site_obj.iot_number:
                    site_obj.iot_number = no_iot
                if branch and not site_obj.branch:
                    site_obj.branch = branch
                site_obj.save()

                r1 = clean_text(row.get("REASON 1"))
                r2 = clean_text(row.get("REASON 2"))
                vpn_st = map_vpn(r1) or map_vpn(r2)
                resp = map_response(r2) or map_response(r1)
                pic = clean_pic(row.get("PIC"))
                keterangan = clean_text(row.get("KETERANGAN"))
                progress = clean_text(row.get("PROGRESS"))
                plan_kun = to_date(row.get("PLAN KUNJUNGAN"))

                note_parts = []
                if plan_kun:
                    note_parts.append(f"Plan: {plan_kun}")
                if keterangan:
                    note_parts.append(f"Ket: {keterangan}")
                if progress:
                    note_parts.append(f"Progress: {progress}")
                comb_note = " | ".join(note_parts)

                import_key = f"DEG_{norm_key(raw_sid)}"
                SiteStatusLog.objects.update_or_create(
                    import_key=import_key,
                    defaults={
                        "site": site_obj,
                        "date": to_datetime(plan_kun) or to_datetime("2026-10-01"),
                        "status": "DEGRADED",
                        "vpn_status": vpn_st,
                        "response": resp,
                        "reason": clean_oneline(f"{r1} {r2}").strip(),
                        "pic": pic,
                        "note": comb_note,
                        "source": "DEGREED",
                    },
                )
                degreed_count += 1
            self.stdout.write(f"   {degreed_count} log DEGREED diproses.")

            # 5. Sheet 1. REPORT SITE
            self.stdout.write("5. Mengimpor 1. REPORT SITE...")
            report_site_rows = read_sheet(wb_maint, "1. REPORT SITE", marker="SITE ID")
            rs_count = 0
            for r_idx, row in report_site_rows:
                raw_sid = clean_text(row.get("SITE ID"))
                if not raw_sid:
                    continue
                site_obj = site_cache.get(norm_key(raw_sid))
                if not site_obj:
                    log_report("1. REPORT SITE", r_idx, raw_sid, "ORPHAN", "Site ID tidak ditemukan di Master Site")
                    continue
                dt = to_datetime(row.get("DATE") or row.get("TANGGAL")) or to_datetime("2026-10-01")
                st = map_site_status(row.get("STATUS"))
                reason = clean_oneline(row.get("REASON"))
                pic1 = clean_pic(row.get("PIC") or row.get("PIC1"))
                pic2 = clean_pic(row.get("PIC2"))
                comb_pic = " / ".join([p for p in (pic1, pic2) if p])

                import_key = f"RS_{norm_key(raw_sid)}_{r_idx}"
                SiteStatusLog.objects.update_or_create(
                    import_key=import_key,
                    defaults={
                        "site": site_obj,
                        "date": dt,
                        "status": st,
                        "reason": reason,
                        "pic": comb_pic,
                        "source": "REPORT_SITE",
                    },
                )
                rs_count += 1
            self.stdout.write(f"   {rs_count} log REPORT SITE diproses.")

            # 6. Sheet 3. REPORT TS (Riwayat TS)
            self.stdout.write("6. Mengimpor riwayat TS (3. REPORT TS)...")
            ts_rows = read_sheet(wb_maint, "3. REPORT TS", marker="SITE ID")
            ts_count = 0
            for r_idx, row in ts_rows:
                raw_sid = clean_text(row.get("SITE ID"))
                if not raw_sid:
                    continue
                site_obj = site_cache.get(norm_key(raw_sid))
                if not site_obj:
                    log_report("3. REPORT TS", r_idx, raw_sid, "ORPHAN", "Site ID tidak ditemukan di Master Site")
                    continue

                vpn_st = map_vpn(row.get("STATUS"))
                resp = map_response(row.get("REASON"))
                pic1 = clean_pic(row.get("PIC1"))
                pic2 = clean_pic(row.get("PIC2"))
                tgl_ts = to_date(row.get("TANGGAL TS"))
                ket = clean_text(row.get("KETERANGAN"))
                prog_raw = row.get("PROGRESS")
                status_ts, note_res, need_check = parse_progress(prog_raw)

                if need_check:
                    log_report("3. REPORT TS", r_idx, raw_sid, "NOTE", f"Progress '{prog_raw}' di-set ke TROUBLE, perlu diverifikasi.")

                import_key = f"RTS_{norm_key(raw_sid)}_{r_idx}"
                Troubleshoot.objects.update_or_create(
                    import_key=import_key,
                    defaults={
                        "site": site_obj,
                        "status": status_ts,
                        "vpn_status": vpn_st,
                        "response": resp,
                        "pic1": pic1,
                        "pic2": pic2,
                        "plan_date": tgl_ts,
                        "actual_date": tgl_ts,
                        "problem": ket,
                        "description": ket,
                        "result_note": note_res,
                        "source": "IMPORT",
                    },
                )
                ts_count += 1
            self.stdout.write(f"   {ts_count} riwayat TS berhasil dimasukkan.")

            # 7. Sheet 2. ONGOING TS
            self.stdout.write("7. Mengimpor TS berjalan (2. ONGOING TS)...")
            ongoing_rows = read_sheet(wb_maint, "2. ONGOING TS", marker="SITE ID")
            og_count = 0
            for r_idx, row in ongoing_rows:
                raw_sid = clean_text(row.get("SITE ID"))
                # Filter baris sampah/kosong
                if not raw_sid or raw_sid in ("0", "#N/A", "#REF!"):
                    continue
                site_obj = site_cache.get(norm_key(raw_sid))
                if not site_obj:
                    log_report("2. ONGOING TS", r_idx, raw_sid, "ORPHAN", "Site ID tidak ditemukan di Master Site")
                    continue

                vpn_st = map_vpn(row.get("STATUS"))
                resp = map_response(row.get("REASON"))
                pic1 = clean_pic(row.get("PIC1"))
                pic2 = clean_pic(row.get("PIC2"))
                plan_tgl = to_date(row.get("PLAN KUNJUNGAN"))
                ket = clean_text(row.get("KETERANGAN"))

                import_key = f"OG_{norm_key(raw_sid)}_{r_idx}"
                Troubleshoot.objects.update_or_create(
                    import_key=import_key,
                    defaults={
                        "site": site_obj,
                        "status": "PLAN",
                        "vpn_status": vpn_st,
                        "response": resp,
                        "pic1": pic1,
                        "pic2": pic2,
                        "plan_date": plan_tgl,
                        "problem": ket,
                        "source": "IMPORT",
                    },
                )
                og_count += 1
            self.stdout.write(f"   {og_count} TS Ongoing berhasil dimasukkan.")

            if dry_run:
                self.stdout.write(self.style.WARNING("DRY-RUN aktif: Membatalkan transaksi database."))
                transaction.set_rollback(True)

        # Simpan Laporan CSV
        if report_rows:
            with open(report_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=["sheet", "row", "site_id", "category", "message"])
                writer.writeheader()
                writer.writerows(report_rows)
            self.stdout.write(f"Laporan import disimpan di: {report_path} ({len(report_rows)} catatan)")
        else:
            self.stdout.write("Tidak ada error atau catatan khusus saat import.")

        self.stdout.write(self.style.SUCCESS("Proses import selesai dengan sukses!"))

