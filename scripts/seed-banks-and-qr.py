#!/usr/bin/env python3
"""
South Wallet v2 — Database Seeding Script
==========================================
1) Seeds the `banks` table with Yemeni banks (and common int'l banks active in YE).
2) Generates QR codes for every row in `wallet_addresses` and updates `qr_code_url`.
3) Verifies connectivity to Supabase.

Run: python3 /home/z/my-project/south-wallet-v2/scripts/seed-banks-and-qr.py
"""
import json
import sys
import urllib.request
import urllib.parse
import base64
import uuid
from datetime import datetime, timezone

SUPABASE_URL = "https://kifmxseonkdsxuanznny.supabase.co"
SERVICE_ROLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZm14c2Vvbmtkc3h1YW56bm55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ2OTc3MCwiZXhwIjoyMDk3MDQ1NzcwfQ.b1X7ydSkbOwS0LG39h22bvZg65qT0bCI7y5omrHw_rM"

HEADERS = {
    "apikey": SERVICE_ROLE,
    "Authorization": f"Bearer {SERVICE_ROLE}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

YEMENI_BANKS = [
    ("بنك التضامن الدولي", "مؤسسة الجنوب", "0123456789012", "YE86 CBYE 0000 0001 2345 6789", "CBYESYAA"),
    ("البنك المركزي اليمني", "مؤسسة الجنوب", "0123456789013", "YE86 CBYE 0000 0001 2345 6790", "CBYESYAA"),
    ("بنك اليمن والكويت", "مؤسسة الجنوب", "0123456789014", "YE86 KYBY 0000 0001 2345 6781", "KYBYESYAA"),
    ("البنك الأهلي اليمني", "مؤسسة الجنوب", "0123456789015", "YE86 NBYE 0000 0001 2345 6782", "NBIYESAA"),
    ("بنك القطيبي", "مؤسسة الجنوب", "0123456789016", "YE86 ALBA 0000 0001 2345 6783", "ALBAYEAA"),
    ("بنك سبأ الإسلامي", "مؤسسة الجنوب", "0123456789017", "YE86 SABA 0000 0001 2345 6784", "SABAYESAA"),
    ("بنك الأمل التعاوني", "مؤسسة الجنوب", "0123456789018", "YE86 AMAL 0000 0001 2345 6785", "AMALYESAA"),
    ("بنك اليمن الدولي", "مؤسسة الجنوب", "0123456789019", "YE86 IYB 0000 0001 2345 6786", "IYBYESAA"),
    ("بنك اليمن التجاري", "مؤسسة الجنوب", "0123456789020", "YE86 CYB 0000 0001 2345 6787", "CYBYESAA"),
    ("البنك العربي", "مؤسسة الجنوب", "0123456789021", "YE86 ARAB 0000 0001 2345 6788", "ARABYESAA"),
    ("بنك قطر الوطني (QNB)", "مؤسسة الجنوب", "0123456789022", "YE86 QNB 0000 0001 2345 6789", "QNBYESAA"),
    ("بنك الشام الإسلامي", "مؤسسة الجنوب", "0123456789023", "YE86 SHAM 0000 0001 2345 6790", "SHAMYESAA"),
]


def http_request(url, method="GET", data=None, extra_headers=None):
    headers = dict(HEADERS)
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, body
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")
    except Exception as e:
        return 0, str(e)


def fetch_existing_banks():
    status, body = http_request(f"{SUPABASE_URL}/rest/v1/banks?select=id,bank_name")
    if status == 200:
        try:
            return json.loads(body)
        except Exception:
            return []
    return []


def insert_bank(bank_name, account_name, account_number, iban, swift_code):
    payload = json.dumps({
        "bank_name": bank_name,
        "account_name": account_name,
        "account_number": account_number,
        "iban": iban,
        "swift_code": swift_code,
        "is_active": True,
    }).encode("utf-8")
    status, body = http_request(f"{SUPABASE_URL}/rest/v1/banks", method="POST", data=payload)
    return status, body


def fetch_wallet_addresses():
    status, body = http_request(f"{SUPABASE_URL}/rest/v1/wallet_addresses?select=id,network,network_name,address,label,currency,qr_code_url")
    if status == 200:
        try:
            return json.loads(body)
        except Exception:
            return []
    return []


def generate_qr_data_url(text):
    """Generate a QR code as a data URL using a public QR API."""
    try:
        qr_api_url = f"https://api.qrserver.com/v1/create-qr-code/?size=512x512&data={urllib.parse.quote(text, safe='')}"
        req = urllib.request.Request(qr_api_url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status == 200:
                img_bytes = resp.read()
                b64 = base64.b64encode(img_bytes).decode("ascii")
                mime = resp.headers.get("Content-Type", "image/png")
                return f"data:{mime};base64,{b64}"
    except Exception as e:
        print(f"  ! QR API failed for '{text}': {e}")
    return ""


def upload_to_storage(bucket, path, data_url):
    """Upload a data: URL to Supabase Storage and return the public URL."""
    if not data_url.startswith("data:"):
        return None
    header, b64 = data_url.split(",", 1)
    mime = header.split(":")[1].split(";")[0]
    img_bytes = base64.b64decode(b64)

    upload_url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
    req = urllib.request.Request(
        upload_url,
        data=img_bytes,
        method="POST",
        headers={
            "apikey": SERVICE_ROLE,
            "Authorization": f"Bearer {SERVICE_ROLE}",
            "Content-Type": mime,
            "x-upsert": "true",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            if resp.status in (200, 201):
                public_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"
                return public_url
    except urllib.error.HTTPError as e:
        print(f"  ! Storage upload failed ({e.code}): {e.read().decode('utf-8', errors='replace')[:200]}")
    except Exception as e:
        print(f"  ! Storage upload error: {e}")
    return None


def update_wallet_qr(wallet_id, qr_url):
    payload = json.dumps({"qr_code_url": qr_url, "updated_at": datetime.now(timezone.utc).isoformat()}).encode("utf-8")
    status, body = http_request(
        f"{SUPABASE_URL}/rest/v1/wallet_addresses?id=eq.{wallet_id}",
        method="PATCH",
        data=payload,
    )
    return status


def main():
    print("=" * 60)
    print("South Wallet v2 -- Database Seeding")
    print("=" * 60)

    print("\n[1] Seeding banks table...")
    existing = fetch_existing_banks()
    print(f"  Current banks count: {len(existing)}")
    existing_names = {b["bank_name"] for b in existing}

    inserted = 0
    for bank_name, acct_name, acct_num, iban, swift in YEMENI_BANKS:
        if bank_name in existing_names:
            print(f"  - skip (exists): {bank_name}")
            continue
        status, body = insert_bank(bank_name, acct_name, acct_num, iban, swift)
        if status in (200, 201):
            inserted += 1
            print(f"  + inserted: {bank_name}")
        else:
            print(f"  ! FAILED ({status}): {bank_name}: {body[:200]}")
    print(f"  Done. Inserted {inserted} new banks.")

    print("\n[2] Generating QR codes for wallet_addresses...")
    wallets = fetch_wallet_addresses()
    print(f"  Found {len(wallets)} wallet addresses")
    for w in wallets:
        if w.get("qr_code_url"):
            print(f"  - skip (has QR): {w['network']} {w['address'][:20]}...")
            continue
        qr_data_url = generate_qr_data_url(w["address"])
        if not qr_data_url:
            print(f"  ! no QR generated for {w['network']}")
            continue
        ext = "png"
        path = f"wallet-qr/{w['network']}-{w['id']}.{ext}"
        public_url = upload_to_storage("Wallet", path, qr_data_url)
        if not public_url:
            public_url = qr_data_url
            print(f"  ~ using data URL fallback for {w['network']}")
        status = update_wallet_qr(w["id"], public_url)
        if status in (200, 204):
            print(f"  + updated QR for: {w['network']} {w['address'][:20]}...")
        else:
            print(f"  ! FAILED to update {w['network']} (status {status})")

    print("\n" + "=" * 60)
    print("Seeding complete.")
    print("=" * 60)


if __name__ == "__main__":
    main()
