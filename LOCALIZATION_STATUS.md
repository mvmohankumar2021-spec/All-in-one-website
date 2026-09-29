# Language rollout status

## Beauty services onboarding — 28 September 2026

- Added Beauty Parlour, Bridal Makeup, Makeup Artist, Mehndi Artist, Nail Studio and Skin Care to the shared salon form. Existing compact layout, uploads, help, selected-service validation and conditional home service flow are reused.
- Added bilingual service-specific labels/help. Expanded shared safety guidance for ingredients, single-use items, product instructions and promotional-photo consent; home-service help includes event/outstation setup. Skin Care explicitly excludes medical/invasive procedures from this listing scope.
- 111 backend tests (including each new service and conditional home-service validation) and localization runtime tests pass. Active taxonomy and live schema verified. Fresh visual checks and real signed-in uploads/submission remain unverified.

## Salon onboarding — 28 September 2026

- Added Mens Salon, Womens Salon, Unisex Salon, Haircut, Hair Styling and Hair Coloring using the existing compact layout, help controls, document uploads/removal and agreements.
- Shared team/booking/pricing/hygiene fields are entered once. Service-specific questions follow selection; home service coverage/setup appears only when offered. Salon-only forms omit retail fulfilment and fashion-studio questions.
- New labels/help translated into Tamil and Hindi; coverage and active taxonomy entries verified. 111 backend tests and localization runtime tests pass. Fresh visual checks and real signed-in upload/submission remain unverified.

## Pharmacy and medical supplies — 28 September 2026

- Added Pharmacy, Medical Equipment and Surgical Supplies using the existing retail layout, documents, help and approval workflow. Includes pharmacist/prescription controls, product evidence and safeguards, equipment support and surgical traceability.
- Rental terms appear only for equipment rental; delivery uses the existing conditional fields. New labels/help translated into Tamil and Hindi.
- 110 backend tests, localization runtime tests and syntax checks pass. Translation coverage and active taxonomy entries verified. Fresh visual audit and real signed-in upload/submission remain unverified.

## Care and ambulance onboarding — 28 September 2026

- Added Physiotherapy, Home Nursing, Elder Care, Rehabilitation Centre and Ambulance Service, using existing layout, help, documents, agreements and verification workflow.
- Includes selected-service scope, coverage/pricing and safeguarding. Elder-care-only applications omit clinician and clinical-service questions; adding a clinical service restores those requirements. Ambulance guidance distinguishes patient transport from emergency capability.
- Tamil/Hindi labels and help coverage verified. 109 backend tests and localization runtime tests pass. Fresh visual checks and real signed-in upload/submission remain unverified.

## Diagnostic onboarding — 28 September 2026

- Added Diagnostic Centre, Blood Test Lab, Scan Centre, X-Ray Centre and Health Checkup to the existing healthcare onboarding layout and credential-review flow.
- Includes selected-service questions, preparation/prices/report delivery, quality/sample/critical-result processes, and conditional home sample collection distinct from clinical home visits. Existing uploads, help and agreements are reused.
- Tamil/Hindi coverage verified for all new labels and help. 108 backend tests and localization runtime tests pass. Fresh browser visual checks and real signed-in uploads/submission remain unverified.

## Eye, optical, ENT and hearing onboarding — 28 September 2026

- Added Eye Hospital, Optical Store, Eye Checkup, ENT Clinic and Hearing Aid Centre using the existing responsive form, help controls, document upload/removal and agreements.
- Optical-only applications retain retail requirements without clinical credential declarations. The other four services use healthcare credential review. Product support and conditional delivery apply to optical/hearing services; clinical home visits retain existing conditional fields.
- New labels and help have Tamil/Hindi translations. All five active taxonomy entries verified. 107 backend tests, localization runtime tests and JavaScript syntax checks pass.
- This increment has not had a fresh browser visual audit or real signed-in upload/submission test. Existing layout is reused; native-language review remains recommended.

## Healthcare and dental onboarding — 28 September 2026

- Added six hospital/clinic services and six dental services to the healthcare onboarding flow. Dental applications include selected-service questions and infection-control, consent and aftercare guidance, with English, Tamil and Hindi labels/help.
- Reused compact responsive layout, authenticated document upload/removal and mandatory validation. Healthcare credential review is required before profile approval; changed applications invalidate earlier review.
- 106 isolated backend tests and localization runtime checks pass. Dental service switching and translated help verified in a write-disabled browser fixture; Tamil mobile had no horizontal overflow. Screenshot: dental-hindi-preview.png.
- Real signed-in uploads/submission and human credential verification were not performed. Translations still need native-language review; policy translations remain drafts.

## Fashion accessories onboarding — 28 September 2026

- Added Footwear, Bags & Luggage, Fashion Jewellery, Watches and Fashion Accessories under Fashion & Clothing → Accessories using the existing retail form and authenticated persistence/upload workflow.
- Added selected-category specifications, material/authenticity claims, fit/exchange/hygiene guidance and repairs/care. Shared warranty and personalisation fields are retained; delivery is conditional and appliance installation is omitted for accessory-only applications.
- Tamil/Hindi labels, help and taxonomy translations added. 102 isolated backend tests and runtime translation tests pass.
- Tamil desktop and Tamil/Hindi mobile previews checked in a write-disabled fixture: no horizontal overflow, category switching, delivery visibility and translated help opening verified. Screenshot: accessories-tamil-desktop.png.
- Temporary fixture removed and local server restarted. No real documents or agreements were submitted; authenticated end-to-end submission remains unverified.

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
