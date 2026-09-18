"""Local SHAKALPA server: static site, SQLite accounts, and session-based authentication.

Run with: python server.py
Then open: http://localhost:8080
"""
from __future__ import annotations

import base64
import argparse
import binascii
import getpass
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import smtplib
import sqlite3
import threading
import time
import urllib.error
import urllib.request
from email.message import EmailMessage
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse

ROOT = Path(__file__).resolve().parent
DATABASE = ROOT / "nexahub.db"
UPLOADS = ROOT / "uploads"
# Bind to the LAN so devices on the same private Wi-Fi can use the local preview.
# Firewall access is restricted to the Private profile by the launch instructions.
HOST, PORT = "0.0.0.0", 8080
MAX_BODY_BYTES = 56_000_000
MAX_IMAGE_BYTES = 2 * 1024 * 1024
MAX_CERTIFICATE_BYTES = 1_500_000
MAX_CERTIFICATE_DOCUMENTS = 4
MAX_IDENTITY_DOCUMENT_BYTES = 1_500_000
SESSION_AGE_SECONDS = 60 * 60 * 8
PBKDF2_ITERATIONS = 310_000
ROLES = {"Admin", "Employee", "Vendor", "Agent", "Customer"}
GOOGLE_SIGNIN_ROLES = {"Agent", "Vendor", "Customer"}
PUBLIC_SIGNUP_ROLES = {"Agent", "Vendor", "Customer"}
BUSINESS_TYPES = {"Retail", "Food & Beverage", "Beauty & Wellness", "Professional Services", "Home Services", "Health & Fitness", "Education & Training", "Events", "Hospitality & Travel", "Automotive", "Technology", "Manufacturing", "Other"}
SERVICE_TYPES = {"Consulting", "Repair & Maintenance", "Delivery & Logistics", "Design & Creative", "Marketing", "Cleaning", "Installation", "Beauty & Personal Care", "Catering", "Tutoring", "Event Services", "Fitness & Wellness", "IT & Technical Support", "Other"}
VENDOR_OPERATING_MODELS = {
    "listing": "Listing only",
    "leads": "Listing and lead generation",
    "bookings": "Booking marketplace",
    "marketplace": "Full marketplace with payments",
}
ADMIN_SETUP_KEY = os.getenv("NEXAHUB_SETUP_KEY", "")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", f"http://localhost:{PORT}/api/auth/google/callback")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
SMTP_HOST = os.getenv("SMTP_HOST", "")
try:
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
except ValueError:
    SMTP_PORT = 587
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "")
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
STATIC_EXTENSIONS = {".html", ".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".mp4", ".webm", ".ico"}
CURRENCY_CODES = {"INR", "USD", "EUR", "GBP", "AED", "SGD", "JPY"}
FX_RATE_CACHE: tuple[float, dict] | None = None
FX_RATE_CACHE_LOCK = threading.Lock()
METAL_RATE_CACHE: tuple[float, dict] | None = None
INDEX_RATE_CACHE: tuple[float, dict] | None = None
LEGAL_DOCUMENTS = {
    "/legal/privacy-policy": Path.home() / "Downloads" / "SHAKALPA_Privacy_Policy_India_Draft.docx",
    "/legal/terms-and-conditions": Path.home() / "Downloads" / "SHAKALPA_Terms_and_Conditions_India_Draft.docx",
    "/legal/vendor-agreement": Path.home() / "Downloads" / "SHAKALPA_Vendor_Agreement_India_Draft.docx",
}
NAME_PATTERN = re.compile(r"^[A-Za-zÀ-ÿ' -]{2,50}$")
PHONE_PATTERN = re.compile(r"^[0-9+() -]{7,20}$")
MEDIA_BLOCKED_TERMS = {
    "Adult or sexual content": ("porn", "pornography", "nude", "nudity", "explicit sex", "sexual assault"),
    "Violence or graphic harm": ("gore", "beheading", "murder video", "kill myself", "graphic violence", "torture"),
}

ROLE_ID_PREFIXES = {"Admin": "ADMN", "Employee": "EMPL", "Vendor": "VEND", "Agent": "AGNT", "Customer": "CUST"}


def distance_km(latitude_a: float, longitude_a: float, latitude_b: float, longitude_b: float) -> float:
    """Great-circle distance without retaining any more location precision than needed."""
    import math
    radius = 6371.0
    lat_delta = math.radians(latitude_b - latitude_a)
    lon_delta = math.radians(longitude_b - longitude_a)
    a = math.sin(lat_delta / 2) ** 2 + math.cos(math.radians(latitude_a)) * math.cos(math.radians(latitude_b)) * math.sin(lon_delta / 2) ** 2
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def id_fragment(value: str) -> str:
    """Return a stable four-character, uppercase fragment for human account IDs."""
    letters = re.sub(r"[^A-Za-z0-9]", "", value).upper()
    return (letters + "XXXX")[:4]


def assign_account_code(db: sqlite3.Connection, account_id: int, role: str, first_name: str, created_at: int, vendor_id: int | None = None) -> str:
    year = time.strftime("%Y", time.localtime(created_at))
    serial = f"{account_id:05d}"
    if vendor_id is not None:
        vendor = db.execute("SELECT COALESCE(v.business_name, a.first_name) AS name FROM accounts a LEFT JOIN vendor_profiles v ON v.account_id = a.id WHERE a.id = ?", (vendor_id,)).fetchone()
        vendor_name = vendor["name"] if vendor else "VEND"
        code = f"{id_fragment(vendor_name)}-{id_fragment(first_name)}-{year}-{serial}"
    else:
        code = f"SHA-{ROLE_ID_PREFIXES.get(role, 'USER')}-{id_fragment(first_name)}-{year}-{serial}"
    db.execute("UPDATE accounts SET account_code = ? WHERE id = ?", (code, account_id))
    return code


def connection() -> sqlite3.Connection:
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db


def init_database() -> None:
    UPLOADS.mkdir(exist_ok=True)
    with connection() as db:
        db.executescript(
            """
            PRAGMA foreign_keys = ON;
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT NOT NULL COLLATE NOCASE UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('Admin', 'Employee', 'Vendor', 'Agent', 'Customer')),
                created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                account_id INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
            CREATE TABLE IF NOT EXISTS oauth_states (
                state TEXT PRIMARY KEY,
                requested_role TEXT NOT NULL,
                expires_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS vendor_profiles (
                account_id INTEGER PRIMARY KEY,
                business_name TEXT NOT NULL,
                business_type TEXT NOT NULL,
                service_type TEXT NOT NULL,
                other_type TEXT,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS vendor_certificates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                original_name TEXT NOT NULL,
                storage_name TEXT NOT NULL UNIQUE,
                media_type TEXT NOT NULL,
                uploaded_at INTEGER NOT NULL,
                FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS vendor_certificates_account_idx ON vendor_certificates(account_id, uploaded_at DESC);
            CREATE TABLE IF NOT EXISTS account_identity_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                document_type TEXT NOT NULL CHECK(document_type IN ('aadhaar', 'pan_card', 'live_photo', 'msme_certificate')),
                original_name TEXT NOT NULL,
                storage_name TEXT NOT NULL UNIQUE,
                media_type TEXT NOT NULL,
                uploaded_at INTEGER NOT NULL,
                UNIQUE(account_id, document_type),
                FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS account_identity_documents_account_idx ON account_identity_documents(account_id, uploaded_at DESC);
            CREATE TABLE IF NOT EXISTS vendor_compliance_details (
                account_id INTEGER PRIMARY KEY,
                tan_details TEXT,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS vendor_operating_models (
                account_id INTEGER PRIMARY KEY,
                operating_model TEXT NOT NULL CHECK(operating_model IN ('listing', 'leads', 'bookings', 'marketplace')),
                updated_at INTEGER NOT NULL,
                FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS vendor_marketplace_setups (
                account_id INTEGER PRIMARY KEY,
                bank_account_holder TEXT NOT NULL,
                bank_account_last4 TEXT NOT NULL,
                ifsc_code TEXT NOT NULL,
                tax_registration TEXT,
                fulfilment_method TEXT NOT NULL,
                cancellation_policy TEXT NOT NULL,
                refund_policy TEXT NOT NULL,
                agreement_accepted_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS vendor_operating_setups (
                account_id INTEGER NOT NULL,
                operating_model TEXT NOT NULL CHECK(operating_model IN ('listing', 'leads', 'bookings')),
                setup_json TEXT NOT NULL,
                completed_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                PRIMARY KEY(account_id, operating_model),
                FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS vendor_profile_changes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                business_name TEXT NOT NULL,
                business_type TEXT NOT NULL,
                service_type TEXT NOT NULL,
                other_type TEXT,
                owner_image_path TEXT,
                address_line1 TEXT NOT NULL,
                address_line2 TEXT,
                city TEXT NOT NULL,
                state TEXT NOT NULL,
                postal_code TEXT NOT NULL,
                country TEXT NOT NULL,
                gst_number TEXT,
                fssai_certificate TEXT,
                vehicle_registration TEXT,
                insurance_details TEXT,
                other_certificates TEXT,
                approval_status TEXT NOT NULL DEFAULT 'Draft',
                submitted_at INTEGER,
                reviewed_by INTEGER,
                reviewed_at INTEGER,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
                FOREIGN KEY(reviewed_by) REFERENCES accounts(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS vendor_profile_changes_review_idx ON vendor_profile_changes(account_id, approval_status, updated_at DESC);
            CREATE TABLE IF NOT EXISTS admin_vendor_access_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_account_id INTEGER NOT NULL,
                vendor_account_id INTEGER NOT NULL,
                accessed_at INTEGER NOT NULL,
                FOREIGN KEY(admin_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
                FOREIGN KEY(vendor_account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS admin_vendor_access_log_vendor_idx ON admin_vendor_access_log(vendor_account_id, accessed_at DESC);
            CREATE TABLE IF NOT EXISTS admin_vendor_view_tokens (
                token_hash TEXT PRIMARY KEY,
                admin_account_id INTEGER NOT NULL,
                vendor_account_id INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(admin_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
                FOREIGN KEY(vendor_account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS admin_vendor_view_tokens_expiry_idx ON admin_vendor_view_tokens(expires_at);
            CREATE TABLE IF NOT EXISTS vendor_document_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                requested_by INTEGER NOT NULL,
                message TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Open',
                requested_at INTEGER NOT NULL,
                resolved_at INTEGER,
                email_sent INTEGER NOT NULL DEFAULT 0,
                sms_sent INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
                FOREIGN KEY(requested_by) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS vendor_document_requests_account_idx ON vendor_document_requests(account_id, status, requested_at DESC);
            CREATE TABLE IF NOT EXISTS payment_settings (
                setting_key TEXT PRIMARY KEY,
                setting_value TEXT NOT NULL,
                updated_by INTEGER,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY(updated_by) REFERENCES accounts(id) ON DELETE SET NULL
            );
            CREATE TABLE IF NOT EXISTS vendor_registration_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                provider_order_id TEXT NOT NULL UNIQUE,
                amount_paise INTEGER NOT NULL,
                currency TEXT NOT NULL DEFAULT 'INR',
                status TEXT NOT NULL DEFAULT 'Created',
                provider_payment_id TEXT,
                verified_at INTEGER,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS vendor_registration_payments_account_idx ON vendor_registration_payments(account_id, status, created_at DESC);
            CREATE TABLE IF NOT EXISTS vendor_products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                product_description TEXT NOT NULL,
                cost_paise INTEGER NOT NULL,
                tax_details TEXT,
                available_quantity INTEGER NOT NULL,
                delivery_charges_paise INTEGER NOT NULL,
                self_delivery INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'Awaiting payment',
                created_at INTEGER NOT NULL,
                published_at INTEGER,
                FOREIGN KEY(vendor_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS vendor_products_vendor_idx ON vendor_products(vendor_id, status, created_at DESC);
            CREATE TABLE IF NOT EXISTS product_reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                customer_id INTEGER NOT NULL,
                rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
                review_text TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                UNIQUE(product_id, customer_id),
                FOREIGN KEY(product_id) REFERENCES vendor_products(id) ON DELETE CASCADE,
                FOREIGN KEY(customer_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS product_reviews_product_idx ON product_reviews(product_id, created_at DESC);
            CREATE TABLE IF NOT EXISTS product_review_replies (
                review_id INTEGER PRIMARY KEY,
                vendor_id INTEGER NOT NULL,
                reply_text TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY(review_id) REFERENCES product_reviews(id) ON DELETE CASCADE,
                FOREIGN KEY(vendor_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS product_review_reactions (
                review_id INTEGER NOT NULL,
                customer_id INTEGER NOT NULL,
                reaction TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                PRIMARY KEY(review_id, customer_id),
                FOREIGN KEY(review_id) REFERENCES product_reviews(id) ON DELETE CASCADE,
                FOREIGN KEY(customer_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS product_review_reactions_review_idx ON product_review_reactions(review_id);
            CREATE TABLE IF NOT EXISTS customer_review_eligibility (
                product_id INTEGER NOT NULL,
                customer_id INTEGER NOT NULL,
                source_type TEXT NOT NULL CHECK(source_type IN ('Purchase', 'Service completed')),
                verified_at INTEGER NOT NULL,
                PRIMARY KEY(product_id, customer_id),
                FOREIGN KEY(product_id) REFERENCES vendor_products(id) ON DELETE CASCADE,
                FOREIGN KEY(customer_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS customer_review_eligibility_customer_idx ON customer_review_eligibility(customer_id, product_id);
            CREATE TABLE IF NOT EXISTS contact_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                contact_number TEXT NOT NULL,
                email TEXT NOT NULL,
                enquiry_for TEXT NOT NULL,
                email_sent INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS contact_messages_created_idx ON contact_messages(created_at DESC);
            CREATE TABLE IF NOT EXISTS support_tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, requester_name TEXT NOT NULL, requester_email TEXT NOT NULL, requester_phone TEXT NOT NULL, support_type TEXT NOT NULL, support_for TEXT NOT NULL, vendor_id INTEGER, requester_token_hash TEXT NOT NULL, created_at INTEGER NOT NULL, FOREIGN KEY(vendor_id) REFERENCES accounts(id) ON DELETE SET NULL);
            CREATE TABLE IF NOT EXISTS support_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL, sender_name TEXT NOT NULL, sender_role TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL, FOREIGN KEY(ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE);
            CREATE INDEX IF NOT EXISTS support_messages_ticket_idx ON support_messages(ticket_id, created_at);
            CREATE TABLE IF NOT EXISTS vendor_staff (
                account_id INTEGER PRIMARY KEY,
                vendor_id INTEGER NOT NULL,
                can_add_products INTEGER NOT NULL DEFAULT 0,
                can_edit_products INTEGER NOT NULL DEFAULT 0,
                active INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
                FOREIGN KEY(vendor_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS vendor_staff_vendor_idx ON vendor_staff(vendor_id, active, created_at DESC);
            CREATE TABLE IF NOT EXISTS blood_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                requester_id INTEGER NOT NULL,
                blood_group TEXT NOT NULL,
                units INTEGER NOT NULL,
                hospital_details TEXT NOT NULL,
                reason TEXT NOT NULL,
                contact_details TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'Open',
                created_at INTEGER NOT NULL,
                FOREIGN KEY(requester_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS blood_request_interests (
                request_id INTEGER NOT NULL,
                donor_id INTEGER NOT NULL,
                interested INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                PRIMARY KEY(request_id, donor_id),
                FOREIGN KEY(request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
                FOREIGN KEY(donor_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS product_taxonomy (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                main_category TEXT NOT NULL COLLATE NOCASE,
                subcategory TEXT NOT NULL COLLATE NOCASE,
                active INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL,
                UNIQUE(main_category, subcategory)
            );
            CREATE TABLE IF NOT EXISTS product_taxonomy_services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                taxonomy_id INTEGER NOT NULL,
                service_name TEXT NOT NULL COLLATE NOCASE,
                service_kind TEXT NOT NULL,
                search_keywords TEXT NOT NULL DEFAULT '',
                active INTEGER NOT NULL DEFAULT 1,
                UNIQUE(taxonomy_id, service_name),
                FOREIGN KEY(taxonomy_id) REFERENCES product_taxonomy(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS vendor_product_change_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor_id INTEGER NOT NULL,
                product_id INTEGER,
                request_type TEXT NOT NULL CHECK(request_type IN ('Add', 'Edit')),
                proposed_data TEXT NOT NULL,
                requested_by INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'Pending',
                reviewed_by INTEGER,
                reviewed_at INTEGER,
                review_note TEXT,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(vendor_id) REFERENCES accounts(id) ON DELETE CASCADE,
                FOREIGN KEY(product_id) REFERENCES vendor_products(id) ON DELETE SET NULL,
                FOREIGN KEY(requested_by) REFERENCES accounts(id) ON DELETE CASCADE,
                FOREIGN KEY(reviewed_by) REFERENCES accounts(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS vendor_product_changes_vendor_idx ON vendor_product_change_requests(vendor_id, status, created_at DESC);
            CREATE TABLE IF NOT EXISTS product_media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                storage_name TEXT NOT NULL UNIQUE,
                media_type TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(product_id) REFERENCES vendor_products(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS product_entry_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL UNIQUE,
                vendor_id INTEGER NOT NULL,
                provider_order_id TEXT NOT NULL UNIQUE,
                amount_paise INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'Created',
                provider_payment_id TEXT,
                verified_at INTEGER,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(product_id) REFERENCES vendor_products(id) ON DELETE CASCADE,
                FOREIGN KEY(vendor_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            """
        )
        profile_columns = {row["name"] for row in db.execute("PRAGMA table_info(vendor_profiles)")}
        migrations = {"owner_image_path": "TEXT", "address_line1": "TEXT", "address_line2": "TEXT", "city": "TEXT", "state": "TEXT", "postal_code": "TEXT", "country": "TEXT", "gst_number": "TEXT", "fssai_certificate": "TEXT", "vehicle_registration": "TEXT", "insurance_details": "TEXT", "other_certificates": "TEXT", "approval_status": "TEXT NOT NULL DEFAULT 'Draft'", "submitted_at": "INTEGER", "reviewed_by": "INTEGER", "reviewed_at": "INTEGER"}
        for column, definition in migrations.items():
            if column not in profile_columns:
                db.execute(f"ALTER TABLE vendor_profiles ADD COLUMN {column} {definition}")
        product_columns = {row["name"] for row in db.execute("PRAGMA table_info(vendor_products)")}
        for column, definition in {"product_category": "TEXT NOT NULL DEFAULT ''", "product_type": "TEXT NOT NULL DEFAULT ''", "search_keywords": "TEXT NOT NULL DEFAULT ''", "product_specifications": "TEXT NOT NULL DEFAULT ''", "customer_actions": "TEXT NOT NULL DEFAULT '[\"Buy\"]'"}.items():
            if column not in product_columns:
                db.execute(f"ALTER TABLE vendor_products ADD COLUMN {column} {definition}")
        account_columns = {row["name"] for row in db.execute("PRAGMA table_info(accounts)")}
        if "account_code" not in account_columns:
            db.execute("ALTER TABLE accounts ADD COLUMN account_code TEXT")
        if "blood_donor_status" not in account_columns:
            db.execute("ALTER TABLE accounts ADD COLUMN blood_donor_status TEXT NOT NULL DEFAULT 'Decide later'")
        if "blood_latitude" not in account_columns:
            db.execute("ALTER TABLE accounts ADD COLUMN blood_latitude REAL")
        if "blood_longitude" not in account_columns:
            db.execute("ALTER TABLE accounts ADD COLUMN blood_longitude REAL")
        service_columns = {row["name"] for row in db.execute("PRAGMA table_info(product_taxonomy_services)")}
        if "search_keywords" not in service_columns:
            db.execute("ALTER TABLE product_taxonomy_services ADD COLUMN search_keywords TEXT NOT NULL DEFAULT ''")
        staff_columns = {row["name"] for row in db.execute("PRAGMA table_info(vendor_staff)")}
        if "offboarded_at" not in staff_columns:
            db.execute("ALTER TABLE vendor_staff ADD COLUMN offboarded_at INTEGER")
        legacy_accounts = db.execute("SELECT id, first_name, role, created_at FROM accounts WHERE account_code IS NULL OR account_code = ''").fetchall()
        for account in legacy_accounts:
            staff = db.execute("SELECT vendor_id FROM vendor_staff WHERE account_id = ?", (account["id"],)).fetchone()
            assign_account_code(db, account["id"], account["role"], account["first_name"], account["created_at"], staff["vendor_id"] if staff else None)


def create_staff_account(role: str, first_name: str, last_name: str, phone: str, email: str) -> None:
    """Create a staff account locally. Password input is hidden by getpass."""
    password = getpass.getpass("Password (8–128 characters): ")
    confirmation = getpass.getpass("Confirm password: ")
    account, error = validate_signup({
        "firstName": first_name,
        "lastName": last_name,
        "phone": phone,
        "email": email,
        "password": password,
        "confirmPassword": confirmation,
    })
    if error:
        raise SystemExit(f"Account was not created: {error}")
    try:
        with connection() as db:
            now = int(time.time())
            cursor = db.execute(
                "INSERT INTO accounts (first_name, last_name, phone, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (account["first_name"], account["last_name"], account["phone"], account["email"], hash_password(account["password"]), role, now),
            )
            assign_account_code(db, cursor.lastrowid, role, account["first_name"], now)
    except sqlite3.IntegrityError:
        raise SystemExit("Account was not created: an account already exists for that email.")
    print(f"Created {role} account for {account['email']}.")


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, iterations, salt_b64, digest_b64 = stored.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_b64)
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
        return hmac.compare_digest(candidate, base64.b64decode(digest_b64))
    except (ValueError, TypeError):
        return False


def validate_signup(data: dict) -> tuple[dict | None, str | None]:
    first_name = str(data.get("firstName", "")).strip()
    last_name = str(data.get("lastName", "")).strip()
    phone = str(data.get("phone", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    confirmation = str(data.get("confirmPassword", ""))
    if not NAME_PATTERN.fullmatch(first_name) or not NAME_PATTERN.fullmatch(last_name):
        return None, "Enter a valid first and last name."
    if not PHONE_PATTERN.fullmatch(phone):
        return None, "Enter a valid contact number."
    if len(email) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        return None, "Enter a valid email address."
    if not 12 <= len(password) <= 128:
        return None, "Password must contain 12 to 128 characters."
    if not (re.search(r"[a-z]", password) and re.search(r"[A-Z]", password) and re.search(r"\d", password) and re.search(r"[^A-Za-z0-9]", password)):
        return None, "Password needs uppercase, lowercase, number, and special character."
    if not hmac.compare_digest(password, confirmation):
        return None, "Passwords do not match."
    return {"first_name": first_name, "last_name": last_name, "phone": phone, "email": email, "password": password}, None


class SHAKALPAHandler(SimpleHTTPRequestHandler):
    server_version = "SHAKALPA/1.0"

    def log_message(self, format: str, *args) -> None:
        # Avoid emitting request payloads or credentials into local logs.
        print(f"[{self.log_date_time_string()}] {self.command} {self.path} {args[1] if len(args) > 1 else ''}")

    def do_POST(self) -> None:
        if self.path == "/api/signup":
            self.signup()
        elif self.path == "/api/setup-admin":
            self.setup_admin()
        elif self.path == "/api/signin":
            self.signin()
        elif self.path == "/api/signout":
            self.signout()
        elif self.path == "/api/contact":
            self.contact_submit()
        elif self.path == "/api/support":
            self.support_submit()
        elif self.path == "/api/support/messages":
            self.support_send_message()
        elif self.path == "/api/admin/accounts":
            self.admin_create_account()
        elif self.path == "/api/employee/accounts":
            self.employee_create_account()
        elif self.path == "/api/agent/vendors":
            self.agent_create_vendor()
        elif self.path == "/api/vendor/profile":
            self.vendor_save_profile()
        elif self.path == "/api/vendor/operating-model":
            self.vendor_save_operating_model()
        elif self.path == "/api/vendor/marketplace-setup":
            self.vendor_save_marketplace_setup()
        elif self.path == "/api/vendor/operating-setup":
            self.vendor_save_operating_setup()
        elif self.path == "/api/reviews/vendor-approve":
            self.approve_vendor_profile()
        elif self.path == "/api/reviews/request-documents":
            self.request_vendor_documents()
        elif self.path == "/api/admin/payment-settings":
            self.admin_save_payment_settings()
        elif self.path == "/api/admin/market-rates":
            self.admin_save_market_rates()
        elif self.path == "/api/admin/vendor-login":
            self.admin_vendor_login()
        elif self.path == "/api/vendor/registration-payment/order":
            self.vendor_create_registration_order()
        elif self.path == "/api/vendor/registration-payment/verify":
            self.vendor_verify_registration_payment()
        elif self.path == "/api/vendor/combined-payment/order":
            self.vendor_create_combined_payment_order()
        elif self.path == "/api/vendor/combined-payment/verify":
            self.vendor_verify_combined_payment()
        elif self.path == "/api/vendor/products":
            self.vendor_create_product()
        elif self.path == "/api/vendor/products/update":
            self.vendor_update_product()
        elif self.path == "/api/vendor/staff":
            self.vendor_create_staff()
        elif self.path == "/api/vendor/staff/offboard":
            self.vendor_offboard_staff()
        elif self.path == "/api/vendor/product-change-requests/review":
            self.vendor_review_product_change()
        elif self.path == "/api/media/posts":
            self.media_create_post()
        elif self.path == "/api/media/posts/delete":
            self.media_delete_post()
        elif self.path == "/api/media/posts/update":
            self.media_update_post()
        elif self.path == "/api/media/like":
            self.media_toggle_like()
        elif self.path == "/api/media/comment":
            self.media_add_comment()
        elif self.path == "/api/media/messages":
            self.media_send_message()
        elif self.path == "/api/media/follow":
            self.media_toggle_follow()
        elif self.path == "/api/media/save":
            self.media_toggle_save()
        elif self.path == "/api/media/report":
            self.media_report_post()
        elif self.path == "/api/media/save-tags":
            self.media_create_save_tag()
        elif self.path == "/api/product-reviews":
            self.create_product_review()
        elif self.path == "/api/product-reviews/reply":
            self.reply_to_product_review()
        elif self.path == "/api/product-reviews/reaction":
            self.react_to_product_review()
        elif self.path == "/api/media/saved/tags":
            self.media_set_saved_post_tags()
        elif self.path == "/api/vendor/jobs":
            self.vendor_create_job()
        elif self.path == "/api/jobs/apply":
            self.job_apply()
        elif self.path == "/api/blood/requests":
            self.blood_create_request()
        elif self.path == "/api/blood/preference":
            self.blood_update_preference()
        elif self.path == "/api/blood/location":
            self.blood_update_location()
        elif self.path == "/api/blood/interest":
            self.blood_respond_interest()
        elif self.path == "/api/admin/taxonomy":
            self.admin_save_taxonomy()
        elif self.path == "/api/vendor/product-payment/order":
            self.vendor_create_product_order()
        elif self.path == "/api/vendor/product-payment/verify":
            self.vendor_verify_product_payment()
        else:
            self.send_json({"error": "Not found."}, HTTPStatus.NOT_FOUND)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/auth/google":
            self.google_auth_start(parsed)
            return
        if parsed.path == "/api/auth/google/callback":
            self.google_auth_callback(parsed)
            return
        if parsed.path in LEGAL_DOCUMENTS:
            self.legal_document(parsed.path)
            return
        if self.path == "/api/session":
            self.session_status()
            return
        if self.path == "/api/support/vendors":
            self.support_vendors()
            return
        if parsed.path == "/api/support/messages":
            self.support_messages(parsed)
            return
        if self.path == "/api/admin/accounts":
            self.admin_list_accounts()
            return
        if self.path == "/api/admin/payment-settings":
            self.admin_payment_settings()
            return
        if self.path == "/api/market-rates":
            self.market_rates()
            return
        if parsed.path == "/api/currency-rate":
            self.currency_rate(parsed)
            return
        if self.path == "/api/metal-rates":
            self.metal_rates()
            return
        if self.path == "/api/index-rates":
            self.index_rates()
            return
        if self.path == "/api/admin/market-rates":
            self.admin_market_rates()
            return
        if self.path == "/api/admin/approved-vendors":
            self.admin_approved_vendors()
            return
        if self.path == "/api/employee/accounts":
            self.employee_list_accounts()
            return
        if self.path == "/api/agent/vendors":
            self.agent_list_vendors()
            return
        if self.path == "/api/vendor/profile":
            self.vendor_profile()
            return
        if self.path == "/api/vendor/marketplace-setup":
            self.vendor_marketplace_setup()
            return
        if self.path == "/api/vendor/operating-setup":
            self.vendor_operating_setup()
            return
        if self.path == "/api/vendor/registration-payment":
            self.vendor_registration_payment()
            return
        if self.path == "/api/vendor/payment-summary":
            self.vendor_payment_summary()
            return
        if self.path == "/api/vendor/products":
            self.vendor_products()
            return
        if self.path == "/api/vendor/staff":
            self.vendor_staff()
            return
        if self.path == "/api/vendor/product-change-requests":
            self.vendor_product_change_requests()
            return
        if self.path == "/api/vendor/jobs":
            self.vendor_jobs()
            return
        if self.path == "/api/jobs":
            self.public_jobs()
            return
        if self.path == "/api/products":
            self.public_products()
            return
        if parsed.path == "/api/product-reviews":
            self.product_reviews(parsed)
            return
        if self.path == "/api/blood/notifications":
            self.blood_notifications()
            return
        if self.path == "/api/taxonomy":
            self.product_taxonomy()
            return
        if self.path == "/api/admin/taxonomy":
            self.admin_taxonomy()
            return
        if self.path == "/api/media/posts":
            self.media_posts()
            return
        if parsed.path == "/api/media/messages":
            self.media_messages(parsed)
            return
        if self.path == "/api/media/saved":
            self.media_saved_posts()
            return
        if self.path == "/api/vendor/media":
            self.vendor_media_posts()
            return
        if self.path == "/api/vendor/maps-config":
            self.vendor_maps_config()
            return
        if parsed.path == "/api/vendor/certificate":
            self.vendor_certificate_download(parsed)
            return
        if self.path == "/api/reviews/vendor-profiles":
            self.vendor_review_queue()
            return
        if parsed.path == "/api/reviews/vendor-certificate":
            self.reviewer_certificate_download(parsed)
            return
        path = urlparse(self.path).path
        if path == "/":
            path = "/index.html"
        candidate = (ROOT / path.lstrip("/")).resolve()
        if ROOT not in candidate.parents or not candidate.is_file() or candidate.suffix.lower() not in STATIC_EXTENSIONS:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        content_type = mimetypes.guess_type(str(candidate))[0] or "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8" if content_type.startswith("text/") else content_type)
        if candidate.suffix.lower() in {".html", ".css", ".js"}:
            self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Frame-Options", "DENY")
        self.end_headers()
        body = candidate.read_bytes()
        if candidate.suffix.lower() == ".html":
            body = body.replace(b"</body>", b'<link rel="stylesheet" href="theme.css"><script src="vendor-identity.js"></script><script src="vendor-taxonomy.js"></script><script src="field-help.js"></script><script src="legal-links.js"></script><script src="home-button.js"></script><script src="signout-button.js"></script><script src="mobile-menu.js"></script></body>')
        self.wfile.write(body)

    def legal_document(self, path: str) -> None:
        document = LEGAL_DOCUMENTS[path]
        if not document.is_file():
            self.send_json({"error": "The requested legal document is unavailable."}, HTTPStatus.NOT_FOUND)
            return
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        self.send_header("Content-Disposition", f'attachment; filename="{document.name}"')
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.end_headers()
        self.wfile.write(document.read_bytes())

    def google_auth_start(self, parsed) -> None:
        query = parse_qs(parsed.query)
        requested_role = query.get("role", [""])[0]
        if requested_role not in GOOGLE_SIGNIN_ROLES:
            self.send_redirect("/index.html?auth_error=google_role_not_allowed")
            return
        if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
            self.send_redirect("/index.html?auth_error=google_not_configured")
            return
        state = secrets.token_urlsafe(32)
        now = int(time.time())
        with connection() as db:
            db.execute("DELETE FROM oauth_states WHERE expires_at < ?", (now,))
            db.execute("INSERT INTO oauth_states (state, requested_role, expires_at) VALUES (?, ?, ?)", (state, requested_role, now + 600))
        parameters = urlencode({"client_id": GOOGLE_CLIENT_ID, "redirect_uri": GOOGLE_REDIRECT_URI, "response_type": "code", "scope": "openid email profile", "state": state, "prompt": "select_account"})
        self.send_redirect(f"https://accounts.google.com/o/oauth2/v2/auth?{parameters}")

    def google_auth_callback(self, parsed) -> None:
        query = parse_qs(parsed.query)
        code = query.get("code", [""])[0]
        state = query.get("state", [""])[0]
        if not code or not state:
            self.send_redirect("/index.html?auth_error=google_cancelled")
            return
        with connection() as db:
            stored = db.execute("SELECT requested_role FROM oauth_states WHERE state = ? AND expires_at > ?", (state, int(time.time()))).fetchone()
            db.execute("DELETE FROM oauth_states WHERE state = ?", (state,))
        if not stored:
            self.send_redirect("/index.html?auth_error=google_invalid_state")
            return
        try:
            token_request = urllib.request.Request("https://oauth2.googleapis.com/token", data=urlencode({"code": code, "client_id": GOOGLE_CLIENT_ID, "client_secret": GOOGLE_CLIENT_SECRET, "redirect_uri": GOOGLE_REDIRECT_URI, "grant_type": "authorization_code"}).encode("utf-8"), headers={"Content-Type": "application/x-www-form-urlencoded"}, method="POST")
            with urllib.request.urlopen(token_request, timeout=10) as response:
                token_data = json.loads(response.read().decode("utf-8"))
            access_token = token_data.get("access_token", "")
            profile_request = urllib.request.Request("https://openidconnect.googleapis.com/v1/userinfo", headers={"Authorization": f"Bearer {access_token}"})
            with urllib.request.urlopen(profile_request, timeout=10) as response:
                profile = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, urllib.error.HTTPError, ValueError, json.JSONDecodeError):
            self.send_redirect("/index.html?auth_error=google_failed")
            return
        email = str(profile.get("email", "")).strip().lower()
        if not email or not profile.get("email_verified"):
            self.send_redirect("/index.html?auth_error=google_email_unverified")
            return
        with connection() as db:
            account = db.execute("SELECT id, role FROM accounts WHERE email = ?", (email,)).fetchone()
        # Do not auto-create: phone number is required for every SHAKALPA account.
        if not account:
            self.send_redirect("/signup.html?google=phone_required")
            return
        if account["role"] != stored["requested_role"]:
            self.send_redirect("/index.html?auth_error=google_workspace_denied")
            return
        token = self.create_session(account["id"])
        destination = {"Agent": "/agent.html", "Vendor": "/index.html", "Customer": "/index.html"}[account["role"]]
        self.send_redirect(destination, cookie=token)

    def read_json(self) -> dict | None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return None
        if length <= 0 or length > MAX_BODY_BYTES or "application/json" not in self.headers.get("Content-Type", ""):
            return None
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            return payload if isinstance(payload, dict) else None
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None

    def identity_documents_from_signup(self, data: dict, role: str) -> tuple[list[dict], str | None, str | None]:
        """Validate private verification documents before an account is created."""
        if role not in {"Vendor", "Agent"}:
            return [], None, None
        raw_documents = data.get("identityDocuments")
        if not isinstance(raw_documents, dict):
            return [], None, "Upload your Aadhaar document, PAN card, and live photo."
        required = {
            "aadhaar": ("aadhaar", "Aadhaar document", {"application/pdf", "image/jpeg", "image/png", "image/webp"}),
            "panCard": ("pan_card", "PAN card", {"application/pdf", "image/jpeg", "image/png", "image/webp"}),
            "livePhoto": ("live_photo", "live photo", {"image/jpeg", "image/png", "image/webp"}),
        }
        optional = {"msmeCertificate": ("msme_certificate", "MSME certificate", {"application/pdf", "image/jpeg", "image/png", "image/webp"})}
        allowed_types = {
            "application/pdf": (b"%PDF-", ".pdf"),
            "image/jpeg": (b"\xff\xd8\xff", ".jpg"),
            "image/png": (b"\x89PNG\r\n\x1a\n", ".png"),
            "image/webp": (b"RIFF", ".webp"),
        }
        documents: list[dict] = []
        selected = dict(required)
        if role == "Vendor" and raw_documents.get("msmeCertificate") not in (None, ""):
            selected.update(optional)
        for source_key, (document_type, label, permitted_types) in selected.items():
            raw_document = raw_documents.get(source_key)
            if not isinstance(raw_document, dict):
                return [], None, f"Upload a valid {label}."
            original_name = Path(str(raw_document.get("name", ""))).name.strip()
            raw_content = raw_document.get("content")
            if not original_name or len(original_name) > 120 or not isinstance(raw_content, str):
                return [], None, f"{label} needs a valid file name."
            try:
                header, encoded = raw_content.split(",", 1)
                mime = header.removeprefix("data:").removesuffix(";base64")
                document_bytes = base64.b64decode(encoded, validate=True)
            except (ValueError, binascii.Error):
                return [], None, f"{label} could not be read."
            if not header.endswith(";base64") or mime not in permitted_types or not document_bytes or len(document_bytes) > MAX_IDENTITY_DOCUMENT_BYTES:
                return [], None, f"{label} must be a permitted file smaller than 1.5 MB."
            signature, _ = allowed_types[mime]
            if not document_bytes.startswith(signature) or (mime == "image/webp" and document_bytes[8:12] != b"WEBP"):
                return [], None, f"{label} file content does not match its type."
            documents.append({"documentType": document_type, "originalName": original_name, "mediaType": mime, "bytes": document_bytes})
        tan_details = str(data.get("tanDetails", "")).strip().upper() if role == "Vendor" else ""
        if tan_details and not re.fullmatch(r"[A-Z]{4}[0-9]{5}[A-Z]", tan_details):
            return [], None, "Enter a valid 10-character TAN or leave it blank."
        return documents, tan_details or None, None

    def save_identity_documents(self, db: sqlite3.Connection, account_id: int, documents: list[dict], tan_details: str | None) -> None:
        """Store verification files with non-public names; no raw ID number is collected."""
        written: list[Path] = []
        try:
            now = int(time.time())
            rows = []
            for document in documents:
                storage_name = f"identity-{secrets.token_hex(20)}.private"
                path = UPLOADS / storage_name
                path.write_bytes(document["bytes"])
                written.append(path)
                rows.append((account_id, document["documentType"], document["originalName"], storage_name, document["mediaType"], now))
            db.executemany("INSERT INTO account_identity_documents (account_id, document_type, original_name, storage_name, media_type, uploaded_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(account_id, document_type) DO UPDATE SET original_name = excluded.original_name, storage_name = excluded.storage_name, media_type = excluded.media_type, uploaded_at = excluded.uploaded_at", rows)
            if tan_details is not None:
                db.execute("INSERT INTO vendor_compliance_details (account_id, tan_details, updated_at) VALUES (?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET tan_details = excluded.tan_details, updated_at = excluded.updated_at", (account_id, tan_details, now))
        except Exception:
            for path in written:
                path.unlink(missing_ok=True)
            raise

    def origin_is_valid(self) -> bool:
        origin = self.headers.get("Origin")
        return not origin or origin == f"http://{self.headers.get('Host')}"

    def signup(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        data = self.read_json()
        if data is None:
            self.send_json({"error": "Invalid request."}, HTTPStatus.BAD_REQUEST)
            return
        account, error = validate_signup(data)
        if error:
            self.send_json({"error": error}, HTTPStatus.BAD_REQUEST)
            return
        role = str(data.get("role", "Customer")).strip()
        if role not in PUBLIC_SIGNUP_ROLES:
            self.send_json({"error": "Choose Customer, Vendor, or Agent for signup."}, HTTPStatus.BAD_REQUEST)
            return
        identity_documents, tan_details, identity_error = ([], None, None)
        if role == "Agent":
            identity_documents, tan_details, identity_error = self.identity_documents_from_signup(data, role)
            if identity_error:
                self.send_json({"error": identity_error}, HTTPStatus.BAD_REQUEST)
                return
        try:
            with connection() as db:
                now = int(time.time())
                cursor = db.execute("INSERT INTO accounts (first_name, last_name, phone, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", (account["first_name"], account["last_name"], account["phone"], account["email"], hash_password(account["password"]), role, now))
                self.save_identity_documents(db, cursor.lastrowid, identity_documents, tan_details)
                donor_status = str(data.get("donorStatus", "Decide later")).strip()
                if donor_status not in {"Yes", "No", "Decide later"}: donor_status = "Decide later"
                db.execute("UPDATE accounts SET blood_donor_status = ? WHERE id = ?", (donor_status, cursor.lastrowid))
                assign_account_code(db, cursor.lastrowid, role, account["first_name"], now)
        except sqlite3.IntegrityError:
            self.send_json({"error": "An account already exists for that email."}, HTTPStatus.CONFLICT)
            return
        self.send_json({"message": "Account created. You can now sign in."}, HTTPStatus.CREATED)

    def setup_admin(self) -> None:
        """One-time local admin setup, protected by a server-side setup key."""
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        if not ADMIN_SETUP_KEY:
            self.send_json({"error": "Admin setup is not enabled. Configure NEXAHUB_SETUP_KEY before starting the server."}, HTTPStatus.SERVICE_UNAVAILABLE)
            return
        data = self.read_json()
        if data is None:
            self.send_json({"error": "Invalid request."}, HTTPStatus.BAD_REQUEST)
            return
        if not hmac.compare_digest(str(data.get("setupKey", "")), ADMIN_SETUP_KEY):
            self.send_json({"error": "Invalid setup key."}, HTTPStatus.FORBIDDEN)
            return
        account, error = validate_signup(data)
        if error:
            self.send_json({"error": error}, HTTPStatus.BAD_REQUEST)
            return
        try:
            with connection() as db:
                existing_admin = db.execute("SELECT 1 FROM accounts WHERE role = 'Admin' LIMIT 1").fetchone()
                if existing_admin:
                    self.send_json({"error": "An Admin account already exists. Use an authenticated admin workflow to create staff accounts."}, HTTPStatus.CONFLICT)
                    return
                now = int(time.time())
                cursor = db.execute("INSERT INTO accounts (first_name, last_name, phone, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", (account["first_name"], account["last_name"], account["phone"], account["email"], hash_password(account["password"]), "Admin", now))
                assign_account_code(db, cursor.lastrowid, "Admin", account["first_name"], now)
        except sqlite3.IntegrityError:
            self.send_json({"error": "An account already exists for that email."}, HTTPStatus.CONFLICT)
            return
        self.send_json({"message": "Admin account created. Admin setup is now locked."}, HTTPStatus.CREATED)

    def signin(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        data = self.read_json()
        if data is None:
            self.send_json({"error": "Invalid request."}, HTTPStatus.BAD_REQUEST)
            return
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))
        requested_role = str(data.get("role", "")).strip()
        if not email or not password or (requested_role and requested_role not in ROLES):
            self.send_json({"error": "Invalid email, password, or workspace."}, HTTPStatus.BAD_REQUEST)
            return
        with connection() as db:
            account = db.execute("SELECT id, first_name, role, password_hash FROM accounts WHERE email = ?", (email,)).fetchone()
            if not account or not verify_password(password, account["password_hash"]):
                self.send_json({"error": "Invalid email or password."}, HTTPStatus.UNAUTHORIZED)
                return
            if requested_role and account["role"] != requested_role:
                self.send_json({"error": "This account does not have access to that workspace."}, HTTPStatus.FORBIDDEN)
                return
            raw_token = self.create_session(account["id"], db)
        self.send_json({"message": "Signed in.", "account": {"firstName": account["first_name"], "role": account["role"]}}, cookie=raw_token)

    def signout(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        view_token = self.headers.get("X-SHAKALPA-Admin-Vendor-View", "")
        if view_token:
            with connection() as db:
                db.execute("DELETE FROM admin_vendor_view_tokens WHERE token_hash = ?", (hashlib.sha256(view_token.encode()).hexdigest(),))
            self.send_json({"message": "Admin Vendor view closed."})
            return
        token = self.session_token()
        if token:
            with connection() as db:
                db.execute("DELETE FROM sessions WHERE token_hash = ?", (hashlib.sha256(token.encode()).hexdigest(),))
        self.send_json({"message": "Signed out."}, clear_cookie=True)

    def contact_submit(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        data = self.read_json()
        if data is None:
            self.send_json({"error": "Invalid contact request."}, HTTPStatus.BAD_REQUEST)
            return
        full_name = str(data.get("name", "")).strip()
        contact_number = str(data.get("contactNumber", "")).strip()
        email_address = str(data.get("email", "")).strip().lower()
        enquiry_for = str(data.get("contactFor", "")).strip()
        if not re.fullmatch(r"[A-Za-zÀ-ÿ' -]{2,100}", full_name) or not PHONE_PATTERN.fullmatch(contact_number) or len(email_address) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email_address) or not 2 <= len(enquiry_for) <= 250:
            self.send_json({"error": "Enter a valid name, contact number, email address, and enquiry."}, HTTPStatus.BAD_REQUEST)
            return
        now = int(time.time())
        email_sent = False
        if SMTP_HOST and SMTP_FROM:
            try:
                message = EmailMessage()
                message["Subject"] = "New SHAKALPA contact enquiry"
                message["From"] = SMTP_FROM
                message["To"] = "contact@shakalpa.com"
                message["Reply-To"] = email_address
                message.set_content(f"New contact enquiry received through SHAKALPA.\n\nName: {full_name}\nContact number: {contact_number}\nEmail: {email_address}\nContact us for: {enquiry_for}\n")
                with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
                    if os.getenv("SMTP_USE_TLS", "1") != "0":
                        smtp.starttls()
                    if SMTP_USER:
                        smtp.login(SMTP_USER, SMTP_PASSWORD)
                    smtp.send_message(message)
                email_sent = True
            except (OSError, smtplib.SMTPException):
                email_sent = False
        with connection() as db:
            db.execute("INSERT INTO contact_messages (full_name, contact_number, email, enquiry_for, email_sent, created_at) VALUES (?, ?, ?, ?, ?, ?)", (full_name, contact_number, email_address, enquiry_for, int(email_sent), now))
        self.send_json({"message": "Thanks. Your contact request has been sent." if email_sent else "Thanks. Your contact request has been received.", "emailSent": email_sent}, HTTPStatus.CREATED)

    def support_vendors(self) -> None:
        with connection() as db:
            rows = db.execute("SELECT a.id, COALESCE(v.business_name, a.first_name || ' ' || a.last_name) AS name FROM accounts a LEFT JOIN vendor_profiles v ON v.account_id = a.id WHERE a.role = 'Vendor' AND (v.approval_status = 'Approved' OR v.account_id IS NULL) ORDER BY name COLLATE NOCASE").fetchall()
        self.send_json({"vendors": [{"id": row["id"], "name": row["name"]} for row in rows]})

    def support_submit(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error":"Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        data = self.read_json() or {}; name = str(data.get("name", "")).strip(); phone = str(data.get("contactNumber", "")).strip(); email_address = str(data.get("email", "")).strip().lower(); support_type = str(data.get("supportType", "")).strip(); support_for = str(data.get("supportFor", "")).strip(); vendor_id = data.get("vendorId")
        if not re.fullmatch(r"[A-Za-zÀ-ÿ' -]{2,100}", name) or not PHONE_PATTERN.fullmatch(phone) or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email_address) or len(email_address) > 254 or support_type not in {"General", "Technical", "Account", "Payment", "Specific vendor"} or not 2 <= len(support_for) <= 2000 or (vendor_id is not None and not isinstance(vendor_id, int)) or (support_type == "Specific vendor" and not isinstance(vendor_id, int)): self.send_json({"error":"Complete all support request details."}, HTTPStatus.BAD_REQUEST); return
        token = secrets.token_urlsafe(32); now = int(time.time())
        with connection() as db:
            vendor = db.execute("SELECT email FROM accounts WHERE id = ? AND role = 'Vendor'", (vendor_id,)).fetchone() if vendor_id else None
            if vendor_id and not vendor: self.send_json({"error":"Choose a valid Vendor."}, HTTPStatus.BAD_REQUEST); return
            ticket_id = db.execute("INSERT INTO support_tickets (requester_name, requester_email, requester_phone, support_type, support_for, vendor_id, requester_token_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", (name, email_address, phone, support_type, support_for, vendor_id, hashlib.sha256(token.encode()).hexdigest(), now)).lastrowid
            db.execute("INSERT INTO support_messages (ticket_id, sender_name, sender_role, body, created_at) VALUES (?, ?, 'Requester', ?, ?)", (ticket_id, name, support_for, now))
        recipients = ["support@shakalpa.com"] + ([vendor["email"]] if vendor else [])
        if SMTP_HOST and SMTP_FROM:
            try:
                message = EmailMessage(); message["Subject"] = f"SHAKALPA support ticket #{ticket_id}"; message["From"] = SMTP_FROM; message["To"] = ", ".join(recipients); message["Reply-To"] = email_address; message.set_content(f"Support ticket #{ticket_id}\n\n{name}\n{phone}\n{email_address}\nType: {support_type}\n\n{support_for}")
                with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
                    if os.getenv("SMTP_USE_TLS", "1") != "0": smtp.starttls()
                    if SMTP_USER: smtp.login(SMTP_USER, SMTP_PASSWORD)
                    smtp.send_message(message)
            except (OSError, smtplib.SMTPException): pass
        self.send_json({"message":"Support ticket created. You can continue in the private chat below.", "ticketId":ticket_id, "chatToken":token}, HTTPStatus.CREATED)

    def support_messages(self, parsed) -> None:
        query = parse_qs(parsed.query); ticket_id = query.get("ticketId", [""])[0]; token = query.get("token", [""])[0]
        try: ticket_id = int(ticket_id)
        except ValueError: self.send_json({"error":"Choose a valid support ticket."}, HTTPStatus.BAD_REQUEST); return
        with connection() as db:
            ticket = db.execute("SELECT * FROM support_tickets WHERE id = ?", (ticket_id,)).fetchone()
            allowed = bool(ticket and token and hmac.compare_digest(ticket["requester_token_hash"], hashlib.sha256(token.encode()).hexdigest()))
            actor = self.current_account()
            if actor and actor["role"] in {"Admin", "Employee"}: allowed = True
            if actor and actor["role"] == "Vendor" and ticket and ticket["vendor_id"] == actor["id"]: allowed = True
            if not allowed: self.send_json({"error":"This support chat is unavailable."}, HTTPStatus.FORBIDDEN); return
            rows = db.execute("SELECT sender_name, sender_role, body, created_at FROM support_messages WHERE ticket_id = ? ORDER BY created_at, id", (ticket_id,)).fetchall()
        self.send_json({"messages":[dict(row) for row in rows]})

    def support_send_message(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error":"Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        data = self.read_json() or {}; ticket_id = data.get("ticketId"); token = str(data.get("token", "")); body = str(data.get("body", "")).strip()
        if not isinstance(ticket_id, int) or not 1 <= len(body) <= 2000: self.send_json({"error":"Write a message of up to 2,000 characters."}, HTTPStatus.BAD_REQUEST); return
        with connection() as db:
            ticket = db.execute("SELECT * FROM support_tickets WHERE id = ?", (ticket_id,)).fetchone(); actor = self.current_account(); sender_name = ticket["requester_name"] if ticket else ""; sender_role = "Requester"; allowed = bool(ticket and token and hmac.compare_digest(ticket["requester_token_hash"], hashlib.sha256(token.encode()).hexdigest()))
            if actor and actor["role"] in {"Admin", "Employee"}: allowed=True; sender_name=f"{actor['first_name']} {actor['last_name']}"; sender_role=actor["role"]
            if actor and actor["role"] == "Vendor" and ticket and ticket["vendor_id"] == actor["id"]: allowed=True; sender_name=f"{actor['first_name']} {actor['last_name']}"; sender_role="Vendor"
            if not allowed: self.send_json({"error":"This support chat is unavailable."}, HTTPStatus.FORBIDDEN); return
            db.execute("INSERT INTO support_messages (ticket_id, sender_name, sender_role, body, created_at) VALUES (?, ?, ?, ?, ?)", (ticket_id, sender_name, sender_role, body, int(time.time())))
        self.send_json({"message":"Message sent."}, HTTPStatus.CREATED)

    def blood_actor(self) -> sqlite3.Row | None:
        account = self.current_account()
        if not account:
            self.send_json({"error": "Sign in is required to use Blood Requests."}, HTTPStatus.UNAUTHORIZED)
            return None
        return account

    def blood_update_preference(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        actor = self.blood_actor()
        if not actor: return
        status = str((self.read_json() or {}).get("donorStatus", "")).strip()
        if status not in {"Yes", "No", "Decide later"}: self.send_json({"error": "Choose Yes, No, or Decide later."}, HTTPStatus.BAD_REQUEST); return
        with connection() as db: db.execute("UPDATE accounts SET blood_donor_status = ? WHERE id = ?", (status, actor["id"]))
        self.send_json({"message": "Blood donor preference saved."})

    def blood_update_location(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        actor = self.blood_actor()
        if not actor: return
        data = self.read_json() or {}
        try: latitude, longitude = float(data.get("latitude")), float(data.get("longitude"))
        except (TypeError, ValueError): self.send_json({"error": "Use a valid current location."}, HTTPStatus.BAD_REQUEST); return
        if not -90 <= latitude <= 90 or not -180 <= longitude <= 180: self.send_json({"error": "Use a valid current location."}, HTTPStatus.BAD_REQUEST); return
        with connection() as db: db.execute("UPDATE accounts SET blood_latitude = ?, blood_longitude = ? WHERE id = ?", (latitude, longitude, actor["id"]))
        self.send_json({"message": "Location updated for nearby Blood Requests."})

    def blood_create_request(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        actor = self.blood_actor()
        if not actor: return
        data = self.read_json() or {}
        group = str(data.get("bloodGroup", "")).strip().upper(); hospital = str(data.get("hospitalDetails", "")).strip(); reason = str(data.get("reason", "")).strip(); contact = str(data.get("contactDetails", "")).strip()
        try: units, latitude, longitude = int(data.get("units")), float(data.get("latitude")), float(data.get("longitude"))
        except (TypeError, ValueError): self.send_json({"error": "Provide valid units and current location."}, HTTPStatus.BAD_REQUEST); return
        if group not in {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"} or not 1 <= units <= 20 or not 3 <= len(hospital) <= 500 or not 3 <= len(reason) <= 500 or not 7 <= len(contact) <= 200 or not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
            self.send_json({"error": "Complete the blood group, units, hospital, reason, contact, and location."}, HTTPStatus.BAD_REQUEST); return
        with connection() as db:
            request_id = db.execute("INSERT INTO blood_requests (requester_id, blood_group, units, hospital_details, reason, contact_details, latitude, longitude, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", (actor["id"], group, units, hospital, reason, contact, latitude, longitude, int(time.time()))).lastrowid
            donors = db.execute("SELECT id, blood_latitude, blood_longitude FROM accounts WHERE id != ? AND blood_donor_status = 'Yes' AND blood_latitude IS NOT NULL AND blood_longitude IS NOT NULL", (actor["id"],)).fetchall()
            notified = sum(distance_km(latitude, longitude, donor["blood_latitude"], donor["blood_longitude"]) <= 5 for donor in donors)
        self.send_json({"message": "Blood Request raised. Nearby donors have been notified.", "requestId": request_id, "notified": notified}, HTTPStatus.CREATED)

    def blood_notifications(self) -> None:
        actor = self.blood_actor()
        if not actor: return
        with connection() as db:
            profile = db.execute("SELECT blood_donor_status, blood_latitude, blood_longitude FROM accounts WHERE id = ?", (actor["id"],)).fetchone()
            if not profile or profile["blood_donor_status"] != "Yes" or profile["blood_latitude"] is None or profile["blood_longitude"] is None: self.send_json({"requests": [], "eligible": False}); return
            rows = db.execute("SELECT r.id, r.blood_group, r.units, r.reason, r.latitude, r.longitude, r.created_at, i.interested, EXISTS(SELECT 1 FROM blood_request_interests confirmed WHERE confirmed.request_id = r.id AND confirmed.interested = 1) AS has_interested FROM blood_requests r LEFT JOIN blood_request_interests i ON i.request_id = r.id AND i.donor_id = ? WHERE r.status = 'Open' AND r.requester_id != ? ORDER BY r.created_at DESC LIMIT 100", (actor["id"], actor["id"])).fetchall()
        now = int(time.time()); requests = []
        for row in rows:
            radius = 10 if now - row["created_at"] >= 3600 and not row["has_interested"] else 5
            if distance_km(profile["blood_latitude"], profile["blood_longitude"], row["latitude"], row["longitude"]) <= radius:
                requests.append({"id": row["id"], "bloodGroup": row["blood_group"], "units": row["units"], "reason": row["reason"], "interested": None if row["interested"] is None else bool(row["interested"]), "radiusKm": radius, "escalated": radius == 10})
        self.send_json({"requests": requests, "eligible": True})

    def blood_respond_interest(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        actor = self.blood_actor()
        if not actor: return
        data = self.read_json() or {}; request_id = data.get("requestId"); interested = data.get("interested")
        if not isinstance(request_id, int) or not isinstance(interested, bool): self.send_json({"error": "Choose a valid request response."}, HTTPStatus.BAD_REQUEST); return
        with connection() as db:
            profile = db.execute("SELECT blood_donor_status, blood_latitude, blood_longitude FROM accounts WHERE id = ?", (actor["id"],)).fetchone(); request = db.execute("SELECT id, requester_id, blood_group, units, hospital_details, reason, contact_details, latitude, longitude, created_at FROM blood_requests WHERE id = ? AND status = 'Open'", (request_id,)).fetchone(); has_interested = bool(request and db.execute("SELECT 1 FROM blood_request_interests WHERE request_id = ? AND interested = 1", (request_id,)).fetchone())
            radius = 10 if request and int(time.time()) - request["created_at"] >= 3600 and not has_interested else 5
            if not profile or profile["blood_donor_status"] != "Yes" or profile["blood_latitude"] is None or not request or request["requester_id"] == actor["id"] or distance_km(profile["blood_latitude"], profile["blood_longitude"], request["latitude"], request["longitude"]) > radius: self.send_json({"error": "This request is not available to you."}, HTTPStatus.FORBIDDEN); return
            db.execute("INSERT INTO blood_request_interests (request_id, donor_id, interested, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(request_id, donor_id) DO UPDATE SET interested = excluded.interested, created_at = excluded.created_at", (request_id, actor["id"], int(interested), int(time.time())))
        response = {"message": "Response recorded."}
        if interested: response["details"] = {"bloodGroup": request["blood_group"], "units": request["units"], "hospitalDetails": request["hospital_details"], "reason": request["reason"], "contactDetails": request["contact_details"]}
        self.send_json(response)

    def product_taxonomy(self) -> None:
        with connection() as db:
            rows = db.execute("SELECT id, main_category, subcategory FROM product_taxonomy WHERE active = 1 ORDER BY main_category COLLATE NOCASE, subcategory COLLATE NOCASE").fetchall()
            services = db.execute("SELECT s.taxonomy_id, s.service_name, s.service_kind, s.search_keywords FROM product_taxonomy_services s JOIN product_taxonomy t ON t.id = s.taxonomy_id WHERE s.active = 1 AND t.active = 1 ORDER BY s.service_name COLLATE NOCASE").fetchall()
        self.send_json({"categories": [{"id": row["id"], "mainCategory": row["main_category"], "subcategory": row["subcategory"]} for row in rows], "services": [{"taxonomyId": row["taxonomy_id"], "name": row["service_name"], "kind": row["service_kind"], "keywords": row["search_keywords"]} for row in services]})

    def admin_taxonomy(self) -> None:
        if not self.require_admin(): return
        with connection() as db:
            rows = db.execute("SELECT id, main_category, subcategory, active FROM product_taxonomy WHERE active = 1 ORDER BY main_category COLLATE NOCASE, subcategory COLLATE NOCASE").fetchall()
        self.send_json({"categories": [{"id": row["id"], "mainCategory": row["main_category"], "subcategory": row["subcategory"], "active": bool(row["active"])} for row in rows]})

    def admin_save_taxonomy(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        if not self.require_admin(): return
        data = self.read_json() or {}; action = str(data.get("action", "")).strip(); category_id = data.get("id")
        main = str(data.get("mainCategory", "")).strip(); subcategory = str(data.get("subcategory", "")).strip()
        if action not in {"add", "edit", "remove"}: self.send_json({"error": "Choose a taxonomy action."}, HTTPStatus.BAD_REQUEST); return
        if action != "remove" and (not 2 <= len(main) <= 100 or not 2 <= len(subcategory) <= 100): self.send_json({"error": "Enter a main category and subcategory."}, HTTPStatus.BAD_REQUEST); return
        with connection() as db:
            if action == "add": db.execute("INSERT INTO product_taxonomy (main_category, subcategory, created_at) VALUES (?, ?, ?)", (main, subcategory, int(time.time())))
            elif action == "edit" and isinstance(category_id, int): db.execute("UPDATE product_taxonomy SET main_category = ?, subcategory = ? WHERE id = ?", (main, subcategory, category_id))
            elif action == "remove" and isinstance(category_id, int): db.execute("UPDATE product_taxonomy SET active = 0 WHERE id = ?", (category_id,))
            else: self.send_json({"error": "Choose a valid category."}, HTTPStatus.BAD_REQUEST); return
        self.send_json({"message": "Taxonomy updated."})

    def currency_rate(self, parsed) -> None:
        query = parse_qs(parsed.query, keep_blank_values=True)
        base_values, quote_values = query.get("from", []), query.get("to", [])
        if len(base_values) != 1 or len(quote_values) != 1:
            self.send_json({"error": "Choose one source and one target currency."}, HTTPStatus.BAD_REQUEST)
            return
        base, quote = base_values[0].upper(), quote_values[0].upper()
        if base not in CURRENCY_CODES or quote not in CURRENCY_CODES:
            self.send_json({"error": "Choose a supported currency."}, HTTPStatus.BAD_REQUEST)
            return
        if base == quote:
            self.send_json({"base": base, "quote": quote, "rate": 1, "date": time.strftime("%Y-%m-%d", time.gmtime()), "source": "identity"})
            return
        global FX_RATE_CACHE
        now = time.time()
        with FX_RATE_CACHE_LOCK:
            cached = FX_RATE_CACHE
        if cached and cached[0] > now:
            rates_data = cached[1]
        else:
            rates_data = None
        if rates_data:
            rates = rates_data["rates"]
            if not isinstance(rates.get(base), (int, float)) or not isinstance(rates.get(quote), (int, float)):
                self.send_json({"error": "Live exchange rates are temporarily unavailable. Please try again."}, HTTPStatus.BAD_GATEWAY)
                return
            payload = {"base": base, "quote": quote, "rate": rates[quote] / rates[base], "date": rates_data["date"], "source": "ExchangeRate-API"}
            self.send_json(payload)
            return
        try:
            request = urllib.request.Request(
                "https://open.er-api.com/v6/latest/USD",
                headers={"Accept": "application/json", "User-Agent": "SHAKALPA-local-preview/1.0"},
            )
            with urllib.request.urlopen(request, timeout=6) as response:
                data = json.loads(response.read().decode("utf-8"))
            rates = data.get("rates")
            rate_date = str(data.get("time_last_update_utc", ""))
            if data.get("result") != "success" or not isinstance(rates, dict) or not all(isinstance(rates.get(code), (int, float)) and 0 < rates[code] < 1_000_000_000 for code in CURRENCY_CODES):
                raise ValueError("Invalid rate response")
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, TypeError, json.JSONDecodeError):
            self.send_json({"error": "Live exchange rates are temporarily unavailable. Please try again."}, HTTPStatus.BAD_GATEWAY)
            return
        rates_data = {"rates": rates, "date": rate_date}
        with FX_RATE_CACHE_LOCK:
            FX_RATE_CACHE = (now + 300, rates_data)
        payload = {"base": base, "quote": quote, "rate": rates[quote] / rates[base], "date": rate_date, "source": "ExchangeRate-API"}
        self.send_json(payload)

    def metal_rates(self) -> None:
        global METAL_RATE_CACHE
        now = time.time()
        with FX_RATE_CACHE_LOCK:
            cached = METAL_RATE_CACHE
        if cached and cached[0] > now:
            self.send_json(cached[1])
            return
        try:
            headers = {"Accept": "application/json", "User-Agent": "SHAKALPA-local-preview/1.0"}
            with urllib.request.urlopen(urllib.request.Request("https://snapdata.dev/api/v1/gold/in/latest.json", headers=headers), timeout=6) as response:
                gold_data = json.loads(response.read().decode("utf-8"))
            with urllib.request.urlopen(urllib.request.Request("https://snapdata.dev/api/v1/silver/in/latest.json", headers=headers), timeout=6) as response:
                silver_data = json.loads(response.read().decode("utf-8"))
            gold_values = {str(item.get("instrument")): item.get("value") for item in gold_data.get("observations", [])}
            silver_values = {str(item.get("instrument")): item.get("value") for item in silver_data.get("observations", [])}
            gold22k, gold24k, silver_per_kg = gold_values.get("XAU.22K"), gold_values.get("XAU.24K"), silver_values.get("XAG")
            if not all(isinstance(value, (int, float)) and 0 < value < 10_000_000 for value in (gold22k, gold24k, silver_per_kg)):
                raise ValueError("Invalid metal price response")
            payload = {
                "gold22k": gold22k,
                "gold24k": gold24k,
                "silver": silver_per_kg / 1000,
                "currency": gold_data.get("unit", {}).get("currency", "INR"),
                "unit": "gram",
                "updatedAt": str(gold_data.get("generated_at", "")),
                "status": gold_data.get("observations", [{}])[0].get("status", ""),
                "source": "IBJA via Snapdata",
            }
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, TypeError, json.JSONDecodeError):
            self.send_json({"error": "Live gold and silver rates are temporarily unavailable. Please try again."}, HTTPStatus.BAD_GATEWAY)
            return
        with FX_RATE_CACHE_LOCK:
            METAL_RATE_CACHE = (now + 900, payload)
        self.send_json(payload)

    def index_rates(self) -> None:
        """Return headline NSE and BSE levels with their daily market trend.

        The upstream publishes only the two public headline levels we show, so no
        constituent or historical exchange data is collected or redistributed.
        """
        global INDEX_RATE_CACHE
        now = time.time()
        with FX_RATE_CACHE_LOCK:
            cached = INDEX_RATE_CACHE
        if cached and cached[0] > now:
            self.send_json(cached[1])
            return
        try:
            request = urllib.request.Request(
                "https://snapdata.dev/api/v1/equity-indices/in/latest.json",
                headers={"Accept": "application/json", "User-Agent": "SHAKALPA-local-preview/1.0"},
            )
            with urllib.request.urlopen(request, timeout=6) as response:
                index_data = json.loads(response.read().decode("utf-8"))
            observations = {str(item.get("instrument_id")): item for item in index_data.get("observations", [])}

            def index_payload(instrument_id: str, exchange: str, label: str) -> dict | None:
                observation = observations.get(instrument_id, {})
                value = observation.get("value")
                change_pct = observation.get("change_pct")
                previous_close = observation.get("prev_close")
                if not isinstance(value, (int, float)) or not 0 < value < 10_000_000:
                    return None
                if not isinstance(change_pct, (int, float)):
                    change_pct = 0
                change = value - previous_close if isinstance(previous_close, (int, float)) else None
                return {
                    "label": label,
                    "exchange": exchange,
                    "value": value,
                    "change": change,
                    "changePercent": change_pct,
                    "trend": "up" if change_pct > 0 else "down" if change_pct < 0 else "flat",
                    "status": str(observation.get("status", "")),
                }

            sensex = index_payload("SENSEX.INR.IDX", "BSE", "SENSEX")
            nifty50 = index_payload("NIFTY50.INR.IDX", "NSE", "NIFTY 50")
            fallback_sources: list[str] = []

            def public_index_fallback(symbol: str, exchange: str, label: str) -> dict:
                """Use a fixed public quote only when the primary lacks a value or trend."""
                fallback_request = urllib.request.Request(
                    f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=1d&interval=1d",
                    headers={"Accept": "application/json", "User-Agent": "SHAKALPA-local-preview/1.0"},
                )
                with urllib.request.urlopen(fallback_request, timeout=6) as response:
                    fallback_data = json.loads(response.read().decode("utf-8"))
                meta = fallback_data.get("chart", {}).get("result", [{}])[0].get("meta", {})
                value = meta.get("regularMarketPrice")
                change_pct = meta.get("regularMarketChangePercent")
                previous_close = meta.get("chartPreviousClose")
                if not isinstance(value, (int, float)) or not 0 < value < 10_000_000:
                    raise ValueError("Invalid Sensex fallback response")
                if not isinstance(change_pct, (int, float)):
                    change_pct = ((value - previous_close) / previous_close * 100) if isinstance(previous_close, (int, float)) and previous_close else 0
                return {
                    "label": label, "exchange": exchange, "value": value,
                    "change": value - previous_close if isinstance(previous_close, (int, float)) else None,
                    "changePercent": change_pct,
                    "trend": "up" if change_pct > 0 else "down" if change_pct < 0 else "flat",
                    "status": "reference",
                }

            # The primary feed can be temporarily missing, or publish a level
            # before its previous close. In either case, complete the visible
            # up/down trend from a fixed no-key public quote endpoint.
            if sensex is None or sensex["change"] is None:
                sensex = public_index_fallback("%5EBSESN", "BSE", "SENSEX")
                fallback_sources.append("BSE Sensex reference via Yahoo Finance")
            if nifty50 is None or nifty50["change"] is None:
                nifty50 = public_index_fallback("%5ENSEI", "NSE", "NIFTY 50")
                fallback_sources.append("NSE Nifty 50 reference via Yahoo Finance")
            if sensex is None and nifty50 is None:
                raise ValueError("No market index values available")
            payload = {
                "sensex": sensex,
                "nifty50": nifty50,
                "updatedAt": str(index_data.get("generated_at", "")),
                "source": "NSE and BSE via Snapdata" if not fallback_sources else f"NSE and BSE via Snapdata; {'; '.join(fallback_sources)}",
            }
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, TypeError, json.JSONDecodeError):
            self.send_json({"error": "Live NSE and BSE rates are temporarily unavailable. Please try again."}, HTTPStatus.BAD_GATEWAY)
            return
        with FX_RATE_CACHE_LOCK:
            INDEX_RATE_CACHE = (now + 300, payload)
        self.send_json(payload)

    def session_status(self) -> None:
        account = self.current_account()
        self.send_json({"authenticated": bool(account), "account": {"firstName": account["first_name"], "lastName": account["last_name"], "role": account["role"]} if account else None, "adminView": bool(account and self.headers.get("X-SHAKALPA-Admin-Vendor-View"))})

    def current_account(self) -> sqlite3.Row | None:
        view_token = self.headers.get("X-SHAKALPA-Admin-Vendor-View", "")
        if view_token and len(view_token) <= 200:
            with connection() as db:
                account = db.execute("SELECT a.id, a.first_name, a.last_name, a.email, a.role FROM admin_vendor_view_tokens t JOIN accounts a ON a.id = t.vendor_account_id WHERE t.token_hash = ? AND t.expires_at > ? AND a.role = 'Vendor'", (hashlib.sha256(view_token.encode()).hexdigest(), int(time.time()))).fetchone()
            if account:
                return account
        token = self.session_token()
        if not token:
            return None
        with connection() as db:
            account = db.execute("SELECT a.id, a.first_name, a.last_name, a.email, a.role FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.token_hash = ? AND s.expires_at > ?", (hashlib.sha256(token.encode()).hexdigest(), int(time.time()))).fetchone()
            if account and account["role"] == "Employee":
                staff = db.execute("SELECT active FROM vendor_staff WHERE account_id = ?", (account["id"],)).fetchone()
                if staff and not staff["active"]:
                    return None
            return account

    def require_admin(self) -> sqlite3.Row | None:
        account = self.current_account()
        if not account:
            self.send_json({"error": "Sign in is required."}, HTTPStatus.UNAUTHORIZED)
            return None
        if account["role"] != "Admin":
            self.send_json({"error": "Administrator access is required."}, HTTPStatus.FORBIDDEN)
            return None
        return account

    def require_employee(self) -> sqlite3.Row | None:
        account = self.current_account()
        if not account:
            self.send_json({"error": "Sign in is required."}, HTTPStatus.UNAUTHORIZED)
            return None
        if account["role"] != "Employee":
            self.send_json({"error": "Employee access is required."}, HTTPStatus.FORBIDDEN)
            return None
        with connection() as db:
            if db.execute("SELECT 1 FROM vendor_staff WHERE account_id = ?", (account["id"],)).fetchone():
                self.send_json({"error": "Vendor employees have access only to their Vendor workspace."}, HTTPStatus.FORBIDDEN)
                return None
        return account

    def require_agent(self) -> sqlite3.Row | None:
        account = self.current_account()
        if not account:
            self.send_json({"error": "Sign in is required."}, HTTPStatus.UNAUTHORIZED)
            return None
        if account["role"] != "Agent":
            self.send_json({"error": "Agent access is required."}, HTTPStatus.FORBIDDEN)
            return None
        return account

    def require_vendor(self) -> sqlite3.Row | None:
        account = self.current_account()
        if not account:
            self.send_json({"error": "Sign in is required."}, HTTPStatus.UNAUTHORIZED)
            return None
        if account["role"] != "Vendor":
            self.send_json({"error": "Vendor access is required."}, HTTPStatus.FORBIDDEN)
            return None
        return account

    def vendor_staff(self) -> None:
        vendor = self.require_vendor()
        if not vendor:
            return
        with connection() as db:
            staff = db.execute("SELECT a.id, a.account_code, a.first_name, a.last_name, a.email, a.phone, s.can_add_products, s.can_edit_products, s.active, s.created_at, s.offboarded_at FROM vendor_staff s JOIN accounts a ON a.id = s.account_id WHERE s.vendor_id = ? ORDER BY s.active DESC, s.created_at DESC", (vendor["id"],)).fetchall()
        self.send_json({"staff": [{"id": row["id"], "accountCode": row["account_code"], "firstName": row["first_name"], "lastName": row["last_name"], "email": row["email"], "phone": row["phone"], "canAddProducts": bool(row["can_add_products"]), "canEditProducts": bool(row["can_edit_products"]), "active": bool(row["active"]), "createdAt": row["created_at"], "offboardedAt": row["offboarded_at"]} for row in staff]})

    def vendor_create_staff(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        vendor = self.require_vendor()
        if not vendor:
            return
        data = self.read_json()
        if data is None:
            self.send_json({"error": "Invalid employee request."}, HTTPStatus.BAD_REQUEST)
            return
        account, error = validate_signup(data)
        if error:
            self.send_json({"error": error}, HTTPStatus.BAD_REQUEST)
            return
        can_add = data.get("canAddProducts") is True
        can_edit = data.get("canEditProducts") is True
        if not can_add and not can_edit:
            self.send_json({"error": "Choose Add products and/or Edit products permission."}, HTTPStatus.BAD_REQUEST)
            return
        now = int(time.time())
        try:
            with connection() as db:
                cursor = db.execute("INSERT INTO accounts (first_name, last_name, phone, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, 'Employee', ?)", (account["first_name"], account["last_name"], account["phone"], account["email"], hash_password(account["password"]), now))
                db.execute("INSERT INTO vendor_staff (account_id, vendor_id, can_add_products, can_edit_products, created_at) VALUES (?, ?, ?, ?, ?)", (cursor.lastrowid, vendor["id"], int(can_add), int(can_edit), now))
                account_code = assign_account_code(db, cursor.lastrowid, "Employee", account["first_name"], now, vendor["id"])
        except sqlite3.IntegrityError:
            self.send_json({"error": "An account already exists for that email."}, HTTPStatus.CONFLICT)
            return
        self.send_json({"message": "Employee added. Their product work will wait for your approval before publishing.", "accountCode": account_code}, HTTPStatus.CREATED)

    def vendor_offboard_staff(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        vendor = self.require_vendor()
        if not vendor:
            return
        data = self.read_json() or {}
        staff_id = data.get("staffId")
        if not isinstance(staff_id, int):
            self.send_json({"error": "Choose a valid employee."}, HTTPStatus.BAD_REQUEST)
            return
        with connection() as db:
            result = db.execute("UPDATE vendor_staff SET active = 0, offboarded_at = ? WHERE account_id = ? AND vendor_id = ? AND active = 1", (int(time.time()), staff_id, vendor["id"])).rowcount
        if not result:
            self.send_json({"error": "That employee is not active in your team."}, HTTPStatus.NOT_FOUND)
            return
        self.send_json({"message": "Employee offboarded. Their Vendor access has been removed."})

    def vendor_product_change_requests(self) -> None:
        vendor = self.require_vendor()
        if not vendor:
            return
        with connection() as db:
            rows = db.execute("SELECT r.id, r.product_id, r.request_type, r.proposed_data, r.status, r.created_at, a.first_name, a.last_name, p.product_name FROM vendor_product_change_requests r JOIN accounts a ON a.id = r.requested_by LEFT JOIN vendor_products p ON p.id = r.product_id WHERE r.vendor_id = ? ORDER BY CASE r.status WHEN 'Pending' THEN 0 ELSE 1 END, r.created_at DESC", (vendor["id"],)).fetchall()
        output = []
        for row in rows:
            try: proposed = json.loads(row["proposed_data"])
            except (TypeError, ValueError): proposed = {}
            output.append({"id": row["id"], "productId": row["product_id"], "requestType": row["request_type"], "status": row["status"], "createdAt": row["created_at"], "employeeName": f"{row['first_name']} {row['last_name']}", "productName": row["product_name"] or proposed.get("name", "New product"), "proposed": proposed})
        self.send_json({"requests": output})

    def vendor_review_product_change(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        vendor = self.require_vendor()
        if not vendor:
            return
        data = self.read_json() or {}
        request_id = data.get("requestId"); decision = data.get("decision")
        if not isinstance(request_id, int) or decision not in {"Approved", "Rejected"}:
            self.send_json({"error": "Choose a pending request and an approval decision."}, HTTPStatus.BAD_REQUEST)
            return
        with connection() as db:
            request = db.execute("SELECT id, product_id, request_type, proposed_data FROM vendor_product_change_requests WHERE id = ? AND vendor_id = ? AND status = 'Pending'", (request_id, vendor["id"])).fetchone()
            if not request:
                self.send_json({"error": "That approval request is no longer pending."}, HTTPStatus.NOT_FOUND)
                return
            if decision == "Approved" and request["request_type"] == "Edit" and request["product_id"]:
                proposed = json.loads(request["proposed_data"])
                db.execute("UPDATE vendor_products SET product_name = ?, product_description = ?, product_category = ?, product_type = ?, search_keywords = ?, product_specifications = ?, cost_paise = ?, tax_details = ?, available_quantity = ?, delivery_charges_paise = ?, self_delivery = ? WHERE id = ? AND vendor_id = ?", (proposed["name"], proposed["description"], proposed["category"], proposed["productType"], proposed.get("keywords", ""), proposed.get("specifications", ""), proposed["costPaise"], proposed.get("taxDetails") or None, proposed["availableQuantity"], proposed["deliveryChargesPaise"], int(proposed.get("selfDelivery") is True), request["product_id"], vendor["id"]))
            db.execute("UPDATE vendor_product_change_requests SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?", (decision, vendor["id"], int(time.time()), request_id))
        self.send_json({"message": f"Product change {decision.lower()}."})

    def require_approver(self) -> sqlite3.Row | None:
        account = self.current_account()
        if not account:
            self.send_json({"error": "Sign in is required."}, HTTPStatus.UNAUTHORIZED)
            return None
        if account["role"] not in {"Admin", "Employee"}:
            self.send_json({"error": "Admin or Employee access is required."}, HTTPStatus.FORBIDDEN)
            return None
        return account

    def admin_list_accounts(self) -> None:
        if not self.require_admin():
            return
        with connection() as db:
            accounts = db.execute("SELECT a.id, a.account_code, a.first_name, a.last_name, a.phone, a.email, a.role, a.created_at, s.account_id AS vendor_staff_id FROM accounts a LEFT JOIN vendor_staff s ON s.account_id = a.id ORDER BY a.created_at DESC, a.id DESC").fetchall()
        self.send_json({"accounts": [{"id": row["id"], "accountCode": row["account_code"], "firstName": row["first_name"], "lastName": row["last_name"], "phone": row["phone"], "email": row["email"], "role": "Vendor employee" if row["vendor_staff_id"] else row["role"], "createdAt": row["created_at"]} for row in accounts]})

    def admin_approved_vendors(self) -> None:
        if not self.require_admin():
            return
        with connection() as db:
            vendors = db.execute("SELECT a.id, a.first_name, a.last_name, a.email, a.phone, v.business_name, v.business_type, v.service_type, v.city, v.country, v.reviewed_at FROM vendor_profiles v JOIN accounts a ON a.id = v.account_id WHERE v.approval_status = 'Approved' AND a.role = 'Vendor' ORDER BY v.reviewed_at DESC, v.updated_at DESC").fetchall()
        self.send_json({"vendors": [{"accountId": row["id"], "ownerName": f"{row['first_name']} {row['last_name']}", "email": row["email"], "phone": row["phone"], "businessName": row["business_name"], "businessType": row["business_type"], "serviceType": row["service_type"], "city": row["city"], "country": row["country"], "approvedAt": row["reviewed_at"]} for row in vendors]})

    def admin_vendor_login(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        admin = self.require_admin()
        if not admin:
            return
        data = self.read_json()
        account_id = data.get("accountId") if data else None
        if not isinstance(account_id, int):
            self.send_json({"error": "Choose a valid approved Vendor."}, HTTPStatus.BAD_REQUEST)
            return
        with connection() as db:
            vendor = db.execute("SELECT a.id, a.first_name FROM accounts a JOIN vendor_profiles v ON v.account_id = a.id WHERE a.id = ? AND a.role = 'Vendor' AND v.approval_status = 'Approved'", (account_id,)).fetchone()
            if not vendor:
                self.send_json({"error": "That Vendor is not approved or no longer available."}, HTTPStatus.NOT_FOUND)
                return
            token = secrets.token_urlsafe(32)
            now = int(time.time())
            db.execute("DELETE FROM admin_vendor_view_tokens WHERE expires_at < ?", (now,))
            db.execute("INSERT INTO admin_vendor_view_tokens (token_hash, admin_account_id, vendor_account_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)", (hashlib.sha256(token.encode()).hexdigest(), admin["id"], vendor["id"], now + 15 * 60, now))
            db.execute("INSERT INTO admin_vendor_access_log (admin_account_id, vendor_account_id, accessed_at) VALUES (?, ?, ?)", (admin["id"], vendor["id"], int(time.time())))
        self.send_json({"message": f"Opened {vendor['first_name']}'s Vendor workspace.", "viewToken": token, "expiresInSeconds": 15 * 60})

    def admin_create_account(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        if not self.require_admin():
            return
        data = self.read_json()
        if data is None:
            self.send_json({"error": "Invalid request."}, HTTPStatus.BAD_REQUEST)
            return
        role = str(data.get("role", "")).strip()
        if role not in ROLES:
            self.send_json({"error": "Choose a valid account role."}, HTTPStatus.BAD_REQUEST)
            return
        account, error = validate_signup(data)
        if error:
            self.send_json({"error": error}, HTTPStatus.BAD_REQUEST)
            return
        try:
            with connection() as db:
                now = int(time.time())
                cursor = db.execute("INSERT INTO accounts (first_name, last_name, phone, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", (account["first_name"], account["last_name"], account["phone"], account["email"], hash_password(account["password"]), role, now))
                assign_account_code(db, cursor.lastrowid, role, account["first_name"], now)
        except sqlite3.IntegrityError:
            self.send_json({"error": "An account already exists for that email."}, HTTPStatus.CONFLICT)
            return
        self.send_json({"message": f"{role} account created."}, HTTPStatus.CREATED)

    def employee_list_accounts(self) -> None:
        if not self.require_employee():
            return
        with connection() as db:
            accounts = db.execute("SELECT id, first_name, last_name, phone, email, role, created_at FROM accounts WHERE role IN ('Customer', 'Vendor', 'Agent') ORDER BY created_at DESC, id DESC").fetchall()
        self.send_json({"accounts": [{"id": row["id"], "firstName": row["first_name"], "lastName": row["last_name"], "phone": row["phone"], "email": row["email"], "role": row["role"], "createdAt": row["created_at"]} for row in accounts]})

    def employee_create_account(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        if not self.require_employee():
            return
        data = self.read_json()
        if data is None:
            self.send_json({"error": "Invalid request."}, HTTPStatus.BAD_REQUEST)
            return
        role = str(data.get("role", "")).strip()
        allowed_roles = {"Customer", "Vendor", "Agent"}
        if role not in allowed_roles:
            self.send_json({"error": "Employees may create only Customer, Vendor, or Agent accounts."}, HTTPStatus.FORBIDDEN)
            return
        account, error = validate_signup(data)
        if error:
            self.send_json({"error": error}, HTTPStatus.BAD_REQUEST)
            return
        try:
            with connection() as db:
                now = int(time.time())
                cursor = db.execute("INSERT INTO accounts (first_name, last_name, phone, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", (account["first_name"], account["last_name"], account["phone"], account["email"], hash_password(account["password"]), role, now))
                assign_account_code(db, cursor.lastrowid, role, account["first_name"], now)
        except sqlite3.IntegrityError:
            self.send_json({"error": "An account already exists for that email."}, HTTPStatus.CONFLICT)
            return
        self.send_json({"message": f"{role} account created."}, HTTPStatus.CREATED)

    def agent_list_vendors(self) -> None:
        if not self.require_agent():
            return
        with connection() as db:
            accounts = db.execute("SELECT id, first_name, last_name, phone, email, role, created_at FROM accounts WHERE role = 'Vendor' ORDER BY created_at DESC, id DESC").fetchall()
        self.send_json({"accounts": [{"id": row["id"], "firstName": row["first_name"], "lastName": row["last_name"], "phone": row["phone"], "email": row["email"], "role": row["role"], "createdAt": row["created_at"]} for row in accounts]})

    def agent_create_vendor(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        if not self.require_agent():
            return
        data = self.read_json()
        if data is None:
            self.send_json({"error": "Invalid request."}, HTTPStatus.BAD_REQUEST)
            return
        # Role is intentionally ignored: this route always creates a Vendor.
        account, error = validate_signup(data)
        if error:
            self.send_json({"error": error}, HTTPStatus.BAD_REQUEST)
            return
        try:
            with connection() as db:
                now = int(time.time())
                cursor = db.execute("INSERT INTO accounts (first_name, last_name, phone, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", (account["first_name"], account["last_name"], account["phone"], account["email"], hash_password(account["password"]), "Vendor", now))
                assign_account_code(db, cursor.lastrowid, "Vendor", account["first_name"], now)
        except sqlite3.IntegrityError:
            self.send_json({"error": "An account already exists for that email."}, HTTPStatus.CONFLICT)
            return
        self.send_json({"message": "Vendor account created."}, HTTPStatus.CREATED)

    def vendor_profile(self) -> None:
        vendor = self.require_vendor()
        if not vendor:
            return
        with connection() as db:
            profile = db.execute("SELECT p.business_name, p.business_type, p.service_type, p.other_type, p.owner_image_path, p.address_line1, p.address_line2, p.city, p.state, p.postal_code, p.country, p.gst_number, p.fssai_certificate, p.vehicle_registration, p.insurance_details, p.other_certificates, p.approval_status, p.updated_at, m.operating_model FROM vendor_profiles p LEFT JOIN vendor_operating_models m ON m.account_id = p.account_id WHERE p.account_id = ?", (vendor["id"],)).fetchone()
            pending_profile = db.execute("SELECT c.business_name, c.business_type, c.service_type, c.other_type, c.owner_image_path, c.address_line1, c.address_line2, c.city, c.state, c.postal_code, c.country, c.gst_number, c.fssai_certificate, c.vehicle_registration, c.insurance_details, c.other_certificates, c.approval_status, c.updated_at, m.operating_model FROM vendor_profile_changes c LEFT JOIN vendor_operating_models m ON m.account_id = c.account_id WHERE c.account_id = ? AND c.approval_status != 'Approved' ORDER BY c.updated_at DESC, c.id DESC LIMIT 1", (vendor["id"],)).fetchone()
            certificates = db.execute("SELECT id, original_name, uploaded_at FROM vendor_certificates WHERE account_id = ? ORDER BY uploaded_at DESC, id DESC", (vendor["id"],)).fetchall()
            document_requests = db.execute("SELECT id, message, requested_at FROM vendor_document_requests WHERE account_id = ? AND status = 'Open' ORDER BY requested_at DESC", (vendor["id"],)).fetchall()
        def response_profile(row: sqlite3.Row | None) -> dict | None:
            if not row:
                return None
            return {"businessName": row["business_name"], "businessType": row["business_type"], "serviceType": row["service_type"], "otherType": row["other_type"], "operatingModel": row["operating_model"], "ownerImagePath": row["owner_image_path"], "addressLine1": row["address_line1"], "addressLine2": row["address_line2"], "city": row["city"], "state": row["state"], "postalCode": row["postal_code"], "country": row["country"], "gstNumber": row["gst_number"], "fssaiCertificate": row["fssai_certificate"], "vehicleRegistration": row["vehicle_registration"], "insuranceDetails": row["insurance_details"], "otherCertificates": row["other_certificates"], "approvalStatus": row["approval_status"], "updatedAt": row["updated_at"]}
        self.send_json({"profile": response_profile(profile), "pendingProfile": response_profile(pending_profile), "certificates": [{"id": row["id"], "name": row["original_name"], "uploadedAt": row["uploaded_at"]} for row in certificates], "documentRequests": [{"id": row["id"], "message": row["message"], "requestedAt": row["requested_at"]} for row in document_requests]})

    def vendor_maps_config(self) -> None:
        if not self.require_vendor():
            return
        self.send_json({"apiKey": GOOGLE_MAPS_API_KEY})

    def vendor_save_profile(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        vendor = self.require_vendor()
        if not vendor:
            return
        data = self.read_json()
        if data is None:
            self.send_json({"error": "Invalid request."}, HTTPStatus.BAD_REQUEST)
            return
        business_name = str(data.get("businessName", "")).strip()
        business_type = str(data.get("businessType", "")).strip()
        service_type = str(data.get("serviceType", "")).strip()
        operating_model = str(data.get("operatingModel", "")).strip()
        if not operating_model:
            with connection() as db:
                saved_model = db.execute("SELECT operating_model FROM vendor_operating_models WHERE account_id = ?", (vendor["id"],)).fetchone()
            operating_model = saved_model["operating_model"] if saved_model else ""
        other_type = str(data.get("otherType", "")).strip()
        if not 2 <= len(business_name) <= 120:
            self.send_json({"error": "Enter a business name between 2 and 120 characters."}, HTTPStatus.BAD_REQUEST)
            return
        if not 2 <= len(business_type) <= 120 or not 2 <= len(service_type) <= 120:
            self.send_json({"error": "Choose a main category and at least one service or product."}, HTTPStatus.BAD_REQUEST)
            return
        if operating_model not in VENDOR_OPERATING_MODELS:
            self.send_json({"error": "Choose how you want to use SHAKALPA before saving your profile."}, HTTPStatus.BAD_REQUEST)
            return
        if (business_type == "Other" or service_type == "Other") and not 2 <= len(other_type) <= 5000:
            self.send_json({"error": "Describe your business or service in 2 to 5,000 characters."}, HTTPStatus.BAD_REQUEST)
            return
        if len(other_type) > 5000:
            self.send_json({"error": "Business or service description must be 5,000 characters or fewer."}, HTTPStatus.BAD_REQUEST)
            return
        address_line1 = str(data.get("addressLine1", "")).strip()
        address_line2 = str(data.get("addressLine2", "")).strip()
        city = str(data.get("city", "")).strip()
        state = str(data.get("state", "")).strip()
        postal_code = str(data.get("postalCode", "")).strip()
        country = str(data.get("country", "")).strip()
        if not 3 <= len(address_line1) <= 180 or len(address_line2) > 180 or not 2 <= len(city) <= 80 or not 2 <= len(state) <= 80 or not 2 <= len(postal_code) <= 20 or not 2 <= len(country) <= 80:
            self.send_json({"error": "Complete the required address fields using valid lengths."}, HTTPStatus.BAD_REQUEST)
            return
        image_path, image_error = self.save_vendor_image(data.get("ownerImage"))
        if image_error:
            self.send_json({"error": image_error}, HTTPStatus.BAD_REQUEST)
            return
        gst_number = str(data.get("gstNumber", "")).strip()
        fssai_certificate = str(data.get("fssaiCertificate", "")).strip()
        vehicle_registration = str(data.get("vehicleRegistration", "")).strip()
        insurance_details = str(data.get("insuranceDetails", "")).strip()
        other_certificates = str(data.get("otherCertificates", "")).strip()
        if len(gst_number) > 40 or len(fssai_certificate) > 80 or len(vehicle_registration) > 40 or len(insurance_details) > 1000 or len(other_certificates) > 2000:
            self.send_json({"error": "Certificate details exceed the allowed length."}, HTTPStatus.BAD_REQUEST)
            return
        submit_for_approval = data.get("submitForApproval") is True
        if submit_for_approval and self.registration_fee_paise() > 0:
            with connection() as db:
                registration_paid = db.execute("SELECT 1 FROM vendor_registration_payments WHERE account_id = ? AND status = 'Paid' LIMIT 1", (vendor["id"],)).fetchone()
            if not registration_paid:
                self.send_json({"error": "Pay the Vendor registration fee before submitting for approval."}, HTTPStatus.PAYMENT_REQUIRED)
                return
        if submit_for_approval and operating_model == "marketplace":
            with connection() as db:
                marketplace_setup = db.execute("SELECT 1 FROM vendor_marketplace_setups WHERE account_id = ?", (vendor["id"],)).fetchone()
            if not marketplace_setup:
                self.send_json({"error": "Complete Marketplace setup, including payout, policies, and Vendor Agreement confirmation, before submitting for approval."}, HTTPStatus.BAD_REQUEST)
                return
        if submit_for_approval and operating_model in {"listing", "leads", "bookings"}:
            with connection() as db:
                operating_setup = db.execute("SELECT 1 FROM vendor_operating_setups WHERE account_id = ? AND operating_model = ?", (vendor["id"], operating_model)).fetchone()
            if not operating_setup:
                self.send_json({"error": f"Complete the {VENDOR_OPERATING_MODELS[operating_model]} setup before submitting for approval."}, HTTPStatus.BAD_REQUEST)
                return
        certificate_documents, certificate_error = self.save_vendor_certificates(vendor["id"], data.get("certificateDocuments"))
        if certificate_error:
            self.send_json({"error": certificate_error}, HTTPStatus.BAD_REQUEST)
            return
        identity_documents, tan_details, identity_error = self.identity_documents_from_signup(data, "Vendor")
        if identity_error:
            self.send_json({"error": identity_error}, HTTPStatus.BAD_REQUEST)
            return
        with connection() as db:
            stored_certificate_count = db.execute("SELECT COUNT(*) AS count FROM vendor_certificates WHERE account_id = ?", (vendor["id"],)).fetchone()["count"]
        if submit_for_approval and stored_certificate_count == 0:
            self.send_json({"error": "Upload at least one business or service certificate before submitting for approval."}, HTTPStatus.BAD_REQUEST)
            return
        with connection() as db:
            active_profile = db.execute("SELECT approval_status, owner_image_path FROM vendor_profiles WHERE account_id = ?", (vendor["id"],)).fetchone()
        if active_profile and active_profile["approval_status"] == "Approved":
            change_status = "Submitted" if submit_for_approval else "Draft"
            now = int(time.time())
            with connection() as db:
                self.save_identity_documents(db, vendor["id"], identity_documents, tan_details)
                db.execute("INSERT INTO vendor_operating_models (account_id, operating_model, updated_at) VALUES (?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET operating_model = excluded.operating_model, updated_at = excluded.updated_at", (vendor["id"], operating_model, now))
                pending_change = db.execute("SELECT id FROM vendor_profile_changes WHERE account_id = ? AND approval_status != 'Approved' ORDER BY updated_at DESC, id DESC LIMIT 1", (vendor["id"],)).fetchone()
                values = (business_name, business_type, service_type, other_type or None, image_path or active_profile["owner_image_path"], address_line1, address_line2 or None, city, state, postal_code, country, gst_number or None, fssai_certificate or None, vehicle_registration or None, insurance_details or None, other_certificates or None, change_status, now if submit_for_approval else None, now)
                if pending_change:
                    db.execute("UPDATE vendor_profile_changes SET business_name = ?, business_type = ?, service_type = ?, other_type = ?, owner_image_path = ?, address_line1 = ?, address_line2 = ?, city = ?, state = ?, postal_code = ?, country = ?, gst_number = ?, fssai_certificate = ?, vehicle_registration = ?, insurance_details = ?, other_certificates = ?, approval_status = ?, submitted_at = ?, reviewed_by = NULL, reviewed_at = NULL, updated_at = ? WHERE id = ?", (*values, pending_change["id"]))
                else:
                    db.execute("INSERT INTO vendor_profile_changes (account_id, business_name, business_type, service_type, other_type, owner_image_path, address_line1, address_line2, city, state, postal_code, country, gst_number, fssai_certificate, vehicle_registration, insurance_details, other_certificates, approval_status, submitted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (vendor["id"], *values[:-1], now, values[-1]))
                if submit_for_approval:
                    db.execute("UPDATE vendor_document_requests SET status = 'Resolved', resolved_at = ? WHERE account_id = ? AND status = 'Open'", (now, vendor["id"]))
            message = "Business profile changes submitted for approval. Your currently approved details stay active until approval." if submit_for_approval else "Business profile changes saved as a draft. Your currently approved details stay active."
            self.send_json({"message": message, "ownerImagePath": image_path or active_profile["owner_image_path"], "approvalStatus": change_status, "certificateCount": stored_certificate_count, "newCertificateCount": len(certificate_documents)})
            return
        approval_status = "Submitted" if submit_for_approval else "Draft"
        now = int(time.time())
        with connection() as db:
            self.save_identity_documents(db, vendor["id"], identity_documents, tan_details)
            db.execute("INSERT INTO vendor_operating_models (account_id, operating_model, updated_at) VALUES (?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET operating_model = excluded.operating_model, updated_at = excluded.updated_at", (vendor["id"], operating_model, now))
            db.execute("INSERT INTO vendor_profiles (account_id, business_name, business_type, service_type, other_type, owner_image_path, address_line1, address_line2, city, state, postal_code, country, gst_number, fssai_certificate, vehicle_registration, insurance_details, other_certificates, approval_status, submitted_at, reviewed_by, reviewed_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?) ON CONFLICT(account_id) DO UPDATE SET business_name = excluded.business_name, business_type = excluded.business_type, service_type = excluded.service_type, other_type = excluded.other_type, owner_image_path = COALESCE(excluded.owner_image_path, vendor_profiles.owner_image_path), address_line1 = excluded.address_line1, address_line2 = excluded.address_line2, city = excluded.city, state = excluded.state, postal_code = excluded.postal_code, country = excluded.country, gst_number = excluded.gst_number, fssai_certificate = excluded.fssai_certificate, vehicle_registration = excluded.vehicle_registration, insurance_details = excluded.insurance_details, other_certificates = excluded.other_certificates, approval_status = excluded.approval_status, submitted_at = CASE WHEN excluded.approval_status = 'Submitted' THEN excluded.submitted_at ELSE NULL END, reviewed_by = NULL, reviewed_at = NULL, updated_at = excluded.updated_at", (vendor["id"], business_name, business_type, service_type, other_type or None, image_path, address_line1, address_line2 or None, city, state, postal_code, country, gst_number or None, fssai_certificate or None, vehicle_registration or None, insurance_details or None, other_certificates or None, approval_status, now if submit_for_approval else None, now))
            if submit_for_approval:
                db.execute("UPDATE vendor_document_requests SET status = 'Resolved', resolved_at = ? WHERE account_id = ? AND status = 'Open'", (now, vendor["id"]))
        message = "Business profile submitted for approval." if submit_for_approval else "Business profile saved as a draft."
        self.send_json({"message": message, "ownerImagePath": image_path, "approvalStatus": approval_status, "certificateCount": stored_certificate_count, "newCertificateCount": len(certificate_documents)})

    def vendor_save_operating_model(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        vendor = self.require_vendor()
        if not vendor:
            return
        data = self.read_json()
        operating_model = str(data.get("operatingModel", "")).strip() if data else ""
        if operating_model not in VENDOR_OPERATING_MODELS:
            self.send_json({"error": "Choose a valid vendor operating model."}, HTTPStatus.BAD_REQUEST)
            return
        with connection() as db:
            db.execute("INSERT INTO vendor_operating_models (account_id, operating_model, updated_at) VALUES (?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET operating_model = excluded.operating_model, updated_at = excluded.updated_at", (vendor["id"], operating_model, int(time.time())))
        self.send_json({"message": "Operating model saved.", "operatingModel": operating_model})

    def vendor_marketplace_setup(self) -> None:
        vendor = self.require_vendor()
        if not vendor:
            return
        with connection() as db:
            setup = db.execute("SELECT bank_account_holder, bank_account_last4, ifsc_code, tax_registration, fulfilment_method, cancellation_policy, refund_policy, agreement_accepted_at, updated_at FROM vendor_marketplace_setups WHERE account_id = ?", (vendor["id"],)).fetchone()
        if not setup:
            self.send_json({"setup": None})
            return
        self.send_json({"setup": {"bankAccountHolder": setup["bank_account_holder"], "bankAccountLast4": setup["bank_account_last4"], "ifscCode": setup["ifsc_code"], "taxRegistration": setup["tax_registration"], "fulfilmentMethod": setup["fulfilment_method"], "cancellationPolicy": setup["cancellation_policy"], "refundPolicy": setup["refund_policy"], "agreementAcceptedAt": setup["agreement_accepted_at"], "updatedAt": setup["updated_at"]}})

    def vendor_operating_setup(self) -> None:
        vendor = self.require_vendor()
        if not vendor:
            return
        model = parse_qs(urlparse(self.path).query).get("model", [""])[0]
        if model not in {"listing", "leads", "bookings"}:
            self.send_json({"error": "Choose a valid operating model."}, HTTPStatus.BAD_REQUEST)
            return
        with connection() as db:
            setup = db.execute("SELECT setup_json, completed_at, updated_at FROM vendor_operating_setups WHERE account_id = ? AND operating_model = ?", (vendor["id"], model)).fetchone()
        self.send_json({"setup": {"model": model, "details": json.loads(setup["setup_json"]), "completedAt": setup["completed_at"], "updatedAt": setup["updated_at"]} if setup else None})

    def vendor_save_operating_setup(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        vendor = self.require_vendor()
        if not vendor:
            return
        data = self.read_json()
        model = str(data.get("model", "")).strip() if data else ""
        details = data.get("details") if data else None
        if model not in {"listing", "leads", "bookings"} or not isinstance(details, dict):
            self.send_json({"error": "Provide a valid operating model and setup details."}, HTTPStatus.BAD_REQUEST)
            return
        clean = {}
        if model == "listing":
            contact_name, public_phone, public_email, contact_preference = (str(details.get(key, "")).strip() for key in ("contactName", "publicPhone", "publicEmail", "contactPreference"))
            if not 2 <= len(contact_name) <= 120 or not PHONE_PATTERN.fullmatch(public_phone) or not 5 <= len(public_email) <= 254 or "@" not in public_email or contact_preference not in {"Phone", "Email", "Both"}:
                self.send_json({"error": "Complete the public listing contact details."}, HTTPStatus.BAD_REQUEST)
                return
            clean = {"contactName": contact_name, "publicPhone": public_phone, "publicEmail": public_email, "contactPreference": contact_preference}
        elif model == "leads":
            contact_name, lead_phone, lead_email, response_time, notification_method = (str(details.get(key, "")).strip() for key in ("contactName", "leadPhone", "leadEmail", "responseTime", "notificationMethod"))
            if not 2 <= len(contact_name) <= 120 or not PHONE_PATTERN.fullmatch(lead_phone) or not 5 <= len(lead_email) <= 254 or "@" not in lead_email or response_time not in {"Within 1 hour", "Within 4 hours", "Within 1 business day", "Within 2 business days"} or notification_method not in {"Email", "Phone", "Both"}:
                self.send_json({"error": "Complete the lead contact and response details."}, HTTPStatus.BAD_REQUEST)
                return
            clean = {"contactName": contact_name, "leadPhone": lead_phone, "leadEmail": lead_email, "responseTime": response_time, "notificationMethod": notification_method}
        else:
            booking_service, service_hours, advance_notice, cancellation_policy, reschedule_policy = (str(details.get(key, "")).strip() for key in ("bookingService", "serviceHours", "advanceNotice", "cancellationPolicy", "reschedulePolicy"))
            if not 2 <= len(booking_service) <= 140 or not 5 <= len(service_hours) <= 500 or advance_notice not in {"Same day", "1 day", "2 days", "3 days", "1 week"} or not 20 <= len(cancellation_policy) <= 3000 or not 20 <= len(reschedule_policy) <= 3000:
                self.send_json({"error": "Complete your booking availability and policy details."}, HTTPStatus.BAD_REQUEST)
                return
            clean = {"bookingService": booking_service, "serviceHours": service_hours, "advanceNotice": advance_notice, "cancellationPolicy": cancellation_policy, "reschedulePolicy": reschedule_policy}
        now = int(time.time())
        with connection() as db:
            db.execute("INSERT INTO vendor_operating_setups (account_id, operating_model, setup_json, completed_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(account_id, operating_model) DO UPDATE SET setup_json = excluded.setup_json, completed_at = excluded.completed_at, updated_at = excluded.updated_at", (vendor["id"], model, json.dumps(clean), now, now))
        self.send_json({"message": f"{VENDOR_OPERATING_MODELS[model]} setup saved.", "model": model})

    def vendor_save_marketplace_setup(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        vendor = self.require_vendor()
        if not vendor:
            return
        data = self.read_json()
        if data is None:
            self.send_json({"error": "Invalid request."}, HTTPStatus.BAD_REQUEST)
            return
        holder = str(data.get("bankAccountHolder", "")).strip()
        account_number = re.sub(r"[ -]", "", str(data.get("bankAccountNumber", "")))
        ifsc_code = str(data.get("ifscCode", "")).strip().upper()
        tax_registration = str(data.get("taxRegistration", "")).strip()
        fulfilment_method = str(data.get("fulfilmentMethod", "")).strip()
        cancellation_policy = str(data.get("cancellationPolicy", "")).strip()
        refund_policy = str(data.get("refundPolicy", "")).strip()
        agreement_accepted = data.get("agreementAccepted") is True
        if not 2 <= len(holder) <= 120 or not re.fullmatch(r"[0-9]{9,18}", account_number) or not re.fullmatch(r"[A-Z]{4}0[A-Z0-9]{6}", ifsc_code):
            self.send_json({"error": "Enter a valid account holder name, 9–18 digit account number, and IFSC code."}, HTTPStatus.BAD_REQUEST)
            return
        if len(tax_registration) > 80 or fulfilment_method not in {"Self delivery", "Courier / logistics", "Service at customer location", "Customer pickup", "Mixed"} or not 20 <= len(cancellation_policy) <= 3000 or not 20 <= len(refund_policy) <= 3000:
            self.send_json({"error": "Complete fulfilment and policy details using the permitted lengths."}, HTTPStatus.BAD_REQUEST)
            return
        if not agreement_accepted:
            self.send_json({"error": "Confirm that you reviewed and accept the Vendor Agreement before saving."}, HTTPStatus.BAD_REQUEST)
            return
        now = int(time.time())
        with connection() as db:
            db.execute("INSERT INTO vendor_marketplace_setups (account_id, bank_account_holder, bank_account_last4, ifsc_code, tax_registration, fulfilment_method, cancellation_policy, refund_policy, agreement_accepted_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET bank_account_holder = excluded.bank_account_holder, bank_account_last4 = excluded.bank_account_last4, ifsc_code = excluded.ifsc_code, tax_registration = excluded.tax_registration, fulfilment_method = excluded.fulfilment_method, cancellation_policy = excluded.cancellation_policy, refund_policy = excluded.refund_policy, agreement_accepted_at = excluded.agreement_accepted_at, updated_at = excluded.updated_at", (vendor["id"], holder, account_number[-4:], ifsc_code, tax_registration or None, fulfilment_method, cancellation_policy, refund_policy, now, now))
        self.send_json({"message": "Marketplace setup saved. Account number is retained only as its last four digits.", "bankAccountLast4": account_number[-4:]})

    def vendor_review_queue(self) -> None:
        if not self.require_approver():
            return
        with connection() as db:
            profiles = db.execute("SELECT 'Initial profile' AS review_type, NULL AS change_id, v.account_id, v.business_name, v.business_type, v.service_type, v.city, v.country, v.gst_number, v.fssai_certificate, v.vehicle_registration, v.insurance_details, v.other_certificates, NULL AS current_business_name, NULL AS current_business_type, NULL AS current_service_type, NULL AS current_city, NULL AS current_country, NULL AS current_gst_number, NULL AS current_fssai_certificate, NULL AS current_vehicle_registration, NULL AS current_insurance_details, NULL AS current_other_certificates, v.submitted_at, a.first_name, a.last_name, a.email FROM vendor_profiles v JOIN accounts a ON a.id = v.account_id WHERE v.approval_status = 'Submitted' UNION ALL SELECT 'Profile edit' AS review_type, c.id AS change_id, c.account_id, c.business_name, c.business_type, c.service_type, c.city, c.country, c.gst_number, c.fssai_certificate, c.vehicle_registration, c.insurance_details, c.other_certificates, v.business_name AS current_business_name, v.business_type AS current_business_type, v.service_type AS current_service_type, v.city AS current_city, v.country AS current_country, v.gst_number AS current_gst_number, v.fssai_certificate AS current_fssai_certificate, v.vehicle_registration AS current_vehicle_registration, v.insurance_details AS current_insurance_details, v.other_certificates AS current_other_certificates, c.submitted_at, a.first_name, a.last_name, a.email FROM vendor_profile_changes c JOIN vendor_profiles v ON v.account_id = c.account_id JOIN accounts a ON a.id = c.account_id WHERE c.approval_status = 'Submitted' ORDER BY submitted_at ASC").fetchall()
            certificates = {row["account_id"]: db.execute("SELECT id, original_name FROM vendor_certificates WHERE account_id = ? ORDER BY uploaded_at DESC, id DESC", (row["account_id"],)).fetchall() for row in profiles}
        self.send_json({"profiles": [{"accountId": row["account_id"], "changeId": row["change_id"], "reviewType": row["review_type"], "businessName": row["business_name"], "businessType": row["business_type"], "serviceType": row["service_type"], "city": row["city"], "country": row["country"], "gstNumber": row["gst_number"], "fssaiCertificate": row["fssai_certificate"], "vehicleRegistration": row["vehicle_registration"], "insuranceDetails": row["insurance_details"], "otherCertificates": row["other_certificates"], "currentBusinessName": row["current_business_name"], "currentBusinessType": row["current_business_type"], "currentServiceType": row["current_service_type"], "currentCity": row["current_city"], "currentCountry": row["current_country"], "currentGstNumber": row["current_gst_number"], "currentFssaiCertificate": row["current_fssai_certificate"], "currentVehicleRegistration": row["current_vehicle_registration"], "currentInsuranceDetails": row["current_insurance_details"], "currentOtherCertificates": row["current_other_certificates"], "submittedAt": row["submitted_at"], "ownerName": f"{row['first_name']} {row['last_name']}", "email": row["email"], "certificates": [{"id": certificate["id"], "name": certificate["original_name"]} for certificate in certificates[row["account_id"]]]} for row in profiles]})

    def approve_vendor_profile(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        approver = self.require_approver()
        if not approver:
            return
        data = self.read_json()
        if data is None or not isinstance(data.get("accountId"), int):
            self.send_json({"error": "A valid Vendor account is required."}, HTTPStatus.BAD_REQUEST)
            return
        change_id = data.get("changeId")
        if change_id is not None and not isinstance(change_id, int):
            self.send_json({"error": "Invalid profile change."}, HTTPStatus.BAD_REQUEST)
            return
        if change_id is None:
            with connection() as db:
                pending_change = db.execute("SELECT id FROM vendor_profile_changes WHERE account_id = ? AND approval_status = 'Submitted' ORDER BY submitted_at DESC, id DESC LIMIT 1", (data["accountId"],)).fetchone()
            change_id = pending_change["id"] if pending_change else None
        if change_id is not None:
            now = int(time.time())
            with connection() as db:
                change = db.execute("SELECT business_name, business_type, service_type, other_type, owner_image_path, address_line1, address_line2, city, state, postal_code, country, gst_number, fssai_certificate, vehicle_registration, insurance_details, other_certificates FROM vendor_profile_changes WHERE id = ? AND account_id = ? AND approval_status = 'Submitted'", (change_id, data["accountId"])).fetchone()
                if not change:
                    self.send_json({"error": "This profile change is not awaiting approval."}, HTTPStatus.CONFLICT)
                    return
                db.execute("UPDATE vendor_profiles SET business_name = ?, business_type = ?, service_type = ?, other_type = ?, owner_image_path = ?, address_line1 = ?, address_line2 = ?, city = ?, state = ?, postal_code = ?, country = ?, gst_number = ?, fssai_certificate = ?, vehicle_registration = ?, insurance_details = ?, other_certificates = ?, approval_status = 'Approved', reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE account_id = ?", (*tuple(change), approver["id"], now, now, data["accountId"]))
                db.execute("UPDATE vendor_profile_changes SET approval_status = 'Approved', reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?", (approver["id"], now, now, change_id))
            self.send_json({"message": "Vendor profile changes approved and published."})
            return
        with connection() as db:
            result = db.execute("UPDATE vendor_profiles SET approval_status = 'Approved', reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE account_id = ? AND approval_status = 'Submitted'", (approver["id"], int(time.time()), int(time.time()), data["accountId"]))
        if result.rowcount != 1:
            self.send_json({"error": "This profile is not awaiting approval."}, HTTPStatus.CONFLICT)
            return
        self.send_json({"message": "Vendor business profile approved."})

    def request_vendor_documents(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        approver = self.require_approver()
        if not approver:
            return
        data = self.read_json()
        if data is None or not isinstance(data.get("accountId"), int):
            self.send_json({"error": "A valid Vendor account is required."}, HTTPStatus.BAD_REQUEST)
            return
        change_id = data.get("changeId")
        if change_id is not None and not isinstance(change_id, int):
            self.send_json({"error": "Invalid profile change."}, HTTPStatus.BAD_REQUEST)
            return
        if change_id is None:
            with connection() as db:
                pending_change = db.execute("SELECT id FROM vendor_profile_changes WHERE account_id = ? AND approval_status = 'Submitted' ORDER BY submitted_at DESC, id DESC LIMIT 1", (data["accountId"],)).fetchone()
            change_id = pending_change["id"] if pending_change else None
        request_message = str(data.get("message", "")).strip()
        if not 10 <= len(request_message) <= 2000:
            self.send_json({"error": "Explain the required documents in 10 to 2,000 characters."}, HTTPStatus.BAD_REQUEST)
            return
        now = int(time.time())
        with connection() as db:
            vendor = db.execute("SELECT id, first_name, last_name, email, phone, role FROM accounts WHERE id = ?", (data["accountId"],)).fetchone()
            if not vendor or vendor["role"] != "Vendor":
                self.send_json({"error": "Vendor account was not found."}, HTTPStatus.NOT_FOUND)
                return
            if change_id is None:
                profile = db.execute("UPDATE vendor_profiles SET approval_status = 'Documents requested', reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE account_id = ? AND approval_status = 'Submitted'", (approver["id"], now, now, vendor["id"]))
            else:
                profile = db.execute("UPDATE vendor_profile_changes SET approval_status = 'Documents requested', reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ? AND account_id = ? AND approval_status = 'Submitted'", (approver["id"], now, now, change_id, vendor["id"]))
            if profile.rowcount != 1:
                self.send_json({"error": "This profile is not awaiting approval."}, HTTPStatus.CONFLICT)
                return
            request = db.execute("INSERT INTO vendor_document_requests (account_id, requested_by, message, requested_at) VALUES (?, ?, ?, ?)", (vendor["id"], approver["id"], request_message, now))
            request_id = request.lastrowid
        delivery = self.send_document_request_notifications(vendor, request_message)
        with connection() as db:
            db.execute("UPDATE vendor_document_requests SET email_sent = ?, sms_sent = ? WHERE id = ?", (int(delivery["emailSent"]), int(delivery["smsSent"]), request_id))
        channels = []
        if delivery["emailSent"]:
            channels.append("email")
        if delivery["smsSent"]:
            channels.append("SMS")
        delivery_message = f" Notification sent by {' and '.join(channels)}." if channels else " Configure email or SMS credentials to send an external notification."
        self.send_json({"message": f"Document request saved.{delivery_message}", "emailSent": delivery["emailSent"], "smsSent": delivery["smsSent"]})

    def send_document_request_notifications(self, vendor: sqlite3.Row, request_message: str) -> dict[str, bool]:
        business_name = "your business"
        with connection() as db:
            profile = db.execute("SELECT business_name FROM vendor_profiles WHERE account_id = ?", (vendor["id"],)).fetchone()
            if profile:
                business_name = profile["business_name"]
        subject = "SHAKALPA: additional business documents required"
        body = f"Hello {vendor['first_name']},\n\nAdditional documents are required for {business_name} before approval.\n\nRequest from SHAKALPA:\n{request_message}\n\nSign in to your Vendor workspace to upload the requested documents and submit again."
        email_sent = False
        sms_sent = False
        if SMTP_HOST and SMTP_FROM:
            try:
                email = EmailMessage()
                email["Subject"] = subject
                email["From"] = SMTP_FROM
                email["To"] = vendor["email"]
                email.set_content(body)
                with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
                    if os.getenv("SMTP_USE_TLS", "1") != "0":
                        smtp.starttls()
                    if SMTP_USER:
                        smtp.login(SMTP_USER, SMTP_PASSWORD)
                    smtp.send_message(email)
                email_sent = True
            except (OSError, smtplib.SMTPException):
                pass
        if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER:
            try:
                sms_body = f"SHAKALPA: additional documents are required for {business_name}. {request_message[:600]} Sign in to upload and submit again."
                authorization = base64.b64encode(f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode("utf-8")).decode("ascii")
                request = urllib.request.Request(f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json", data=urlencode({"To": vendor["phone"], "From": TWILIO_FROM_NUMBER, "Body": sms_body}).encode("utf-8"), headers={"Authorization": f"Basic {authorization}", "Content-Type": "application/x-www-form-urlencoded"}, method="POST")
                with urllib.request.urlopen(request, timeout=10):
                    pass
                sms_sent = True
            except (urllib.error.URLError, urllib.error.HTTPError, ValueError):
                pass
        return {"emailSent": email_sent, "smsSent": sms_sent}

    def registration_fee_paise(self) -> int:
        with connection() as db:
            fee = db.execute("SELECT setting_value FROM payment_settings WHERE setting_key = 'vendor_registration_fee_paise'").fetchone()
        try:
            return max(0, int(fee["setting_value"])) if fee else 0
        except (TypeError, ValueError):
            return 0

    def product_entry_fee_paise(self) -> int:
        with connection() as db:
            fee = db.execute("SELECT setting_value FROM payment_settings WHERE setting_key = 'product_entry_fee_paise'").fetchone()
        try:
            return max(0, int(fee["setting_value"])) if fee else 0
        except (TypeError, ValueError):
            return 0

    def admin_payment_settings(self) -> None:
        if not self.require_admin():
            return
        fee_paise = self.registration_fee_paise()
        self.send_json({"vendorRegistrationFeePaise": fee_paise, "productEntryFeePaise": self.product_entry_fee_paise(), "currency": "INR", "gatewayConfigured": bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)})

    def admin_save_payment_settings(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        admin = self.require_admin()
        if not admin:
            return
        data = self.read_json()
        if data is None or not isinstance(data.get("vendorRegistrationFeePaise"), int) or not isinstance(data.get("productEntryFeePaise"), int):
            self.send_json({"error": "Enter valid Vendor registration and product entry fees."}, HTTPStatus.BAD_REQUEST)
            return
        fee_paise = data["vendorRegistrationFeePaise"]
        product_fee_paise = data["productEntryFeePaise"]
        if not 0 <= fee_paise <= 100_000_000 or not 0 <= product_fee_paise <= 100_000_000:
            self.send_json({"error": "Fees must be between ₹0 and ₹1,000,000."}, HTTPStatus.BAD_REQUEST)
            return
        with connection() as db:
            db.execute("INSERT INTO payment_settings (setting_key, setting_value, updated_by, updated_at) VALUES ('vendor_registration_fee_paise', ?, ?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_by = excluded.updated_by, updated_at = excluded.updated_at", (str(fee_paise), admin["id"], int(time.time())))
            db.execute("INSERT INTO payment_settings (setting_key, setting_value, updated_by, updated_at) VALUES ('product_entry_fee_paise', ?, ?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_by = excluded.updated_by, updated_at = excluded.updated_at", (str(product_fee_paise), admin["id"], int(time.time())))
        self.send_json({"message": "Payment fees updated.", "vendorRegistrationFeePaise": fee_paise, "productEntryFeePaise": product_fee_paise, "gatewayConfigured": bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)})

    def market_rates(self) -> None:
        with connection() as db:
            rows = db.execute("SELECT setting_key, setting_value, updated_at FROM payment_settings WHERE setting_key IN ('sensex_value', 'gold_22k_per_gram', 'gold_24k_per_gram', 'silver_per_gram')").fetchall()
        values = {row["setting_key"]: row["setting_value"] for row in rows}
        updated_at = max((row["updated_at"] for row in rows), default=None)
        self.send_json({"sensex": values.get("sensex_value", ""), "gold22k": values.get("gold_22k_per_gram", ""), "gold24k": values.get("gold_24k_per_gram", ""), "silver": values.get("silver_per_gram", ""), "updatedAt": updated_at})

    def admin_market_rates(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        admin = self.require_admin()
        if not admin: return
        data = self.read_json() or {}
        fields = {"sensex": "sensex_value", "gold22k": "gold_22k_per_gram", "gold24k": "gold_24k_per_gram", "silver": "silver_per_gram"}
        values: dict[str, float] = {}
        for source, key in fields.items():
            value = data.get(source)
            if not isinstance(value, (int, float)) or isinstance(value, bool) or not 0 <= value <= 10_000_000:
                self.send_json({"error": "Enter valid non-negative market values."}, HTTPStatus.BAD_REQUEST); return
            values[key] = float(value)
        now = int(time.time())
        with connection() as db:
            for key, value in values.items(): db.execute("INSERT INTO payment_settings (setting_key, setting_value, updated_by, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_by = excluded.updated_by, updated_at = excluded.updated_at", (key, str(value), admin["id"], now))
        self.send_json({"message": "Market rates updated.", "updatedAt": now})

    def vendor_payment_components(self, vendor_id: int) -> tuple[int, int, list[int], bool]:
        registration_fee = self.registration_fee_paise()
        product_fee = self.product_entry_fee_paise()
        with connection() as db:
            registration_paid = db.execute("SELECT 1 FROM vendor_registration_payments WHERE account_id = ? AND status = 'Paid' LIMIT 1", (vendor_id,)).fetchone()
            product_rows = db.execute("SELECT id FROM vendor_products WHERE vendor_id = ? AND status = 'Awaiting payment' ORDER BY id", (vendor_id,)).fetchall()
        registration_due = 0 if registration_paid else registration_fee
        product_ids = [int(row["id"]) for row in product_rows]
        return registration_due, product_fee * len(product_ids), product_ids, bool(registration_paid)

    def vendor_payment_summary(self) -> None:
        vendor = self.require_vendor()
        if not vendor:
            return
        registration_due, product_due, product_ids, registration_paid = self.vendor_payment_components(vendor["id"])
        with connection() as db:
            product_count = db.execute("SELECT COUNT(*) AS count FROM vendor_products WHERE vendor_id = ?", (vendor["id"],)).fetchone()["count"]
        self.send_json({"currency": "INR", "registrationDuePaise": registration_due, "registrationPaid": registration_paid, "productDuePaise": product_due, "awaitingProductCount": len(product_ids), "productCount": product_count, "totalPayablePaise": registration_due + product_due, "gatewayConfigured": bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)})

    def vendor_create_combined_payment_order(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        vendor = self.require_vendor()
        if not vendor:
            return
        if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
            self.send_json({"error": "Payment gateway is not configured. Contact an administrator."}, HTTPStatus.SERVICE_UNAVAILABLE)
            return
        registration_due, product_due, product_ids, _ = self.vendor_payment_components(vendor["id"])
        total = registration_due + product_due
        if total <= 0:
            self.send_json({"error": "There are no payment fees due."}, HTTPStatus.BAD_REQUEST)
            return
        order, error = self.razorpay_create_order(total, f"vendor-total-{vendor['id']}-{secrets.token_hex(8)}", {"vendor_account_id": str(vendor["id"]), "purpose": "Vendor combined fees"})
        if error or not order or not isinstance(order.get("id"), str):
            self.send_json({"error": error or "Could not create the payment order."}, HTTPStatus.BAD_GATEWAY)
            return
        with connection() as db:
            db.execute("CREATE TABLE IF NOT EXISTS vendor_combined_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, provider_order_id TEXT NOT NULL UNIQUE, registration_amount_paise INTEGER NOT NULL, product_amount_paise INTEGER NOT NULL, product_ids TEXT NOT NULL, amount_paise INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'Created', provider_payment_id TEXT, verified_at INTEGER, created_at INTEGER NOT NULL, FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE)")
            db.execute("INSERT INTO vendor_combined_payments (account_id, provider_order_id, registration_amount_paise, product_amount_paise, product_ids, amount_paise, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", (vendor["id"], order["id"], registration_due, product_due, json.dumps(product_ids), total, int(time.time())))
        self.send_json({"keyId": RAZORPAY_KEY_ID, "orderId": order["id"], "amount": total, "currency": "INR", "name": "SHAKALPA", "description": "Vendor registration and product entry fees"})

    def vendor_verify_combined_payment(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        vendor = self.require_vendor()
        if not vendor:
            return
        data = self.read_json() or {}
        order_id = str(data.get("razorpay_order_id", "")); payment_id = str(data.get("razorpay_payment_id", "")); signature = str(data.get("razorpay_signature", ""))
        expected = hmac.new(RAZORPAY_KEY_SECRET.encode("utf-8"), f"{order_id}|{payment_id}".encode("utf-8"), hashlib.sha256).hexdigest()
        if not RAZORPAY_KEY_SECRET or not all((order_id, payment_id, signature)) or not hmac.compare_digest(expected, signature):
            self.send_json({"error": "Payment verification failed."}, HTTPStatus.FORBIDDEN)
            return
        with connection() as db:
            payment = db.execute("SELECT * FROM vendor_combined_payments WHERE account_id = ? AND provider_order_id = ? AND status = 'Created'", (vendor["id"], order_id)).fetchone()
            if not payment:
                self.send_json({"error": "Payment order was not found or was already processed."}, HTTPStatus.CONFLICT)
                return
            now = int(time.time())
            db.execute("UPDATE vendor_combined_payments SET status = 'Paid', provider_payment_id = ?, verified_at = ? WHERE id = ?", (payment_id, now, payment["id"]))
            if payment["registration_amount_paise"] > 0:
                db.execute("INSERT INTO vendor_registration_payments (account_id, provider_order_id, amount_paise, currency, status, provider_payment_id, verified_at, created_at) VALUES (?, ?, ?, 'INR', 'Paid', ?, ?, ?)", (vendor["id"], order_id, payment["registration_amount_paise"], payment_id, now, now))
            product_ids = json.loads(payment["product_ids"])
            for product_id in product_ids:
                product = db.execute("SELECT id FROM vendor_products WHERE id = ? AND vendor_id = ? AND status = 'Awaiting payment'", (product_id, vendor["id"])).fetchone()
                if product:
                    db.execute("INSERT INTO product_entry_payments (product_id, vendor_id, provider_order_id, amount_paise, status, provider_payment_id, verified_at, created_at) VALUES (?, ?, ?, ?, 'Paid', ?, ?, ?) ON CONFLICT(product_id) DO UPDATE SET provider_order_id = excluded.provider_order_id, amount_paise = excluded.amount_paise, status = 'Paid', provider_payment_id = excluded.provider_payment_id, verified_at = excluded.verified_at, created_at = excluded.created_at", (product_id, vendor["id"], f"{order_id}-product-{product_id}", self.product_entry_fee_paise(), payment_id, now, now))
                    db.execute("UPDATE vendor_products SET status = 'Published', published_at = ? WHERE id = ? AND vendor_id = ?", (now, product_id, vendor["id"]))
        self.send_json({"message": "Combined Vendor payment verified. Registration and eligible product fees are paid."})

    def vendor_registration_payment(self) -> None:
        vendor = self.require_vendor()
        if not vendor:
            return
        fee_paise = self.registration_fee_paise()
        with connection() as db:
            payment = db.execute("SELECT provider_payment_id, verified_at FROM vendor_registration_payments WHERE account_id = ? AND status = 'Paid' ORDER BY verified_at DESC LIMIT 1", (vendor["id"],)).fetchone()
        self.send_json({"feePaise": fee_paise, "currency": "INR", "paid": bool(payment), "paymentId": payment["provider_payment_id"] if payment else None, "gatewayConfigured": bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)})

    def razorpay_create_order(self, amount_paise: int, receipt: str, notes: dict[str, str]) -> tuple[dict | None, str | None]:
        authorization = base64.b64encode(f"{RAZORPAY_KEY_ID}:{RAZORPAY_KEY_SECRET}".encode("utf-8")).decode("ascii")
        payload = json.dumps({"amount": amount_paise, "currency": "INR", "receipt": receipt, "notes": notes}).encode("utf-8")
        request = urllib.request.Request("https://api.razorpay.com/v1/orders", data=payload, headers={"Authorization": f"Basic {authorization}", "Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                return json.loads(response.read().decode("utf-8")), None
        except (urllib.error.URLError, urllib.error.HTTPError, ValueError, json.JSONDecodeError):
            return None, "The payment gateway could not create an order. Try again shortly."

    def vendor_create_registration_order(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        vendor = self.require_vendor()
        if not vendor:
            return
        fee_paise = self.registration_fee_paise()
        if fee_paise <= 0:
            self.send_json({"error": "No Vendor registration fee is currently required."}, HTTPStatus.BAD_REQUEST)
            return
        if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
            self.send_json({"error": "Payment gateway is not configured. Contact an administrator."}, HTTPStatus.SERVICE_UNAVAILABLE)
            return
        with connection() as db:
            paid = db.execute("SELECT 1 FROM vendor_registration_payments WHERE account_id = ? AND status = 'Paid' LIMIT 1", (vendor["id"],)).fetchone()
        if paid:
            self.send_json({"error": "Vendor registration fee has already been paid."}, HTTPStatus.CONFLICT)
            return
        receipt = f"vendor-{vendor['id']}-{secrets.token_hex(8)}"
        order, error = self.razorpay_create_order(fee_paise, receipt, {"vendor_account_id": str(vendor["id"]), "purpose": "Vendor registration fee"})
        if error or not order or not isinstance(order.get("id"), str):
            self.send_json({"error": error or "Could not create the payment order."}, HTTPStatus.BAD_GATEWAY)
            return
        with connection() as db:
            db.execute("INSERT INTO vendor_registration_payments (account_id, provider_order_id, amount_paise, currency, created_at) VALUES (?, ?, ?, 'INR', ?)", (vendor["id"], order["id"], fee_paise, int(time.time())))
        self.send_json({"keyId": RAZORPAY_KEY_ID, "orderId": order["id"], "amount": fee_paise, "currency": "INR", "name": "SHAKALPA", "description": "Vendor registration fee"})

    def vendor_verify_registration_payment(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        vendor = self.require_vendor()
        if not vendor:
            return
        data = self.read_json()
        order_id = str(data.get("razorpay_order_id", "")) if data else ""
        payment_id = str(data.get("razorpay_payment_id", "")) if data else ""
        signature = str(data.get("razorpay_signature", "")) if data else ""
        if not all((order_id, payment_id, signature)) or len(order_id) > 100 or len(payment_id) > 100 or len(signature) > 200:
            self.send_json({"error": "Invalid payment verification response."}, HTTPStatus.BAD_REQUEST)
            return
        expected = hmac.new(RAZORPAY_KEY_SECRET.encode("utf-8"), f"{order_id}|{payment_id}".encode("utf-8"), hashlib.sha256).hexdigest()
        if not RAZORPAY_KEY_SECRET or not hmac.compare_digest(expected, signature):
            self.send_json({"error": "Payment verification failed."}, HTTPStatus.FORBIDDEN)
            return
        with connection() as db:
            result = db.execute("UPDATE vendor_registration_payments SET status = 'Paid', provider_payment_id = ?, verified_at = ? WHERE account_id = ? AND provider_order_id = ? AND status = 'Created'", (payment_id, int(time.time()), vendor["id"], order_id))
        if result.rowcount != 1:
            self.send_json({"error": "Payment order was not found or was already processed."}, HTTPStatus.CONFLICT)
            return
        self.send_json({"message": "Vendor registration fee payment verified."})

    def product_media_rows(self, db: sqlite3.Connection, product_ids: list[int]) -> dict[int, list[str]]:
        if not product_ids:
            return {}
        placeholders = ",".join("?" for _ in product_ids)
        rows = db.execute(f"SELECT product_id, storage_name FROM product_media WHERE product_id IN ({placeholders}) ORDER BY id", product_ids).fetchall()
        media: dict[int, list[str]] = {product_id: [] for product_id in product_ids}
        for row in rows:
            media[row["product_id"]].append(f"/uploads/{row['storage_name']}")
        return media

    def vendor_products(self) -> None:
        vendor = self.require_vendor()
        if not vendor:
            return
        with connection() as db:
            products = db.execute("SELECT id, product_name, product_description, product_category, product_type, search_keywords, product_specifications, customer_actions, cost_paise, tax_details, available_quantity, delivery_charges_paise, self_delivery, status, created_at FROM vendor_products WHERE vendor_id = ? ORDER BY created_at DESC", (vendor["id"],)).fetchall()
            media = self.product_media_rows(db, [row["id"] for row in products])
        fee = self.product_entry_fee_paise()
        awaiting = sum(row["status"] == "Awaiting payment" for row in products)
        self.send_json({"products": [{"id": row["id"], "name": row["product_name"], "description": row["product_description"], "category": row["product_category"], "productType": row["product_type"], "keywords": row["search_keywords"], "specifications": row["product_specifications"], "customerActions": json.loads(row["customer_actions"]), "costPaise": row["cost_paise"], "taxDetails": row["tax_details"], "availableQuantity": row["available_quantity"], "deliveryChargesPaise": row["delivery_charges_paise"], "selfDelivery": bool(row["self_delivery"]), "status": row["status"], "media": media.get(row["id"], [])} for row in products], "productEntryFeePaise": fee, "totalPayablePaise": awaiting * fee, "gatewayConfigured": bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)})

    def save_product_media(self, product_id: int, raw_media: object) -> str | None:
        if not isinstance(raw_media, list) or not 1 <= len(raw_media) <= 5:
            return "Upload one to five product images or a short video."
        allowed = {"image/jpeg": (b"\xff\xd8\xff", ".jpg"), "image/png": (b"\x89PNG\r\n\x1a\n", ".png"), "image/webp": (b"RIFF", ".webp"), "video/mp4": (b"ftyp", ".mp4"), "video/webm": (b"\x1aE\xdf\xa3", ".webm")}
        saved: list[tuple[str, str]] = []
        video_count = 0
        for raw in raw_media:
            if not isinstance(raw, str):
                return "Upload valid product media files."
            try:
                header, encoded = raw.split(",", 1)
                mime = header.removeprefix("data:").removesuffix(";base64")
                blob = base64.b64decode(encoded, validate=True)
            except (ValueError, binascii.Error):
                return "A product media file could not be read."
            if not header.endswith(";base64") or mime not in allowed or not blob or len(blob) > 8 * 1024 * 1024:
                return "Use JPEG, PNG, WebP, MP4, or WebM files smaller than 8 MB."
            signature, extension = allowed[mime]
            if (mime in {"video/mp4"} and signature not in blob[:32]) or (mime not in {"video/mp4"} and not blob.startswith(signature)):
                return "A product media file does not match its stated type."
            if mime.startswith("video/"):
                video_count += 1
            filename = f"product-{secrets.token_hex(16)}{extension}"
            (UPLOADS / filename).write_bytes(blob)
            saved.append((filename, mime))
        if video_count > 1:
            return "Upload no more than one short video per product."
        with connection() as db:
            db.executemany("INSERT INTO product_media (product_id, storage_name, media_type, created_at) VALUES (?, ?, ?, ?)", [(product_id, filename, mime, int(time.time())) for filename, mime in saved])
        return None

    def vendor_create_product(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        vendor = self.require_vendor()
        if not vendor:
            return
        with connection() as db:
            approved = db.execute("SELECT 1 FROM vendor_profiles WHERE account_id = ? AND approval_status = 'Approved'", (vendor["id"],)).fetchone()
        if not approved:
            self.send_json({"error": "Your business profile must be approved before adding products."}, HTTPStatus.FORBIDDEN)
            return
        data = self.read_json()
        if data is None:
            self.send_json({"error": "Invalid product request."}, HTTPStatus.BAD_REQUEST)
            return
        name = str(data.get("name", "")).strip(); description = str(data.get("description", "")).strip(); tax = str(data.get("taxDetails", "")).strip(); category = str(data.get("category", "")).strip(); product_type = str(data.get("productType", "")).strip(); keywords = str(data.get("keywords", "")).strip(); specifications = str(data.get("specifications", "")).strip()
        cost = data.get("costPaise"); quantity = data.get("availableQuantity"); delivery = data.get("deliveryChargesPaise")
        actions = data.get("customerActions", ["Buy"])
        if not isinstance(actions, list) or not actions or any(action not in {"Buy", "Book", "Call", "Callback"} for action in actions):
            self.send_json({"error": "Choose at least one valid customer action."}, HTTPStatus.BAD_REQUEST)
            return
        if not 2 <= len(name) <= 140 or not 2 <= len(category) <= 80 or not 2 <= len(product_type) <= 80 or len(keywords) > 400 or len(specifications) > 2000 or not 10 <= len(description) <= 5000 or len(tax) > 500 or not isinstance(cost, int) or not isinstance(quantity, int) or not isinstance(delivery, int) or not 0 <= cost <= 100_000_000 or not 0 <= delivery <= 100_000_000 or not 0 <= quantity <= 1_000_000:
            self.send_json({"error": "Complete valid product details, pricing, and quantity."}, HTTPStatus.BAD_REQUEST)
            return
        status = "Published" if self.product_entry_fee_paise() == 0 else "Awaiting payment"
        now = int(time.time())
        with connection() as db:
            product = db.execute("INSERT INTO vendor_products (vendor_id, product_name, product_description, product_category, product_type, search_keywords, product_specifications, customer_actions, cost_paise, tax_details, available_quantity, delivery_charges_paise, self_delivery, status, created_at, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (vendor["id"], name, description, category, product_type, keywords, specifications, json.dumps(sorted(set(actions))), cost, tax or None, quantity, delivery, int(data.get("selfDelivery") is True), status, now, now if status == "Published" else None))
            product_id = product.lastrowid
        media_error = self.save_product_media(product_id, data.get("media"))
        if media_error:
            with connection() as db:
                db.execute("DELETE FROM vendor_products WHERE id = ? AND vendor_id = ?", (product_id, vendor["id"]))
            self.send_json({"error": media_error}, HTTPStatus.BAD_REQUEST)
            return
        self.send_json({"message": "Product published." if status == "Published" else "Product saved. Pay the product entry fee to publish it.", "productId": product_id, "status": status}, HTTPStatus.CREATED)

    def vendor_update_product(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        vendor = self.require_vendor()
        if not vendor:
            return
        data = self.read_json()
        if data is None or not isinstance(data.get("productId"), int):
            self.send_json({"error": "Choose a valid product to edit."}, HTTPStatus.BAD_REQUEST)
            return
        name = str(data.get("name", "")).strip(); description = str(data.get("description", "")).strip(); tax = str(data.get("taxDetails", "")).strip(); category = str(data.get("category", "")).strip(); product_type = str(data.get("productType", "")).strip(); keywords = str(data.get("keywords", "")).strip(); specifications = str(data.get("specifications", "")).strip()
        cost = data.get("costPaise"); quantity = data.get("availableQuantity"); delivery = data.get("deliveryChargesPaise")
        actions = data.get("customerActions", ["Buy"])
        if not isinstance(actions, list) or not actions or any(action not in {"Buy", "Book", "Call", "Callback"} for action in actions):
            self.send_json({"error": "Choose at least one valid customer action."}, HTTPStatus.BAD_REQUEST)
            return
        if not 2 <= len(name) <= 140 or not 2 <= len(category) <= 80 or not 2 <= len(product_type) <= 80 or len(keywords) > 400 or len(specifications) > 2000 or not 10 <= len(description) <= 5000 or len(tax) > 500 or not isinstance(cost, int) or not isinstance(quantity, int) or not isinstance(delivery, int) or not 0 <= cost <= 100_000_000 or not 0 <= delivery <= 100_000_000 or not 0 <= quantity <= 1_000_000:
            self.send_json({"error": "Complete valid product details, pricing, and quantity."}, HTTPStatus.BAD_REQUEST)
            return
        with connection() as db:
            product = db.execute("SELECT id FROM vendor_products WHERE id = ? AND vendor_id = ?", (data["productId"], vendor["id"])).fetchone()
            if not product:
                self.send_json({"error": "Product was not found."}, HTTPStatus.NOT_FOUND)
                return
            db.execute("UPDATE vendor_products SET product_name = ?, product_description = ?, product_category = ?, product_type = ?, search_keywords = ?, product_specifications = ?, customer_actions = ?, cost_paise = ?, tax_details = ?, available_quantity = ?, delivery_charges_paise = ?, self_delivery = ? WHERE id = ? AND vendor_id = ?", (name, description, category, product_type, keywords, specifications, json.dumps(sorted(set(actions))), cost, tax or None, quantity, delivery, int(data.get("selfDelivery") is True), data["productId"], vendor["id"]))
        if data.get("media"):
            media_error = self.save_product_media(data["productId"], data["media"])
            if media_error:
                self.send_json({"error": media_error}, HTTPStatus.BAD_REQUEST)
                return
        self.send_json({"message": "Product changes saved."})

    def vendor_create_product_order(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        vendor = self.require_vendor()
        if not vendor: return
        data = self.read_json(); product_id = data.get("productId") if data else None
        if not isinstance(product_id, int): self.send_json({"error": "Choose a valid product."}, HTTPStatus.BAD_REQUEST); return
        fee = self.product_entry_fee_paise()
        if fee <= 0: self.send_json({"error": "No product entry fee is currently required."}, HTTPStatus.BAD_REQUEST); return
        if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET: self.send_json({"error": "Payment gateway is not configured."}, HTTPStatus.SERVICE_UNAVAILABLE); return
        with connection() as db:
            product = db.execute("SELECT id, product_name FROM vendor_products WHERE id = ? AND vendor_id = ? AND status = 'Awaiting payment'", (product_id, vendor["id"])).fetchone()
        if not product: self.send_json({"error": "Product is not awaiting payment."}, HTTPStatus.CONFLICT); return
        order, error = self.razorpay_create_order(fee, f"product-{product_id}-{secrets.token_hex(6)}", {"vendor_account_id": str(vendor["id"]), "product_id": str(product_id), "purpose": "Product entry fee"})
        if error or not order: self.send_json({"error": error or "Could not create payment order."}, HTTPStatus.BAD_GATEWAY); return
        with connection() as db:
            db.execute("INSERT INTO product_entry_payments (product_id, vendor_id, provider_order_id, amount_paise, status, provider_payment_id, verified_at, created_at) VALUES (?, ?, ?, ?, 'Created', NULL, NULL, ?) ON CONFLICT(product_id) DO UPDATE SET provider_order_id = excluded.provider_order_id, amount_paise = excluded.amount_paise, status = 'Created', provider_payment_id = NULL, verified_at = NULL, created_at = excluded.created_at", (product_id, vendor["id"], order["id"], fee, int(time.time())))
        self.send_json({"keyId": RAZORPAY_KEY_ID, "orderId": order["id"], "amount": fee, "currency": "INR", "name": "SHAKALPA", "description": f"Product entry fee: {product['product_name']}"})

    def vendor_verify_product_payment(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        vendor = self.require_vendor()
        if not vendor: return
        data = self.read_json() or {}; order_id = str(data.get("razorpay_order_id", "")); payment_id = str(data.get("razorpay_payment_id", "")); signature = str(data.get("razorpay_signature", ""))
        expected = hmac.new(RAZORPAY_KEY_SECRET.encode("utf-8"), f"{order_id}|{payment_id}".encode("utf-8"), hashlib.sha256).hexdigest()
        if not RAZORPAY_KEY_SECRET or not all((order_id, payment_id, signature)) or not hmac.compare_digest(expected, signature): self.send_json({"error": "Payment verification failed."}, HTTPStatus.FORBIDDEN); return
        with connection() as db:
            payment = db.execute("SELECT product_id FROM product_entry_payments WHERE vendor_id = ? AND provider_order_id = ? AND status = 'Created'", (vendor["id"], order_id)).fetchone()
            if not payment: self.send_json({"error": "Payment order was not found."}, HTTPStatus.CONFLICT); return
            db.execute("UPDATE product_entry_payments SET status = 'Paid', provider_payment_id = ?, verified_at = ? WHERE provider_order_id = ?", (payment_id, int(time.time()), order_id))
            db.execute("UPDATE vendor_products SET status = 'Published', published_at = ? WHERE id = ? AND vendor_id = ?", (int(time.time()), payment["product_id"], vendor["id"]))
        self.send_json({"message": "Product entry payment verified. Your product is now visible to customers."})

    def ensure_media_tables(self, db: sqlite3.Connection) -> None:
        db.execute("CREATE TABLE IF NOT EXISTS media_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, caption TEXT NOT NULL, created_at INTEGER NOT NULL, FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE)")
        if "aspect_ratio" not in {column["name"] for column in db.execute("PRAGMA table_info(media_posts)").fetchall()}:
            db.execute("ALTER TABLE media_posts ADD COLUMN aspect_ratio TEXT NOT NULL DEFAULT '16:9'")
        db.execute("CREATE TABLE IF NOT EXISTS media_post_files (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL, storage_name TEXT NOT NULL, media_type TEXT NOT NULL, FOREIGN KEY(post_id) REFERENCES media_posts(id) ON DELETE CASCADE)")
        db.execute("CREATE TABLE IF NOT EXISTS media_likes (post_id INTEGER NOT NULL, account_id INTEGER NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(post_id, account_id), FOREIGN KEY(post_id) REFERENCES media_posts(id) ON DELETE CASCADE, FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE)")
        db.execute("CREATE TABLE IF NOT EXISTS media_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL, account_id INTEGER NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL, FOREIGN KEY(post_id) REFERENCES media_posts(id) ON DELETE CASCADE, FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE)")
        db.execute("CREATE TABLE IF NOT EXISTS media_direct_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL, sender_id INTEGER NOT NULL, recipient_id INTEGER NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL, FOREIGN KEY(post_id) REFERENCES media_posts(id) ON DELETE CASCADE, FOREIGN KEY(sender_id) REFERENCES accounts(id) ON DELETE CASCADE, FOREIGN KEY(recipient_id) REFERENCES accounts(id) ON DELETE CASCADE)")
        db.execute("CREATE TABLE IF NOT EXISTS media_follows (follower_id INTEGER NOT NULL, following_id INTEGER NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(follower_id, following_id), FOREIGN KEY(follower_id) REFERENCES accounts(id) ON DELETE CASCADE, FOREIGN KEY(following_id) REFERENCES accounts(id) ON DELETE CASCADE)")
        db.execute("CREATE TABLE IF NOT EXISTS media_saves (post_id INTEGER NOT NULL, account_id INTEGER NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(post_id, account_id), FOREIGN KEY(post_id) REFERENCES media_posts(id) ON DELETE CASCADE, FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE)")
        db.execute("CREATE TABLE IF NOT EXISTS media_save_tags (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, name TEXT NOT NULL COLLATE NOCASE, created_at INTEGER NOT NULL, UNIQUE(account_id, name), FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE)")
        db.execute("CREATE TABLE IF NOT EXISTS media_save_tag_posts (tag_id INTEGER NOT NULL, post_id INTEGER NOT NULL, PRIMARY KEY(tag_id, post_id), FOREIGN KEY(tag_id) REFERENCES media_save_tags(id) ON DELETE CASCADE, FOREIGN KEY(post_id) REFERENCES media_posts(id) ON DELETE CASCADE)")
        db.execute("CREATE TABLE IF NOT EXISTS media_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL, reporter_id INTEGER NOT NULL, reason TEXT NOT NULL, details TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, UNIQUE(post_id, reporter_id), FOREIGN KEY(post_id) REFERENCES media_posts(id) ON DELETE CASCADE, FOREIGN KEY(reporter_id) REFERENCES accounts(id) ON DELETE CASCADE)")

    def media_content_block_reason(self, text: str) -> str | None:
        normalized = re.sub(r"\s+", " ", text.casefold())
        for reason, terms in MEDIA_BLOCKED_TERMS.items():
            if any(re.search(rf"(?<!\w){re.escape(term)}(?!\w)", normalized) for term in terms):
                return reason
        return None

    def media_actor(self) -> sqlite3.Row | None:
        account = self.current_account()
        if not account or account["role"] not in {"Vendor", "Customer"}:
            self.send_json({"error": "Sign in as a Vendor or Customer to use media."}, HTTPStatus.FORBIDDEN)
            return None
        return account

    def save_media_files(self, post_id: int, raw_media: object) -> str | None:
        if not isinstance(raw_media, list) or not 1 <= len(raw_media) <= 4:
            return "Upload one to four promotional images or videos."
        saved: list[tuple[str, str]] = []
        allowed = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "video/mp4": ".mp4", "video/webm": ".webm"}
        for raw in raw_media:
            if not isinstance(raw, str): return "Upload valid media files."
            try:
                header, encoded = raw.split(",", 1); mime = header.removeprefix("data:").removesuffix(";base64"); blob = base64.b64decode(encoded, validate=True)
            except (ValueError, binascii.Error): return "A media file could not be read."
            if not header.endswith(";base64") or mime not in allowed or not blob or len(blob) > 8 * 1024 * 1024: return "Use JPEG, PNG, WebP, MP4, or WebM files smaller than 8 MB."
            filename = f"media-{secrets.token_hex(16)}{allowed[mime]}"; (UPLOADS / filename).write_bytes(blob); saved.append((filename, mime))
        with connection() as db:
            self.ensure_media_tables(db); db.executemany("INSERT INTO media_post_files (post_id, storage_name, media_type) VALUES (?, ?, ?)", [(post_id, name, media_type) for name, media_type in saved])
        return None

    def media_posts(self, account_id: int | None = None) -> None:
        viewer = self.current_account()
        with connection() as db:
            self.ensure_media_tables(db)
            query = "SELECT p.id, p.account_id, p.caption, p.created_at, a.first_name, a.last_name, a.role FROM media_posts p JOIN accounts a ON a.id = p.account_id"
            parameters: tuple[object, ...] = ()
            if account_id is not None:
                query += " WHERE p.account_id = ?"
                parameters = (account_id,)
            posts = db.execute(query.replace("p.created_at,", "p.created_at, p.aspect_ratio,") + " ORDER BY p.created_at DESC, p.id DESC LIMIT 100", parameters).fetchall()
            follower_count = db.execute("SELECT COUNT(*) AS count FROM media_follows WHERE following_id = ?", (account_id,)).fetchone()["count"] if account_id is not None else None
            output = []
            for post in posts:
                files = db.execute("SELECT storage_name, media_type FROM media_post_files WHERE post_id = ? ORDER BY id", (post["id"],)).fetchall()
                comments = db.execute("SELECT c.id, c.body, c.created_at, a.first_name, a.last_name FROM media_comments c JOIN accounts a ON a.id = c.account_id WHERE c.post_id = ? ORDER BY c.created_at ASC, c.id ASC LIMIT 20", (post["id"],)).fetchall()
                likes = db.execute("SELECT COUNT(*) AS count FROM media_likes WHERE post_id = ?", (post["id"],)).fetchone()["count"]
                liked = bool(viewer and db.execute("SELECT 1 FROM media_likes WHERE post_id = ? AND account_id = ?", (post["id"], viewer["id"])).fetchone())
                saved = bool(viewer and db.execute("SELECT 1 FROM media_saves WHERE post_id = ? AND account_id = ?", (post["id"], viewer["id"])).fetchone())
                following = bool(viewer and viewer["id"] != post["account_id"] and db.execute("SELECT 1 FROM media_follows WHERE follower_id = ? AND following_id = ?", (viewer["id"], post["account_id"])).fetchone())
                output.append({"id": post["id"], "accountId": post["account_id"], "author": f"{post['first_name']} {post['last_name']}".strip(), "role": post["role"], "caption": post["caption"], "aspectRatio": post["aspect_ratio"], "createdAt": post["created_at"], "media": [{"url": f"/uploads/{file['storage_name']}", "type": file["media_type"]} for file in files], "likes": likes, "liked": liked, "saved": saved, "following": following, "comments": [{"id": item["id"], "author": f"{item['first_name']} {item['last_name']}".strip(), "body": item["body"]} for item in comments]})
        self.send_json({"posts": output, "followerCount": follower_count, "viewer": {"id": viewer["id"], "firstName": viewer["first_name"], "lastName": viewer["last_name"], "role": viewer["role"]} if viewer else None})

    def vendor_media_posts(self) -> None:
        actor = self.media_actor()
        if not actor:
            return
        if actor["role"] != "Vendor":
            self.send_json({"error": "Only Vendors can manage promotional media."}, HTTPStatus.FORBIDDEN)
            return
        self.media_posts(actor["id"])

    def media_create_post(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        actor = self.media_actor()
        if not actor: return
        data = self.read_json() or {}; caption = str(data.get("caption", "")).strip(); aspect_ratio = str(data.get("aspectRatio", "16:9"))
        if len(caption) > 2000: self.send_json({"error": "Caption must be at most 2,000 characters."}, HTTPStatus.BAD_REQUEST); return
        blocked_reason = self.media_content_block_reason(caption)
        if blocked_reason: self.send_json({"error": f"This post was blocked by the safety review: {blocked_reason}."}, HTTPStatus.UNPROCESSABLE_ENTITY); return
        if aspect_ratio not in {"16:9", "9:16"}: self.send_json({"error": "Choose either 16:9 or 9:16."}, HTTPStatus.BAD_REQUEST); return
        with connection() as db:
            self.ensure_media_tables(db); post_id = db.execute("INSERT INTO media_posts (account_id, caption, aspect_ratio, created_at) VALUES (?, ?, ?, ?)", (actor["id"], caption, aspect_ratio, int(time.time()))).lastrowid
        error = self.save_media_files(post_id, data.get("media"))
        if error:
            with connection() as db: db.execute("DELETE FROM media_posts WHERE id = ?", (post_id,))
            self.send_json({"error": error}, HTTPStatus.BAD_REQUEST); return
        self.send_json({"message": "Your post is live.", "postId": post_id}, HTTPStatus.CREATED)

    def media_update_post(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        actor = self.media_actor()
        if not actor: return
        data = self.read_json() or {}; post_id = data.get("postId"); caption = str(data.get("caption", "")).strip(); aspect_ratio = str(data.get("aspectRatio", "16:9"))
        if not isinstance(post_id, int) or len(caption) > 2000 or aspect_ratio not in {"16:9", "9:16"}:
            self.send_json({"error": "Use a valid caption and either 16:9 or 9:16."}, HTTPStatus.BAD_REQUEST)
            return
        blocked_reason = self.media_content_block_reason(caption)
        if blocked_reason: self.send_json({"error": f"This post was blocked by the safety review: {blocked_reason}."}, HTTPStatus.UNPROCESSABLE_ENTITY); return
        with connection() as db:
            self.ensure_media_tables(db)
            updated = db.execute("UPDATE media_posts SET caption = ?, aspect_ratio = ? WHERE id = ? AND account_id = ?", (caption, aspect_ratio, post_id, actor["id"])).rowcount
        if not updated:
            self.send_json({"error": "That post could not be found."}, HTTPStatus.NOT_FOUND)
            return
        self.send_json({"message": "Post updated."})

    def media_delete_post(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        actor = self.media_actor()
        if not actor or actor["role"] != "Vendor":
            return
        data = self.read_json() or {}; post_id = data.get("postId")
        if not isinstance(post_id, int): self.send_json({"error": "Choose a valid post."}, HTTPStatus.BAD_REQUEST); return
        with connection() as db:
            self.ensure_media_tables(db)
            files = db.execute("SELECT f.storage_name FROM media_post_files f JOIN media_posts p ON p.id = f.post_id WHERE p.id = ? AND p.account_id = ?", (post_id, actor["id"])).fetchall()
            deleted = db.execute("DELETE FROM media_posts WHERE id = ? AND account_id = ?", (post_id, actor["id"])).rowcount
        if not deleted:
            self.send_json({"error": "That media post could not be found."}, HTTPStatus.NOT_FOUND)
            return
        for item in files:
            try: (UPLOADS / item["storage_name"]).unlink(missing_ok=True)
            except OSError: pass
        self.send_json({"message": "Media post deleted."})

    def media_toggle_like(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        actor = self.media_actor()
        if not actor: return
        data = self.read_json() or {}; post_id = data.get("postId")
        if not isinstance(post_id, int): self.send_json({"error": "Choose a valid post."}, HTTPStatus.BAD_REQUEST); return
        with connection() as db:
            self.ensure_media_tables(db); existing = db.execute("SELECT 1 FROM media_likes WHERE post_id = ? AND account_id = ?", (post_id, actor["id"])).fetchone()
            if existing: db.execute("DELETE FROM media_likes WHERE post_id = ? AND account_id = ?", (post_id, actor["id"])); liked = False
            else: db.execute("INSERT INTO media_likes (post_id, account_id, created_at) VALUES (?, ?, ?)", (post_id, actor["id"], int(time.time()))); liked = True
            count = db.execute("SELECT COUNT(*) AS count FROM media_likes WHERE post_id = ?", (post_id,)).fetchone()["count"]
        self.send_json({"liked": liked, "likes": count})

    def media_add_comment(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        actor = self.media_actor()
        if not actor: return
        data = self.read_json() or {}; post_id = data.get("postId"); body = str(data.get("body", "")).strip()
        if not isinstance(post_id, int) or not 1 <= len(body) <= 1000: self.send_json({"error": "Write a comment of up to 1,000 characters."}, HTTPStatus.BAD_REQUEST); return
        if self.media_content_block_reason(body): self.send_json({"error": "That comment was blocked by the safety review."}, HTTPStatus.UNPROCESSABLE_ENTITY); return
        with connection() as db:
            self.ensure_media_tables(db); db.execute("INSERT INTO media_comments (post_id, account_id, body, created_at) VALUES (?, ?, ?, ?)", (post_id, actor["id"], body, int(time.time())))
        self.send_json({"message": "Comment added."}, HTTPStatus.CREATED)

    def media_send_message(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        actor = self.media_actor()
        if not actor: return
        data = self.read_json() or {}; post_id = data.get("postId"); body = str(data.get("body", "")).strip()
        if not isinstance(post_id, int) or not 1 <= len(body) <= 1000: self.send_json({"error": "Write a private message of up to 1,000 characters."}, HTTPStatus.BAD_REQUEST); return
        if self.media_content_block_reason(body): self.send_json({"error": "That message was blocked by the safety review."}, HTTPStatus.UNPROCESSABLE_ENTITY); return
        with connection() as db:
            self.ensure_media_tables(db); post = db.execute("SELECT account_id FROM media_posts WHERE id = ?", (post_id,)).fetchone()
            if not post: self.send_json({"error": "That post could not be found."}, HTTPStatus.NOT_FOUND); return
            recipient_id = data.get("recipientId") if post["account_id"] == actor["id"] else post["account_id"]
            if not isinstance(recipient_id, int) or recipient_id == actor["id"]: self.send_json({"error": "Choose another conversation participant."}, HTTPStatus.BAD_REQUEST); return
            db.execute("INSERT INTO media_direct_messages (post_id, sender_id, recipient_id, body, created_at) VALUES (?, ?, ?, ?, ?)", (post_id, actor["id"], recipient_id, body, int(time.time())))
        self.send_json({"message": "Private message sent."}, HTTPStatus.CREATED)

    def media_messages(self, parsed) -> None:
        actor = self.media_actor()
        if not actor: return
        try: post_id = int(parse_qs(parsed.query).get("postId", [""])[0])
        except ValueError: self.send_json({"error": "Choose a valid post."}, HTTPStatus.BAD_REQUEST); return
        with connection() as db:
            self.ensure_media_tables(db); rows = db.execute("SELECT m.id, m.sender_id, m.recipient_id, m.body, m.created_at, a.first_name, a.last_name FROM media_direct_messages m JOIN accounts a ON a.id = m.sender_id WHERE m.post_id = ? AND (m.sender_id = ? OR m.recipient_id = ?) ORDER BY m.created_at ASC, m.id ASC", (post_id, actor["id"], actor["id"])).fetchall()
        self.send_json({"messages": [{"id": row["id"], "senderId": row["sender_id"], "recipientId": row["recipient_id"], "body": row["body"], "author": f"{row['first_name']} {row['last_name']}", "createdAt": row["created_at"]} for row in rows]})

    def media_toggle_save(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        actor = self.media_actor()
        if not actor: return
        data = self.read_json() or {}; post_id = data.get("postId")
        if not isinstance(post_id, int): self.send_json({"error": "Choose a valid post."}, HTTPStatus.BAD_REQUEST); return
        with connection() as db:
            self.ensure_media_tables(db)
            if not db.execute("SELECT 1 FROM media_posts WHERE id = ?", (post_id,)).fetchone(): self.send_json({"error": "That post could not be found."}, HTTPStatus.NOT_FOUND); return
            existing = db.execute("SELECT 1 FROM media_saves WHERE post_id = ? AND account_id = ?", (post_id, actor["id"])).fetchone()
            if existing: db.execute("DELETE FROM media_saves WHERE post_id = ? AND account_id = ?", (post_id, actor["id"])); saved = False
            else: db.execute("INSERT INTO media_saves (post_id, account_id, created_at) VALUES (?, ?, ?)", (post_id, actor["id"], int(time.time()))); saved = True
        self.send_json({"saved": saved})

    def media_saved_posts(self) -> None:
        actor = self.current_account()
        if not actor or actor["role"] != "Customer":
            self.send_json({"error": "Sign in as a Customer to view saved posts."}, HTTPStatus.FORBIDDEN)
            return
        with connection() as db:
            self.ensure_media_tables(db)
            tags = db.execute("SELECT id, name FROM media_save_tags WHERE account_id = ? ORDER BY name COLLATE NOCASE", (actor["id"],)).fetchall()
            posts = db.execute("SELECT p.id, p.caption, p.aspect_ratio, p.created_at, a.first_name, a.last_name, a.role FROM media_saves s JOIN media_posts p ON p.id = s.post_id JOIN accounts a ON a.id = p.account_id WHERE s.account_id = ? ORDER BY s.created_at DESC", (actor["id"],)).fetchall()
            output = []
            for post in posts:
                files = db.execute("SELECT storage_name, media_type FROM media_post_files WHERE post_id = ? ORDER BY id", (post["id"],)).fetchall()
                post_tags = db.execute("SELECT t.id, t.name FROM media_save_tag_posts st JOIN media_save_tags t ON t.id = st.tag_id WHERE st.post_id = ? AND t.account_id = ? ORDER BY t.name COLLATE NOCASE", (post["id"], actor["id"])).fetchall()
                output.append({"id": post["id"], "caption": post["caption"], "author": f"{post['first_name']} {post['last_name']}".strip(), "role": post["role"], "aspectRatio": post["aspect_ratio"], "media": [{"url": f"/uploads/{item['storage_name']}", "type": item["media_type"]} for item in files], "tagIds": [item["id"] for item in post_tags], "tags": [{"id": item["id"], "name": item["name"]} for item in post_tags]})
        self.send_json({"tags": [{"id": tag["id"], "name": tag["name"]} for tag in tags], "posts": output})

    def media_create_save_tag(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        actor = self.current_account()
        if not actor or actor["role"] != "Customer": self.send_json({"error": "Only Customers can create saved-post tags."}, HTTPStatus.FORBIDDEN); return
        name = str((self.read_json() or {}).get("name", "")).strip()
        if not 2 <= len(name) <= 40: self.send_json({"error": "A tag name must be 2–40 characters."}, HTTPStatus.BAD_REQUEST); return
        with connection() as db:
            self.ensure_media_tables(db)
            try:
                tag_id = db.execute("INSERT INTO media_save_tags (account_id, name, created_at) VALUES (?, ?, ?)", (actor["id"], name, int(time.time()))).lastrowid
            except sqlite3.IntegrityError:
                self.send_json({"error": "You already have a tag with that name."}, HTTPStatus.CONFLICT); return
        self.send_json({"id": tag_id, "name": name}, HTTPStatus.CREATED)

    def media_set_saved_post_tags(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        actor = self.current_account()
        if not actor or actor["role"] != "Customer": self.send_json({"error": "Only Customers can organise saved posts."}, HTTPStatus.FORBIDDEN); return
        data = self.read_json() or {}; post_id = data.get("postId"); tag_ids = data.get("tagIds", [])
        if not isinstance(post_id, int) or not isinstance(tag_ids, list) or any(not isinstance(item, int) for item in tag_ids): self.send_json({"error": "Choose a valid saved post and tags."}, HTTPStatus.BAD_REQUEST); return
        tag_ids = list(dict.fromkeys(tag_ids))
        with connection() as db:
            self.ensure_media_tables(db)
            if not db.execute("SELECT 1 FROM media_saves WHERE post_id = ? AND account_id = ?", (post_id, actor["id"])).fetchone(): self.send_json({"error": "Save this post before organising it."}, HTTPStatus.NOT_FOUND); return
            owned = {row["id"] for row in db.execute("SELECT id FROM media_save_tags WHERE account_id = ?", (actor["id"],)).fetchall()}
            if not set(tag_ids).issubset(owned): self.send_json({"error": "You can use only your own tags."}, HTTPStatus.FORBIDDEN); return
            db.execute("DELETE FROM media_save_tag_posts WHERE post_id = ? AND tag_id IN (SELECT id FROM media_save_tags WHERE account_id = ?)", (post_id, actor["id"]))
            db.executemany("INSERT INTO media_save_tag_posts (tag_id, post_id) VALUES (?, ?)", [(tag_id, post_id) for tag_id in tag_ids])
        self.send_json({"message": "Tags updated."})

    def media_report_post(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        actor = self.media_actor()
        if not actor: return
        data = self.read_json() or {}; post_id = data.get("postId"); reason = str(data.get("reason", "")).strip(); details = str(data.get("details", "")).strip()
        allowed_reasons = {"Adult or sexual content", "Violence or graphic harm", "Harassment or hate", "Spam or scam", "Other"}
        if not isinstance(post_id, int) or reason not in allowed_reasons or len(details) > 500:
            self.send_json({"error": "Choose a report reason and keep any note under 500 characters."}, HTTPStatus.BAD_REQUEST); return
        with connection() as db:
            self.ensure_media_tables(db)
            if not db.execute("SELECT 1 FROM media_posts WHERE id = ?", (post_id,)).fetchone(): self.send_json({"error": "That post could not be found."}, HTTPStatus.NOT_FOUND); return
            db.execute("INSERT INTO media_reports (post_id, reporter_id, reason, details, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(post_id, reporter_id) DO UPDATE SET reason = excluded.reason, details = excluded.details, created_at = excluded.created_at", (post_id, actor["id"], reason, details, int(time.time())))
        self.send_json({"message": "Thanks. Your report has been submitted for review."}, HTTPStatus.CREATED)

    def media_toggle_follow(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        actor = self.media_actor()
        if not actor: return
        data = self.read_json() or {}; account_id = data.get("accountId")
        if not isinstance(account_id, int) or account_id == actor["id"]: self.send_json({"error": "Choose another account to follow."}, HTTPStatus.BAD_REQUEST); return
        with connection() as db:
            self.ensure_media_tables(db); existing = db.execute("SELECT 1 FROM media_follows WHERE follower_id = ? AND following_id = ?", (actor["id"], account_id)).fetchone()
            if existing: db.execute("DELETE FROM media_follows WHERE follower_id = ? AND following_id = ?", (actor["id"], account_id)); following = False
            else: db.execute("INSERT INTO media_follows (follower_id, following_id, created_at) VALUES (?, ?, ?)", (actor["id"], account_id, int(time.time()))); following = True
        self.send_json({"following": following})

    def ensure_job_tables(self, db: sqlite3.Connection) -> None:
        db.execute("CREATE TABLE IF NOT EXISTS vendor_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, vendor_id INTEGER NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, location TEXT NOT NULL, employment_type TEXT NOT NULL, salary_details TEXT, status TEXT NOT NULL DEFAULT 'Open', created_at INTEGER NOT NULL, FOREIGN KEY(vendor_id) REFERENCES accounts(id) ON DELETE CASCADE)")
        db.execute("CREATE TABLE IF NOT EXISTS job_applications (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id INTEGER NOT NULL, customer_id INTEGER NOT NULL, cover_note TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Submitted', created_at INTEGER NOT NULL, UNIQUE(job_id, customer_id), FOREIGN KEY(job_id) REFERENCES vendor_jobs(id) ON DELETE CASCADE, FOREIGN KEY(customer_id) REFERENCES accounts(id) ON DELETE CASCADE)")

    def vendor_jobs(self) -> None:
        vendor = self.require_vendor()
        if not vendor:
            return
        with connection() as db:
            self.ensure_job_tables(db)
            jobs = db.execute("SELECT id, title, description, location, employment_type, salary_details, status, created_at FROM vendor_jobs WHERE vendor_id = ? ORDER BY created_at DESC", (vendor["id"],)).fetchall()
            output = []
            for job in jobs:
                applications = db.execute("SELECT j.id, j.cover_note, j.status, j.created_at, a.first_name, a.last_name, a.email, a.phone FROM job_applications j JOIN accounts a ON a.id = j.customer_id WHERE j.job_id = ? ORDER BY j.created_at DESC", (job["id"],)).fetchall()
                output.append({"id": job["id"], "title": job["title"], "description": job["description"], "location": job["location"], "employmentType": job["employment_type"], "salaryDetails": job["salary_details"], "status": job["status"], "createdAt": job["created_at"], "applications": [{"id": item["id"], "name": f"{item['first_name']} {item['last_name']}".strip(), "email": item["email"], "phone": item["phone"], "coverNote": item["cover_note"], "status": item["status"]} for item in applications]})
        self.send_json({"jobs": output})

    def vendor_create_job(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        vendor = self.require_vendor()
        if not vendor:
            return
        with connection() as db:
            approved = db.execute("SELECT 1 FROM vendor_profiles WHERE account_id = ? AND approval_status = 'Approved'", (vendor["id"],)).fetchone()
        if not approved:
            self.send_json({"error": "Your business profile must be approved before posting job openings."}, HTTPStatus.FORBIDDEN)
            return
        data = self.read_json() or {}
        title = str(data.get("title", "")).strip(); description = str(data.get("description", "")).strip(); location = str(data.get("location", "")).strip(); employment_type = str(data.get("employmentType", "")).strip(); salary = str(data.get("salaryDetails", "")).strip()
        if not 2 <= len(title) <= 140 or not 20 <= len(description) <= 5000 or not 2 <= len(location) <= 160 or employment_type not in {"Full-time", "Part-time", "Contract", "Internship", "Freelance"} or len(salary) > 160:
            self.send_json({"error": "Complete the job title, description, location, and employment type."}, HTTPStatus.BAD_REQUEST)
            return
        with connection() as db:
            self.ensure_job_tables(db)
            job_id = db.execute("INSERT INTO vendor_jobs (vendor_id, title, description, location, employment_type, salary_details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", (vendor["id"], title, description, location, employment_type, salary or None, int(time.time()))).lastrowid
        self.send_json({"message": "Job opening is live for customers.", "jobId": job_id}, HTTPStatus.CREATED)

    def public_jobs(self) -> None:
        viewer = self.current_account()
        with connection() as db:
            self.ensure_job_tables(db)
            jobs = db.execute("SELECT j.id, j.vendor_id, j.title, j.description, j.location, j.employment_type, j.salary_details, j.created_at, a.first_name, a.last_name, p.business_name FROM vendor_jobs j JOIN accounts a ON a.id = j.vendor_id LEFT JOIN vendor_profiles p ON p.account_id = j.vendor_id WHERE j.status = 'Open' ORDER BY j.created_at DESC").fetchall()
            applied = {row["job_id"] for row in db.execute("SELECT job_id FROM job_applications WHERE customer_id = ?", (viewer["id"],)).fetchall()} if viewer and viewer["role"] == "Customer" else set()
        self.send_json({"jobs": [{"id": job["id"], "title": job["title"], "description": job["description"], "location": job["location"], "employmentType": job["employment_type"], "salaryDetails": job["salary_details"], "businessName": job["business_name"] or f"{job['first_name']} {job['last_name']}".strip(), "applied": job["id"] in applied} for job in jobs], "viewer": {"role": viewer["role"], "firstName": viewer["first_name"]} if viewer else None})

    def job_apply(self) -> None:
        if not self.origin_is_valid(): self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN); return
        applicant = self.current_account()
        if not applicant or applicant["role"] != "Customer":
            self.send_json({"error": "Sign in as a Customer to apply for a job."}, HTTPStatus.FORBIDDEN)
            return
        data = self.read_json() or {}; job_id = data.get("jobId"); cover_note = str(data.get("coverNote", "")).strip()
        if not isinstance(job_id, int) or len(cover_note) > 2000:
            self.send_json({"error": "Enter a valid application message of up to 2,000 characters."}, HTTPStatus.BAD_REQUEST)
            return
        with connection() as db:
            self.ensure_job_tables(db)
            job = db.execute("SELECT id FROM vendor_jobs WHERE id = ? AND status = 'Open'", (job_id,)).fetchone()
            if not job:
                self.send_json({"error": "This job opening is no longer available."}, HTTPStatus.NOT_FOUND)
                return
            try:
                db.execute("INSERT INTO job_applications (job_id, customer_id, cover_note, created_at) VALUES (?, ?, ?, ?)", (job_id, applicant["id"], cover_note, int(time.time())))
            except sqlite3.IntegrityError:
                self.send_json({"error": "You have already applied for this job."}, HTTPStatus.CONFLICT)
                return
        self.send_json({"message": "Application sent to the Vendor."}, HTTPStatus.CREATED)

    def public_products(self) -> None:
        with connection() as db:
            products = db.execute("SELECT p.id, p.product_name, p.product_description, p.product_category, p.product_type, p.search_keywords, p.product_specifications, p.customer_actions, p.cost_paise, p.tax_details, p.available_quantity, p.delivery_charges_paise, p.self_delivery, a.first_name, a.last_name, a.phone FROM vendor_products p JOIN accounts a ON a.id = p.vendor_id WHERE p.status = 'Published' AND p.available_quantity > 0 ORDER BY p.published_at DESC").fetchall()
            media = self.product_media_rows(db, [row["id"] for row in products])
        self.send_json({"products": [{"id": row["id"], "name": row["product_name"], "description": row["product_description"], "category": row["product_category"], "productType": row["product_type"], "keywords": row["search_keywords"], "specifications": row["product_specifications"], "customerActions": json.loads(row["customer_actions"]), "costPaise": row["cost_paise"], "taxDetails": row["tax_details"], "availableQuantity": row["available_quantity"], "deliveryChargesPaise": row["delivery_charges_paise"], "selfDelivery": bool(row["self_delivery"]), "vendorName": f"{row['first_name']} {row['last_name']}", "vendorPhone": row["phone"], "media": media.get(row["id"], [])} for row in products]})

    def product_reviews(self, parsed) -> None:
        raw_product_id = parse_qs(parsed.query).get("productId", [""])[0]
        try:
            product_id = int(raw_product_id)
        except (TypeError, ValueError):
            self.send_json({"error": "Choose a valid product or service."}, HTTPStatus.BAD_REQUEST)
            return
        actor = self.current_account()
        with connection() as db:
            product = db.execute("SELECT id FROM vendor_products WHERE id = ? AND status = 'Published'", (product_id,)).fetchone()
            if not product:
                self.send_json({"error": "This product or service is unavailable."}, HTTPStatus.NOT_FOUND)
                return
            rows = db.execute("SELECT r.id, r.customer_id, r.rating, r.review_text, r.created_at, r.updated_at, a.first_name, a.last_name, rp.reply_text, rp.updated_at AS reply_updated_at FROM product_reviews r JOIN accounts a ON a.id = r.customer_id LEFT JOIN product_review_replies rp ON rp.review_id = r.id WHERE r.product_id = ? ORDER BY r.updated_at DESC, r.id DESC", (product_id,)).fetchall()
            review_ids = [row["id"] for row in rows]
            reactions: dict[int, dict[str, int]] = {review_id: {} for review_id in review_ids}
            selected: dict[int, str] = {}
            if review_ids:
                placeholders = ",".join("?" for _ in review_ids)
                reaction_rows = db.execute(f"SELECT review_id, reaction, COUNT(*) AS total FROM product_review_reactions WHERE review_id IN ({placeholders}) GROUP BY review_id, reaction", review_ids).fetchall()
                for reaction in reaction_rows:
                    reactions[reaction["review_id"]][reaction["reaction"]] = reaction["total"]
                if actor and actor["role"] == "Customer":
                    selected_rows = db.execute(f"SELECT review_id, reaction FROM product_review_reactions WHERE customer_id = ? AND review_id IN ({placeholders})", [actor["id"], *review_ids]).fetchall()
                    selected = {row["review_id"]: row["reaction"] for row in selected_rows}
            eligibility = db.execute("SELECT source_type FROM customer_review_eligibility WHERE product_id = ? AND customer_id = ?", (product_id, actor["id"])).fetchone() if actor and actor["role"] == "Customer" else None
        average = round(sum(row["rating"] for row in rows) / len(rows), 1) if rows else 0
        distribution = {str(rating): sum(row["rating"] == rating for row in rows) for rating in range(5, 0, -1)}
        self.send_json({"summary": {"count": len(rows), "average": average, "scale": 5, "distribution": distribution}, "eligibleToReview": bool(eligibility), "eligibilitySource": eligibility["source_type"] if eligibility else None, "reviews": [{"id": row["id"], "rating": row["rating"], "text": row["review_text"], "customerName": f"{row['first_name']} {row['last_name'][0]}." if row["last_name"] else row["first_name"], "createdAt": row["created_at"], "updatedAt": row["updated_at"], "reply": {"text": row["reply_text"], "updatedAt": row["reply_updated_at"]} if row["reply_text"] else None, "reactions": reactions.get(row["id"], {}), "myReaction": selected.get(row["id"])} for row in rows]})

    def create_product_review(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        actor = self.current_account()
        if not actor:
            self.send_json({"error": "Sign in as a Customer to write a review."}, HTTPStatus.UNAUTHORIZED)
            return
        if actor["role"] != "Customer":
            self.send_json({"error": "Only Customers can write product and service reviews."}, HTTPStatus.FORBIDDEN)
            return
        data = self.read_json() or {}
        product_id, rating = data.get("productId"), data.get("rating")
        review_text = str(data.get("text", "")).strip()
        if not isinstance(product_id, int) or not isinstance(rating, int) or not 1 <= rating <= 5 or not 2 <= len(review_text) <= 2000:
            self.send_json({"error": "Choose a 1–5 star rating and write a review of 2 to 2,000 characters."}, HTTPStatus.BAD_REQUEST)
            return
        if self.media_content_block_reason(review_text):
            self.send_json({"error": "That review was blocked by the safety review."}, HTTPStatus.UNPROCESSABLE_ENTITY)
            return
        now = int(time.time())
        with connection() as db:
            if not db.execute("SELECT 1 FROM vendor_products WHERE id = ? AND status = 'Published'", (product_id,)).fetchone():
                self.send_json({"error": "This product or service is unavailable."}, HTTPStatus.NOT_FOUND)
                return
            if not db.execute("SELECT 1 FROM customer_review_eligibility WHERE product_id = ? AND customer_id = ?", (product_id, actor["id"])).fetchone():
                self.send_json({"error": "You can review this only after a verified purchase or completed service."}, HTTPStatus.FORBIDDEN)
                return
            db.execute("INSERT INTO product_reviews (product_id, customer_id, rating, review_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(product_id, customer_id) DO UPDATE SET rating = excluded.rating, review_text = excluded.review_text, updated_at = excluded.updated_at", (product_id, actor["id"], rating, review_text, now, now))
        self.send_json({"message": "Your review was saved."}, HTTPStatus.CREATED)

    def reply_to_product_review(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        vendor = self.require_vendor()
        if not vendor:
            return
        data = self.read_json() or {}
        review_id = data.get("reviewId")
        reply_text = str(data.get("text", "")).strip()
        if not isinstance(review_id, int) or not 2 <= len(reply_text) <= 2000:
            self.send_json({"error": "Write a reply of 2 to 2,000 characters."}, HTTPStatus.BAD_REQUEST)
            return
        if self.media_content_block_reason(reply_text):
            self.send_json({"error": "That reply was blocked by the safety review."}, HTTPStatus.UNPROCESSABLE_ENTITY)
            return
        now = int(time.time())
        with connection() as db:
            review = db.execute("SELECT r.id FROM product_reviews r JOIN vendor_products p ON p.id = r.product_id WHERE r.id = ? AND p.vendor_id = ?", (review_id, vendor["id"])).fetchone()
            if not review:
                self.send_json({"error": "You can reply only to reviews on your own listings."}, HTTPStatus.FORBIDDEN)
                return
            db.execute("INSERT INTO product_review_replies (review_id, vendor_id, reply_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(review_id) DO UPDATE SET reply_text = excluded.reply_text, updated_at = excluded.updated_at", (review_id, vendor["id"], reply_text, now, now))
        self.send_json({"message": "Vendor reply saved."})

    def react_to_product_review(self) -> None:
        if not self.origin_is_valid():
            self.send_json({"error": "Invalid request origin."}, HTTPStatus.FORBIDDEN)
            return
        actor = self.current_account()
        if not actor:
            self.send_json({"error": "Sign in as a Customer to react to a review."}, HTTPStatus.UNAUTHORIZED)
            return
        if actor["role"] != "Customer":
            self.send_json({"error": "Only Customers can react to reviews."}, HTTPStatus.FORBIDDEN)
            return
        data = self.read_json() or {}
        review_id = data.get("reviewId")
        reaction = str(data.get("reaction", "")).strip()
        allowed_reactions = {"👍", "❤️", "😂", "👏", "🔥", "🌟", "🎉", "💡", "🚀", "🙌"}
        if not isinstance(review_id, int) or reaction not in allowed_reactions:
            self.send_json({"error": "Choose a reaction from the catalogue."}, HTTPStatus.BAD_REQUEST)
            return
        with connection() as db:
            review = db.execute("SELECT customer_id FROM product_reviews WHERE id = ?", (review_id,)).fetchone()
            if not review:
                self.send_json({"error": "That review could not be found."}, HTTPStatus.NOT_FOUND)
                return
            if review["customer_id"] == actor["id"]:
                self.send_json({"error": "You cannot react to your own review."}, HTTPStatus.FORBIDDEN)
                return
            current = db.execute("SELECT reaction FROM product_review_reactions WHERE review_id = ? AND customer_id = ?", (review_id, actor["id"])).fetchone()
            if current and current["reaction"] == reaction:
                db.execute("DELETE FROM product_review_reactions WHERE review_id = ? AND customer_id = ?", (review_id, actor["id"]))
                message = "Reaction removed."
            else:
                db.execute("INSERT INTO product_review_reactions (review_id, customer_id, reaction, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(review_id, customer_id) DO UPDATE SET reaction = excluded.reaction, created_at = excluded.created_at", (review_id, actor["id"], reaction, int(time.time())))
                message = "Reaction saved."
        self.send_json({"message": message})

    def save_vendor_image(self, raw_image: object) -> tuple[str | None, str | None]:
        if raw_image in (None, ""):
            return None, None
        if not isinstance(raw_image, str) or not raw_image.startswith("data:image/"):
            return None, "Upload a valid JPEG, PNG, or WebP image."
        try:
            header, encoded = raw_image.split(",", 1)
            mime = header.removeprefix("data:").removesuffix(";base64")
            if mime not in {"image/jpeg", "image/png", "image/webp"} or not header.endswith(";base64"):
                return None, "Only JPEG, PNG, and WebP images are allowed."
            image_bytes = base64.b64decode(encoded, validate=True)
        except (ValueError, binascii.Error):
            return None, "The uploaded image could not be read."
        if not image_bytes or len(image_bytes) > MAX_IMAGE_BYTES:
            return None, "Image must be smaller than 2 MB."
        signatures = {"image/jpeg": (b"\xff\xd8\xff", ".jpg"), "image/png": (b"\x89PNG\r\n\x1a\n", ".png"), "image/webp": (b"RIFF", ".webp")}
        signature, extension = signatures[mime]
        if not image_bytes.startswith(signature) or (mime == "image/webp" and image_bytes[8:12] != b"WEBP"):
            return None, "Image file content does not match its type."
        filename = f"vendor-{secrets.token_hex(16)}{extension}"
        (UPLOADS / filename).write_bytes(image_bytes)
        return f"/uploads/{filename}", None

    def save_vendor_certificates(self, account_id: int, raw_documents: object) -> tuple[list[dict], str | None]:
        if raw_documents in (None, ""):
            return [], None
        if not isinstance(raw_documents, list) or len(raw_documents) > MAX_CERTIFICATE_DOCUMENTS:
            return [], f"Upload no more than {MAX_CERTIFICATE_DOCUMENTS} certificate documents at a time."
        allowed_types = {
            "application/pdf": (b"%PDF-", ".pdf"),
            "image/jpeg": (b"\xff\xd8\xff", ".jpg"),
            "image/png": (b"\x89PNG\r\n\x1a\n", ".png"),
        }
        documents: list[dict] = []
        for raw_document in raw_documents:
            if not isinstance(raw_document, dict):
                return [], "Upload valid PDF, JPEG, or PNG certificate documents."
            original_name = Path(str(raw_document.get("name", ""))).name.strip()
            raw_content = raw_document.get("content")
            if not original_name or len(original_name) > 120 or not isinstance(raw_content, str):
                return [], "Each certificate document needs a valid file name."
            try:
                header, encoded = raw_content.split(",", 1)
                mime = header.removeprefix("data:").removesuffix(";base64")
                document_bytes = base64.b64decode(encoded, validate=True)
            except (ValueError, binascii.Error):
                return [], f"{original_name}: the document could not be read."
            if not header.endswith(";base64") or mime not in allowed_types or not document_bytes or len(document_bytes) > MAX_CERTIFICATE_BYTES:
                return [], f"{original_name}: use a PDF, JPEG, or PNG smaller than 1.5 MB."
            signature, extension = allowed_types[mime]
            if not document_bytes.startswith(signature):
                return [], f"{original_name}: file content does not match its type."
            if mime == "image/png" and not document_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
                return [], f"{original_name}: file content does not match its type."
            storage_name = f"certificate-{secrets.token_hex(16)}{extension}"
            documents.append({"originalName": original_name, "storageName": storage_name, "mediaType": mime, "bytes": document_bytes})
        now = int(time.time())
        for document in documents:
            (UPLOADS / document["storageName"]).write_bytes(document["bytes"])
        with connection() as db:
            db.executemany("INSERT INTO vendor_certificates (account_id, original_name, storage_name, media_type, uploaded_at) VALUES (?, ?, ?, ?, ?)", [(account_id, document["originalName"], document["storageName"], document["mediaType"], now) for document in documents])
        return documents, None

    def certificate_from_query(self, parsed, account_id: int | None = None) -> sqlite3.Row | None:
        try:
            certificate_id = int(parse_qs(parsed.query).get("id", [""])[0])
        except (TypeError, ValueError):
            return None
        with connection() as db:
            if account_id is None:
                return db.execute("SELECT id, account_id, original_name, storage_name, media_type FROM vendor_certificates WHERE id = ?", (certificate_id,)).fetchone()
            return db.execute("SELECT id, account_id, original_name, storage_name, media_type FROM vendor_certificates WHERE id = ? AND account_id = ?", (certificate_id, account_id)).fetchone()

    def send_certificate_file(self, certificate: sqlite3.Row) -> None:
        path = (UPLOADS / Path(certificate["storage_name"]).name).resolve()
        if UPLOADS not in path.parents or not path.is_file():
            self.send_json({"error": "Certificate document was not found."}, HTTPStatus.NOT_FOUND)
            return
        safe_name = re.sub(r"[^A-Za-z0-9._ -]", "_", certificate["original_name"])
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", certificate["media_type"])
        self.send_header("Content-Disposition", f'attachment; filename="{safe_name}"')
        self.send_header("Cache-Control", "private, no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.end_headers()
        self.wfile.write(path.read_bytes())

    def vendor_certificate_download(self, parsed) -> None:
        vendor = self.require_vendor()
        if not vendor:
            return
        certificate = self.certificate_from_query(parsed, vendor["id"])
        if not certificate:
            self.send_json({"error": "Certificate document was not found."}, HTTPStatus.NOT_FOUND)
            return
        self.send_certificate_file(certificate)

    def reviewer_certificate_download(self, parsed) -> None:
        if not self.require_approver():
            return
        certificate = self.certificate_from_query(parsed)
        if not certificate:
            self.send_json({"error": "Certificate document was not found."}, HTTPStatus.NOT_FOUND)
            return
        self.send_certificate_file(certificate)

    def session_token(self) -> str | None:
        cookie = SimpleCookie(self.headers.get("Cookie"))
        return cookie["nh_session"].value if "nh_session" in cookie else None

    def create_session(self, account_id: int, db: sqlite3.Connection | None = None) -> str:
        raw_token = secrets.token_urlsafe(32)
        if db is not None:
            db.execute("DELETE FROM sessions WHERE expires_at < ?", (int(time.time()),))
            db.execute("INSERT INTO sessions (token_hash, account_id, expires_at, created_at) VALUES (?, ?, ?, ?)", (hashlib.sha256(raw_token.encode()).hexdigest(), account_id, int(time.time()) + SESSION_AGE_SECONDS, int(time.time())))
            return raw_token
        with connection() as session_db:
            session_db.execute("DELETE FROM sessions WHERE expires_at < ?", (int(time.time()),))
            session_db.execute("INSERT INTO sessions (token_hash, account_id, expires_at, created_at) VALUES (?, ?, ?, ?)", (hashlib.sha256(raw_token.encode()).hexdigest(), account_id, int(time.time()) + SESSION_AGE_SECONDS, int(time.time())))
        return raw_token

    def send_redirect(self, destination: str, cookie: str | None = None) -> None:
        self.send_response(HTTPStatus.FOUND)
        self.send_header("Location", destination)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if cookie:
            secure = "; Secure" if os.getenv("NEXAHUB_HTTPS") == "1" else ""
            self.send_header("Set-Cookie", f"nh_session={cookie}; HttpOnly; SameSite=Lax; Path=/; Max-Age={SESSION_AGE_SECONDS}{secure}")
        self.end_headers()

    def send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK, cookie: str | None = None, clear_cookie: bool = False) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        if cookie:
            secure = "; Secure" if os.getenv("NEXAHUB_HTTPS") == "1" else ""
            self.send_header("Set-Cookie", f"nh_session={cookie}; HttpOnly; SameSite=Lax; Path=/; Max-Age={SESSION_AGE_SECONDS}{secure}")
        if clear_cookie:
            self.send_header("Set-Cookie", "nh_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run SHAKALPA or create a local staff account.")
    parser.add_argument("--create-user", action="store_true", help="Create a local staff account, then exit.")
    parser.add_argument("--role", choices=sorted(ROLES), help="Workspace role for the new account.")
    parser.add_argument("--first-name", help="Account holder first name.")
    parser.add_argument("--last-name", help="Account holder last name.")
    parser.add_argument("--phone", help="Account holder contact number.")
    parser.add_argument("--email", help="Account holder email address.")
    arguments = parser.parse_args()
    init_database()
    if arguments.create_user:
        required = (arguments.role, arguments.first_name, arguments.last_name, arguments.phone, arguments.email)
        if not all(required):
            parser.error("--create-user requires --role, --first-name, --last-name, --phone, and --email.")
        create_staff_account(arguments.role, arguments.first_name, arguments.last_name, arguments.phone, arguments.email)
        raise SystemExit(0)
    print(f"SHAKALPA is running at http://localhost:{PORT}")
    ThreadingHTTPServer((HOST, PORT), SHAKALPAHandler).serve_forever()
