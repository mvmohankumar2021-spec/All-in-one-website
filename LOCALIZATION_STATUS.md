# Language rollout status

## Fashion services onboarding — 27 September 2026

- Added Tailoring, Boutique, Fashion Designer, Uniform Supplier and Embroidery Service under Fashion & Clothing → Tailoring & Design, using the existing authenticated retail persistence and document workflow.
- Added measurements/material approval, quotes/payments, capacity, quality/rework, cancellation, design/photo permissions and selected-service details. Pickup/delivery and home-visit details are conditional. Pure service applications omit unrelated retail sections and retail-only agreements; platform agreements remain required.
- Tamil/Hindi labels, guidance, taxonomy, headings and actions added. Supporting-document help covers portfolios, experience/qualifications, permissions and uniform safety claims.
- 100 isolated backend regression tests pass; runtime translation checks pass. Desktop Tamil and mobile Tamil/Hindi previews checked without overflow; selection filtering and translated help opening verified in a write-disabled fixture.
- Preview removed; local app restarted. Screenshot: fashion-service-tamil-desktop.png. No real uploads or agreements were submitted; authenticated end-to-end submission remains unverified.

## Clothing onboarding — 27 September 2026

- Added all seven clothing categories using the existing retail renderer, authenticated save route, document handling and approval workflow. Taxonomy: Fashion & Clothing → Clothing (Kids Clothing also exists under Kids & Family).
- Selected-category details, sizing, exchanges, measurement privacy, event commitments, conditional tailoring and bridal rentals are implemented. Clothing-only applications do not ask for appliance installation/warranty fields.
- Added Tamil/Hindi labels and guidance, including taxonomy labels. 4,143 bilingual entries validated.
- 98 isolated backend tests passed, including tailoring/rental validation, draft restoration, irrelevant-field exclusion and mixed clothing/hardware selection. Runtime language tests passed.
- Actual renderer verified in a write-disabled preview: Tamil desktop, Tamil/Hindi mobile at 390px, no horizontal overflow; rental fields hidden on switching to Saree Shop; translated help popup opens; dropdown values remain unchanged. Screenshot: clothing-tamil-desktop.png.
- Preview removed and local server restarted. No actual uploads, agreements or account submissions were made; signed-in end-to-end submission remains unverified.

## Home retail onboarding — 27 September 2026

- Added Furniture Store, Home Decor Store, Mattress Store, Lighting Store and Kitchenware Store to the existing retail workflow (Shopping & Retail → Home Retail).
- Includes selected-store details, conditional custom orders, delivery/access charges, installation, warranties and aftercare. Existing uploads, agreements and separate profile approval remain unchanged.
- Added English-source Tamil/Hindi labels and help. Catalogue validation now covers 4,104 bilingual entries.
- 95 isolated backend tests pass, including new custom-order/delivery conditions, draft restoration and all selected store types. Runtime translation tests pass.
- Actual renderer checked in a write-disabled fixture: Tamil desktop and Tamil/Hindi 390px mobile, no horizontal overflow, selected-store filtering verified. Screenshot: home-retail-tamil-desktop.png. Temporary fixture removed; local app restarted.
- No production forms, agreements or documents were submitted. Authenticated end-to-end submission remains unverified.

## Electronics store onboarding — 27 September 2026

- Extended the existing retail renderer/schema and authenticated persistence route for Mobile Store, Computer Store, Home Appliance Store, Electronics Store and Accessories Store. Existing taxonomy path: Shopping & Retail → Electronics Retail.
- Reuses profile contacts, document upload/removal and approval workflow. Installation and delivery controls are conditional on offered services; unrelated store fields are disabled and excluded server-side.
- Added Tamil/Hindi labels and guidance; fixed multi-paragraph document help and case-insensitive help-label lookup.
- 94 isolated backend tests passed; 4,078 bilingual entries and runtime translation tests passed. No production accounts or documents were changed in testing.
- Actual renderer verified in a temporary write-disabled fixture: Tamil desktop at 1280px and Tamil/Hindi mobile at 390px, no horizontal overflow; selected-store filtering and delivery/installation visibility verified. Temporary fixture removed afterward.
- Signed-in production end-to-end upload/submission remains unverified, distinct from the passing isolated backend tests. Local server restarted successfully with updated validation.

## Update — 27 September 2026 (supersedes older notes below)

- 4,048 bilingual catalogue entries validated. Earlier source audit: 3,238 phrases, 3,191 translated and 47 explicitly preserved names/notation; no missing entries within extractor coverage.
- Fixed exact aliases for renamed role labels and translated fixed product-card actions without translating product names or reviews.
- Verified Tamil homepage at desktop 1280px and mobile 390px. Fixed mobile feature-strip overflow; mobile document/content widths both 375px excluding scrollbar. Screenshot: tamil-mobile-verification.png.
- Signed-in onboarding audit is blocked: opening vendor.html redirects to index.html because the verification browser has no authenticated session. User sign-in is required; no authentication checks were bypassed.
- All 28 policy previews now have draft Tamil/Hindi translations. Original documents remain unchanged; legal and linguistic review is still required.
- Runtime tests pass for language switching/restoration, stored option values, exclusions, validation, help and persistence.
- Added Tamil/Hindi wrapping, typography, help-popover sizing, agreement alignment and mobile single-column layout rules.
- Tamil registration inspected at a 390px mobile viewport: content and document widths both 375px (excluding scrollbar), with no horizontal overflow.
- Remaining: signed-in onboarding visual verification across every service, desktop/mobile coverage, dynamic messages and UI outside existing selectors, and native-language review. Source audit success does not establish complete live UI translation.

English is the default. Tamil and Hindi can be selected in the page-top language control; selection is saved in this browser. Interface translations use a local exact-match catalogue in languages.js. Missing translations remain in English and a visible notice explains that fallback.

## Verified

- Browser: Tamil selection translates registration/login controls.
- Browser: Hindi choice persists when navigating from home to signup.
- Browser: first-name labels and help accessibility labels switch between Hindi, Tamil and English.
- Browser: typed test text remains unchanged through language switches; no form submitted.
- Dropdown option values are pinned before translating option labels; input values are never translated.
- Existing backend regression suite: 92 tests passed.
- Translation catalogue validation: run `node test_languages.cjs`.

## Not complete

- Full translation of every page, service-specific field/help text, notification and server error.
- Linguistic review by Tamil/Hindi speakers.
- Legal and linguistic review of the draft policy translations (translation drafts are implemented).
- Full signed-in onboarding and mobile layout audit in both languages.

Do not describe this release as complete app-wide localization. Add exact source phrases and both translations to the catalogue, or explicitly mark application-owned text with data-i18n. Do not mark user-generated content. Never translate stored option values, identifiers, uploaded documents or user-entered descriptions.
