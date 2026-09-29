# Language rollout status

## Guest and shared accommodation onboarding — 29 September 2026

- Added Guest House, Lodge, Service Apartment, Hostel and PG Accommodation to the accommodation flow, with Tamil/Hindi labels/help and existing document/agreement controls. Covers shared/private facilities, meals, supervision, long-stay terms, deposits, notices and handover alongside common booking/safety fields.
- 153 backend tests pass, including hotel-family required-field coverage for the new entries. Localization runtime, syntax, translation coverage, active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. No live accommodation inventory or booking integration is implemented.

## Resort and hosted-stay onboarding — 29 September 2026

- Added Resort, Homestay, Holiday Home and Farm Stay using existing accommodation fields, help, documents and agreements. Specifics cover activities, host/shared-space arrangements, whole-home handover and farm hazards/supervision; Tamil/Hindi labels and help included.
- 153 backend tests pass, including hotel-family required-field coverage for the additions. Localization runtime, syntax, translation coverage, active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. No live room inventory or booking integration is implemented.

## Hotel provider onboarding — 29 September 2026

- Added Budget Hotel, Business Hotel, Luxury Hotel and Boutique Hotel with shared room/accessibility, booking/rate/policy, safety/privacy and selected-hotel fields. Reuses provider layout, help, documents and agreements with Tamil/Hindi translations.
- 153 backend tests, localization runtime, translation coverage and renderer syntax checks pass. Active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. No live room inventory, hotel booking or rating verification integration is implemented.

## Travel assistance onboarding — 29 September 2026

- Added Tourist Guide, Visa Service, Passport Assistance and Travel Insurance to the travel-provider flow with Tamil/Hindi labels/help. Travel Insurance also activates insurance credentials/disclosure/privacy/support fields. Reuses document controls and agreements.
- 152 backend tests pass, including travel/insurance family validation for the additions. Localization runtime, syntax, translation coverage, active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. No visa/passport issuance, insurance issuance or government submission integration is implemented. Schema is read per request; no restart needed.

## Vehicle rental onboarding — 29 September 2026

- Added Car Rental, Bike Rental, Bus Rental and Tourist Vehicle Rental to the road-provider flow with rental-specific deposits, insurance/damage, return and selected-fleet terms. Reuses help, documents and agreements with Tamil/Hindi translations.
- 152 backend tests, localization runtime, translation coverage and renderer syntax checks pass. Active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. No live fleet availability or rental-booking integration is implemented.

## Passenger transport onboarding — 29 September 2026

- Added Taxi Service, Cab Service, Auto Service (passenger auto-rickshaw) and Driver Service using the road-provider flow, help, documents and agreements. Covers coverage/hours, pricing/cancellation, safety and selected-service fleet/driver/assignment details.
- 151 backend tests pass, including road-family required-field checks for these additions. Localization runtime, syntax, Tamil/Hindi coverage, active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. No live trip booking, dispatch or automatic driver/permit verification is implemented.

## Travel provider onboarding — 29 September 2026

- Added Travel Agency, Tour Operator, Flight Booking, Train Booking, Bus Booking and Holiday Package using the existing provider layout, help, documents and agreements. Includes credentials/destinations, price/confirmation/cancellation disclosures, traveller support/privacy and selected-service scope.
- 151 backend tests, localization runtime, Tamil/Hindi coverage and renderer syntax checks pass. Active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. No ticket issuance, supplier booking or live availability integration is implemented.

## Road support and driving-school onboarding — 29 September 2026

- Added Towing Service, Roadside Assistance and Driving School with the shared provider layout, help, documents and agreements. Covers credentials/coverage, booking/fees, safety and selected-service capability or curriculum details.
- 149 backend tests, localization runtime, Tamil/Hindi coverage and renderer syntax checks pass. Active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. No live dispatch, licence issuance or automatic credential verification is implemented.

## Vehicle wash and detailing onboarding — 29 September 2026

- Added Car Wash, Bike Wash, Car Detailing and Ceramic Coating to the existing workshop-provider flow, reusing estimates/approval, safe handover/warranty, help, documents and agreements. Specifics cover packages, cleaning methods, protection, preparation, curing and aftercare.
- 147 backend tests pass, including workshop-family required-field tests for these additions. Localization runtime, Tamil/Hindi coverage, syntax, active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. Existing handler reads schema per request; no restart needed.

## Vehicle parts and accessories onboarding — 29 September 2026

- Added Car/Bike Spare Parts and Car/Bike Accessories using the existing retail sales/support layout, help, documents and agreements. Covers selected-service range/compatibility, sourcing/condition, fitting and warranty; reuses conditional installation/delivery and returns fields.
- 147 backend tests, localization runtime, Tamil/Hindi coverage and syntax checks pass. Active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. Existing handler loads schema per request; no restart needed.

## Tyre and battery onboarding — 29 September 2026

- Added Tyre Shop and Battery Dealer using retail sales/support fields; Wheel Alignment and Battery Replacement use workshop fields. Reuses help, documents, agreements and conditional installation/delivery controls; specifics cover compatibility, tests, warranty and exchange terms.
- 146 backend tests pass, including family/service coverage for these additions. Localization runtime, Tamil/Hindi coverage, syntax, active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. Existing server reads the schema per request; no restart needed.

## Vehicle workshop onboarding — 29 September 2026

- Added Car/Bike Service, Car/Bike Repair, Engine Repair, AC Repair (vehicle AC scope) and Body Repair using the shared provider layout, help, uploads and agreements. Includes workshop capability, estimates/approval, parts/warranty and safe handover plus selected-service details.
- 146 backend tests, localization runtime, Tamil/Hindi coverage and renderer syntax checks pass. Active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. AC Repair is matched by the existing English service name; category-specific duplicate-name routing was not verified.

## Vehicle dealer onboarding — 29 September 2026

- Reused Notary without duplication. Added New/Used Car Dealer, New/Used Bike Dealer and Commercial Vehicle Dealer to the existing retail sales/support flow. Includes selected-dealer scope, condition/ownership checks, pricing/document handover, warranty, delivery, help, uploads and agreements.
- 145 backend tests, localization runtime, Tamil/Hindi coverage and renderer syntax checks pass. Active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. No vehicle-title or dealership-authorisation verification integration is included.

## Intellectual property provider onboarding — 29 September 2026

- Reused Notary without duplication; added Trademark Service, Patent Service and Copyright Service to the legal-provider flow with Tamil/Hindi labels/help. Inherits credentials, consultation/fees, privacy/conflict checks, document controls and agreements; new scope fields distinguish assistance from representation and warn against unpublished client work disclosures.
- 144 backend tests pass, including legal-family validation for the new entries. Localization runtime, syntax, translation coverage, active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. No government filing or automatic professional credential verification is implemented.

## Document and notarial provider onboarding — 29 September 2026

- Added Notary, Document Writer, Affidavit Service, Agreement Drafting and Registration Service to the existing legal-provider flow, reusing credentials, engagement/privacy, help, documents and agreements. Distinguishes drafting, attestation and official registration roles and captures selected-service details.
- 144 backend tests pass, including legal-family tests iterating over all five additions. Localization runtime, Tamil/Hindi coverage, syntax, active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. No automatic professional-authority verification or government filing integration is included. Existing server reads schema per request; no restart needed.

## Legal provider onboarding — 29 September 2026

- Added Civil Lawyer, Criminal Lawyer, Family Lawyer, Property Lawyer, Corporate Lawyer and Legal Consultant using the existing professional-provider layout, help, documents and agreements. Captures credentials/jurisdictions, engagement terms, confidentiality/conflicts and selected practice scope without requesting client case files.
- 144 backend tests, localization runtime, translation coverage and renderer syntax checks pass. Active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. No automatic professional credential verification or client case-management integration is implemented.

## Investment provider onboarding — 29 September 2026

- Added Mutual Fund Service, Stock Broker, Investment Advisor, Financial Planner and Retirement Planning using the shared professional-provider layout, help, documents and agreements. Covers role/credentials, assessment process, fees/conflicts, risk/privacy and selected-service scope.
- 142 backend tests, localization runtime, translation coverage and renderer syntax checks pass. Active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. No investment execution, personal financial advice or automatic credential verification is implemented.

## Insurance provider onboarding — 29 September 2026

- Added Life, Health, Vehicle and Business Insurance plus Insurance Agent using the existing professional-provider layout, help, document and agreement controls. Captures authorisation, disclosures, support/privacy and selected-service scope without requesting customer medical or policy records.
- 140 backend tests, localization runtime, translation coverage and renderer syntax checks pass. Active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. No policy issuance, claims processing or automatic authorisation verification is implemented.

## Loan provider onboarding — 29 September 2026

- Added Personal, Home, Business, Vehicle, Gold and Education Loan services using banking-provider scope, authorisation, safety, document and agreement controls. Includes selected-product scope and current rate/cost/repayment disclosure guidance; not a borrower application workflow.
- 138 backend tests, localization runtime, translation coverage and renderer syntax checks pass. Active taxonomy and live schema checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. No loan approvals, transactions or automatic authorisation verification are implemented.

## Banking provider onboarding — 29 September 2026

- Added Bank, ATM, Banking Correspondent and Digital Banking Assistance using the shared provider layout, help, documents and agreements. Captures authorisation evidence, locations/accessibility, service/charge information, safeguards and selected-service scope; warns against uploading customer banking secrets or records.
- Tamil/Hindi field/help coverage and active taxonomy verified. 137 backend tests and localization runtime checks pass; renderer syntax checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. No banking transactions or automatic regulatory-authorisation verification are implemented.

## Workspace and office onboarding — 29 September 2026

- Added Coworking Space, Virtual Office, Office Administration and Business Centre using the shared provider layout, help, document controls and agreements. Covers facilities, availability/pricing, access/privacy and selected-service scope.
- Tamil/Hindi field/help coverage and active taxonomy verified. 135 backend tests and localization runtime checks pass; renderer syntax checked.
- Fresh visual/mobile checks and real signed-in upload/submission remain unverified.

## Certification and compliance onboarding — 29 September 2026

- Added ISO Certification, Trademark Registration, Compliance Service and Secretarial Service to the existing registration-provider flow, reusing shared credentials, fees, process/privacy, documents and agreements. Each selected service has its own scope and help text in English, Tamil and Hindi.
- 133 backend tests pass, including registration tests iterating over the four additions; localization runtime, translation coverage, active taxonomy and live schema checked. Renderer syntax checked.
- Fresh visual/mobile and signed-in upload checks remain unverified. No government submission or accreditation verification integration is included.

## Consulting services onboarding — 29 September 2026

- Added Business Consultant, Management Consultant, HR Consultant, Operations Consultant and Strategy Consultant using the existing professional-provider layout, help, document controls and agreements. Covers expertise, deliverables, engagement terms, confidentiality and selected-service scope.
- Tamil/Hindi field/help coverage and active taxonomy verified. 133 backend tests and localization runtime checks pass; renderer syntax checked.
- Fresh visual/mobile checks and real signed-in upload/submission remain unverified.

## Registration services onboarding — 29 September 2026

- Added Company Registration, Startup Registration, MSME Registration, Business License and Import Export Registration using the existing provider layout, help, document controls and agreements. Includes scope/eligibility process, authorisation, fees, handover/privacy and selected-service details.
- Tamil/Hindi field/help coverage and active taxonomy verified. 131 backend tests and localization runtime checks pass; renderer syntax checked.
- Fresh visual/mobile checks and real signed-in upload/submission remain unverified. These are provider onboarding forms, not government application or filing integrations.

## Accounting services onboarding — 29 September 2026

- Added Chartered Accountant, Accounting, Bookkeeping, GST Consultant, Tax Consultant, Auditing and Payroll Service using the existing professional-provider layout, help, document controls and agreements. Captures credentials, engagement terms, confidentiality and selected-service scope without collecting client financial records.
- Tamil/Hindi labels/help and active taxonomy verified. 129 backend tests and localization runtime checks pass; renderer syntax checked.
- Fresh visual/mobile checks and real signed-in upload/submission remain unverified. Credential claims are collected, not automatically verified; no tax calculations or filings are performed by these forms.

## Computer equipment retail onboarding — 29 September 2026

- Added Computer Accessories, Networking Equipment and Printers & Peripherals to the existing electronics retail flow. Reuses shared supply, delivery, optional installation, warranty, documents and policies; service-specific fields cover compatibility, specifications, licensing and consumables.
- Tamil/Hindi labels/help coverage, active taxonomy and live schema verified. 127 backend tests and localization runtime checks pass.
- Fresh visual/mobile checks and real signed-in upload/submission remain unverified. No server restart needed: existing handler reads the schema per request.

## Security services onboarding — 29 September 2026

- Added Cybersecurity, CCTV Installation, Access Control and Network Security using the existing provider layout, help, documents and agreement controls. Includes qualifications, authorisation/privacy, testing/handover, pricing/warranty, selected-service scope and conditional maintenance/monitoring details.
- Tamil/Hindi field/help coverage and active taxonomy verified. 126 backend tests, localization runtime and JavaScript syntax checks pass.
- Fresh visual/mobile checks and real signed-in upload/submission remain unverified.

## IT support onboarding — 29 September 2026

- Added IT Support, Networking, Server Support, Cloud Services and Managed IT Services with existing provider layout, help, document controls and agreements. Includes coverage, service levels, access/change security, commercial terms, service-specific scope and conditional backup/recovery details.
- Tamil/Hindi field/help coverage and active taxonomy verified. 124 backend tests and localization runtime checks pass; JavaScript syntax checked.
- Fresh visual/mobile checks and real signed-in upload/submission remain unverified.

## Software development onboarding — 29 September 2026

- Added Software Development, Website Development, Mobile App Development, ERP Development and Custom Software using the existing project-provider layout, help, uploads and agreements. Includes engineering, ownership, security and conditional hosting, integration, migration, support, publishing and sensitive-data scope.
- Tamil/Hindi field and help coverage verified. 123 backend tests, localization runtime and JavaScript syntax checks pass.
- Fresh visual/mobile checks and real signed-in upload/submission remain unverified. A separate customer-facing project-brief workflow is not included.

## Device services onboarding — 29 September 2026

- Added Computer Sales, Laptop Sales, Mobile Sales, Computer Repair, Laptop Repair, Mobile Repair and Data Recovery using existing compact controls, help, uploads and agreements. Sales and repair terms are scoped to selected services; recovery includes consent, custody, limitations and secure deletion guidance.
- Conditional pickup/delivery, onsite, remote, third-party and business/bulk details included. Tamil/Hindi coverage, active taxonomy and live schema verified.
- 122 backend tests, localization runtime and syntax checks pass. Fresh visual checks and real signed-in upload/submission remain unverified.

## Freelance onboarding — 29 September 2026

- Added Freelance Professionals, Gig Services and Project-Based Services using compact provider layout, shared help, uploads and agreements. Includes pricing, collaboration, evidence and conditional onsite/team/IP/data/regulated-scope questions, translated into Tamil/Hindi.
- Project-brief requirements are provider-process guidance only; a separate customer-facing project-request workflow was not implemented.
- 121 backend tests, localization runtime and syntax checks pass. Translation coverage, active taxonomy and live schema verified. Fresh visual checks and real signed-in upload/submission remain unverified.

## Job-category onboarding — 29 September 2026

- Added IT Jobs, Sales Jobs, Driver Jobs, Security Jobs, Domestic Help Jobs, Part-Time Jobs, Work From Home Jobs and Internships to private employer onboarding, with shared employer/vacancy/pay/selection fields and selected-category details. Existing upload/help/agreement controls reused; Tamil/Hindi coverage verified.
- Combined category selections supported. No changes to public job creation or candidate application workflows: approved employers still publish separately through Job openings. Household-employer verification is not newly implemented; help directs private review and excludes exact household addresses/candidate documents.
- 120 backend tests, localization runtime and syntax checks pass. Active taxonomy/live schema checked. Fresh visual checks and real signed-in upload/submission remain unverified.

## Recruitment onboarding — 29 September 2026

- Added Recruitment Agency, Job Consultant, Executive Search and Staffing Service using existing compact layout, help, uploads and agreements; unrelated retail fields are excluded for recruitment-only listings.
- Includes selected-service scope, coverage/process, fee payer/remedies, candidate privacy/evidence and conditional overseas, screening, payroll and bulk recruitment. Tamil/Hindi labels and help coverage verified.
- 119 backend tests, localization runtime and syntax checks pass. Active taxonomy and live schema verified. Fresh visual checks and real signed-in upload/submission remain unverified.

## Online learning onboarding — 29 September 2026

- Added Online Tuition, Online Courses and E-Learning Platform using the education layout, uploads, help and agreements. Online-only listings omit physical-facility questions.
- Includes delivery/support, instructors/assessments/certificates, fees/privacy/content rights, conditional subscriptions and third-party hosting. Tamil/Hindi coverage and active taxonomy verified.
- 118 backend tests, localization runtime and syntax checks pass. Fresh visual checks and real signed-in upload/submission remain unverified.

## Creative and vocational training — 29 September 2026

- Added Music Classes, Dance Classes, Art Classes, Handwriting Classes, Skill Development and Vocational Training using the education layout, shared facility/safeguarding fields, help, uploads and agreements.
- Includes selected-service topics, trainers/curriculum/practice, safety/evidence and conditional home training, rentals, events/exams and placement assistance. Tamil/Hindi labels/help coverage verified.
- 117 backend tests, localization runtime and syntax checks pass. Active taxonomy and live schema verified. Fresh visual checks and real signed-in upload/submission remain unverified.

## Language-training onboarding — 29 September 2026

- Added Spoken English, Tamil Classes, Hindi Classes and Foreign Language Classes using education layout, shared online/facility/safeguarding fields, help, uploads and agreements.
- Includes selected-language scope, tutors/levels/courses, fees/certificates/privacy and conditional home tuition, exam preparation and corporate classes. Tamil/Hindi labels and help verified.
- 116 backend tests, localization runtime and syntax checks pass. Active taxonomy and live schema verified. Fresh visual checks and real signed-in upload/submission remain unverified.

## Technology training onboarding — 29 September 2026

- Added Computer Training, Coding Classes, Data Science Training, Networking Training and Cybersecurity Training using education layout, shared facilities, help, uploads and agreements.
- Includes selected-service topics, curriculum/trainers/certificates, devices/software/labs/costs and conditional corporate, certification and placement support. Cybersecurity practice is restricted in guidance to authorised environments; provider onboarding must not collect credentials or student IDs.
- Tamil/Hindi coverage, active taxonomy and live schema verified. 115 backend tests, localization runtime and syntax checks pass. Fresh visual checks and real signed-in upload/submission remain unverified.

## Coaching onboarding — 29 September 2026

- Added Tuition Centre, NEET Coaching, JEE Coaching, Competitive Exam Coaching and Government Exam Coaching using the education layout, shared facilities, uploads, help and agreements.
- Includes selected-exam scope, teaching/faculty/materials, fees/results/privacy guidance, conditional home tuition and standalone test series. Tamil/Hindi labels/help coverage verified.
- 114 backend tests, localization runtime and syntax checks pass. Active taxonomy and live schema checked. Fresh visual checks and real signed-in upload/submission remain unverified.

## Institution onboarding — 29 September 2026

- Added Preschool, School, College, University and Daycare using existing compact fields, help, document controls and agreements. Shared management/recognition, admissions/fees and safeguarding fields are entered once, alongside selected-service questions.
- Transport, meals, hostel, online learning and extended care have conditional details. Student identity, medical and admission records must not be uploaded in provider onboarding.
- Tamil/Hindi coverage, active taxonomy and live schema verified. 113 backend tests, localization runtime and syntax checks pass. Fresh visual checks and real signed-in upload/submission remain unverified.

## Wellness onboarding — 29 September 2026

- Added Spa, Massage Centre, Wellness Centre, Ayurvedic Wellness and Meditation Centre using existing compact controls, document uploads/removal, help and agreements. Shared staff/pricing/safety fields and selected-service details have Tamil/Hindi translations.
- Home visits, online sessions and residential retreats have separate conditional details. Clinical services may be saved as drafts but cannot be submitted through this non-medical listing flow; separate clinical review is required.
- 112 backend tests, localization runtime and JavaScript syntax checks pass. Translation coverage and active taxonomy verified. Fresh browser visual checks and real signed-in upload/submission remain unverified.

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
