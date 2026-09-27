# Language rollout status

## Update — 27 September 2026 (supersedes older notes below)

- 4,037 bilingual catalogue entries validated. Source audit: 3,238 phrases, 3,191 translated and 47 explicitly preserved names/notation; no missing entries within extractor coverage.
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
- Translated/reviewed legal documents; linked policy text remains English.
- Full signed-in onboarding and mobile layout audit in both languages.

Do not describe this release as complete app-wide localization. Add exact source phrases and both translations to the catalogue, or explicitly mark application-owned text with data-i18n. Do not mark user-generated content. Never translate stored option values, identifiers, uploaded documents or user-entered descriptions.
