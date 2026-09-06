# SHAKALPA local app

## Run it

This project uses only the Python standard library. Install Python 3.10 or newer, then run the following from this folder:

```powershell
python server.py
```

Open `http://localhost:8080` in a browser. Use the **Create your account** call-to-action to register, then use the site sign-in dialog with the same email and password.

`nexahub.db` is created automatically beside `server.py`. It contains account records and hashed session tokens. Do not commit it or share it.

## Roles

Public signup offers `Customer`, `Vendor`, and `Agent` account types. `Admin` and `Employee` are excluded from public signup. The server validates the selected role at sign-in, so an account cannot enter a different workspace.

For local testing, you can create an Admin account either in the terminal or through the one-time protected website setup page. To use the website path, configure a setup key and start the server:

```powershell
$env:NEXAHUB_SETUP_KEY = "use-a-long-unique-secret"
python server.py
```

Then open `http://localhost:8080/admin-setup.html`, enter the same setup key, and complete the form. Once it creates the first Admin, this endpoint locks permanently. Do not use a simple or shared setup key.

After signing in through **Open admin workspace**, the site redirects to `admin.html`. That protected page lists each account's name, email, contact number, role, and creation date, and lets an Admin create Customer, Employee, Vendor, Agent, or additional Admin accounts.

An Employee sign-in redirects to `employee.html`. The employee portal can create and view only Customer, Vendor, and Agent accounts. The allowed role list is enforced by the server; even a modified browser request cannot create an Admin account.

An Agent sign-in redirects to `agent.html`. Agents can enroll Vendor accounts only; the dedicated server endpoint always assigns the Vendor role and never accepts a role from the browser.

A Vendor sign-in redirects to `vendor.html`. Vendors can save a business profile as a draft, or use **Save & submit for approval** when it is ready. Submitted profiles appear in the Admin and Employee portals, where either role can download the supplied certificates and approve the profile. If a Vendor chooses `Other` for either category, the server requires a custom type description.

After approval, the live Vendor listing remains active. Later edits are stored as a separate proposed profile change and require another Admin or Employee approval before replacing the approved listing. The review queue identifies profile edits and displays the current and proposed business, location, and compliance details side by side.

The Vendor profile has optional GST, FSSAI licence, vehicle registration, insurance, and other-certificate detail fields. Vendors can upload up to four supporting PDF, JPEG, or PNG documents (1.5 MB each). At least one supporting document is required to submit a profile for approval. Certificate downloads are access-controlled to the owning Vendor, Admin, and Employee roles.

## Document-request notifications

An Admin or Employee can select **Request docs** from a submitted Vendor profile and enter the missing-document request. The request is stored, shown in the Vendor workspace, and resolved when the Vendor submits the profile again.

To send the notification externally, configure an SMTP mail server and/or Twilio SMS credentials before starting the server. The request is still saved if either provider is not configured.

```powershell
$env:SMTP_HOST = "smtp.example.com"
$env:SMTP_PORT = "587"
$env:SMTP_USER = "smtp-user"
$env:SMTP_PASSWORD = "smtp-password"
$env:SMTP_FROM = "noreply@example.com"

$env:TWILIO_ACCOUNT_SID = "your-account-sid"
$env:TWILIO_AUTH_TOKEN = "your-auth-token"
$env:TWILIO_FROM_NUMBER = "+15550100000"

python server.py
```

Use an E.164 mobile number (for example, `+919876543210`) in the Vendor contact field for Twilio delivery. Keep these credentials out of source code and use a secrets manager for production.

## Vendor registration payment

An Admin sets the Vendor registration fee in the Admin workspace. Vendors must pay that fee before they can submit their business profile for approval. The hosted Razorpay checkout presents UPI (including QR-based UPI where available), credit/debit card, and netbanking methods; this application never receives card details or UPI credentials.

Set Razorpay test credentials to test the flow, or Live Mode credentials only after completing Razorpay's production checklist:

```powershell
$env:RAZORPAY_KEY_ID = "rzp_test_your_key_id"
$env:RAZORPAY_KEY_SECRET = "your_key_secret"
python server.py
```

The server creates every order, stores its order ID, and verifies Razorpay's HMAC signature before marking a registration fee as paid. For production, configure Razorpay webhooks and payment capture in addition to this immediate verification.

## Vendor products and product-entry payment

After an Admin or Employee approves a Vendor profile, the Vendor workspace displays a product catalogue. A Vendor can add a product name, description, price, tax detail, stock quantity, delivery charge, self-delivery choice, and one to five images/short videos (one video maximum). The Admin workspace controls the separate **product entry fee**. Products with a fee remain private until their individual Razorpay payment is verified; the Vendor page shows the total still payable. Paid products automatically appear in the public customer storefront.

### Google Maps location selection

The Vendor form includes a Google Maps place picker when a browser-restricted Maps JavaScript API key is available. In Google Cloud, enable **Maps JavaScript API** and **Places API (New)**, then restrict the key to your site origin. Set it before starting the server:

```powershell
$env:GOOGLE_MAPS_API_KEY = "your-browser-restricted-maps-key"
python server.py
```

Without that key, Vendors can still enter their address manually and use the Google Maps preview/link.

## Google sign-in

Google sign-in is available only for the Agent, Vendor, and Customer login choices. It signs in an existing SHAKALPA account with the matching verified Google email; it never auto-creates an account, so the mandatory contact number is always collected through SHAKALPA signup or a permitted staff enrollment flow.

In Google Cloud Console, create a Web application OAuth client and add `http://localhost:8080/api/auth/google/callback` as an authorized redirect URI. Before starting the server, set its credentials in the same PowerShell window:

```powershell
$env:GOOGLE_CLIENT_ID = "your-client-id.apps.googleusercontent.com"
$env:GOOGLE_CLIENT_SECRET = "your-client-secret"
python server.py
```

For a deployed site, set `GOOGLE_REDIRECT_URI` to its HTTPS callback URL and register that exact URL in Google Cloud Console. The OAuth authorization-code flow and callback state are handled on the server. 

Alternatively, create an Admin account with the server stopped:

```powershell
python server.py --create-user --role Admin --first-name YourFirstName --last-name YourLastName --phone "+1 555 010 0100" --email admin@example.com
```

You will be prompted twice for the password; it is hidden and is not saved to your terminal history. Start the server again with `python server.py`, select **Open admin workspace**, and sign in with the email and password you just created.

## Production checklist

Run behind HTTPS and set `NEXAHUB_HTTPS=1`, use a managed database, add rate limiting and password-reset/MFA workflows, and configure a strict Content Security Policy at the reverse proxy.
