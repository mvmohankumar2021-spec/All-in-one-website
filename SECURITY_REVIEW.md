# Security review — SHAKALPA starter

Date: 2026-09-04

## Scope

Static review of the supplied browser-only prototype: `index.html`, `styles.css`, and `app.js`.

## Checks completed

- No inline DOM event attributes were found.
- No browser storage or cookies are used for passwords or sessions.
- No card number, CVV, or other raw card-entry fields are collected.
- Dynamic product and cart labels are HTML-escaped before they are inserted into the page.
- Authentication inputs use browser validation with bounded lengths and do not claim to create a real session.
- Checkout and booking completion deliberately stop at a payment-provider handoff message; payment secrets must stay in a server-side integration.
- Customer map tracking is presented as active-delivery-only, with exact operations location data reserved for a protected workspace.
- The signup page validates first name, last name, contact number, email format, and matching password confirmation in the browser, then clears the form without persisting personally identifiable information or passwords.
- The local server revalidates signup and sign-in data, hashes passwords with PBKDF2-HMAC-SHA256, uses constant-time password comparisons, stores opaque session-token hashes, limits JSON body size, and restricts state-changing requests to the same origin.
- Admin account data and account creation are protected by a server-side Admin role check. The static-file handler serves only approved web asset extensions, so the SQLite database and server source cannot be fetched from the browser.
- Google sign-in is limited server-side to Agent, Vendor, and Customer role requests. It uses a short-lived, single-use OAuth state and never auto-creates an account, preserving the required contact-number onboarding step.

## Important production work before launch

This is a frontend prototype, not a deployed security boundary. Before taking real users, implement server-side authorization for every role and resource, an identity provider with MFA and rate limiting, secure HTTP-only/SameSite cookies, CSRF protection, audit logs, payment-provider webhooks verified by signature, server-side input validation, a strict Content Security Policy, HTTPS/HSTS, and a privacy policy / consent controls for location tracking.

## Result

No high-risk client-side patterns were found in this static pass. A real penetration test requires a deployed backend, authenticated role accounts, payment sandbox credentials, and map/location APIs.
