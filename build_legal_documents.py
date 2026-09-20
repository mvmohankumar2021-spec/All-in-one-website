from pathlib import Path
from docx import Document
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

OUT = Path(__file__).resolve().parent / "legal-documents"


def set_font(run, size=11, bold=False):
    run.font.name = "Aptos"
    run._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
    run._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = RGBColor(0, 0, 0)


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("SHAKALPA | Page ")
    set_font(run, 8)
    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), "PAGE")
    paragraph._p.append(fld)


def paragraph(document, text="", bold_lead=None):
    p = document.add_paragraph()
    p.paragraph_format.space_after = Pt(7)
    p.paragraph_format.line_spacing = 1.18
    if bold_lead and text.startswith(bold_lead):
        lead = p.add_run(bold_lead)
        set_font(lead, 11, True)
        rest = p.add_run(text[len(bold_lead):])
        set_font(rest)
    else:
        run = p.add_run(text)
        set_font(run)
    return p


def heading(document, text, level=1):
    p = document.add_paragraph()
    p.style = "Heading 1" if level == 1 else "Heading 2"
    p.paragraph_format.space_before = Pt(14 if level == 1 else 9)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(text)
    set_font(run, 15 if level == 1 else 12, True)
    return p


def bullets(document, items):
    for item in items:
        p = document.add_paragraph(style="List Bullet")
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.12
        run = p.add_run(item)
        set_font(run, 10.5)


def make_document(title, purpose, sections, acknowledgement, filename):
    document = Document()
    section = document.sections[0]
    section.top_margin = Inches(0.72)
    section.bottom_margin = Inches(0.7)
    section.left_margin = Inches(0.8)
    section.right_margin = Inches(0.8)
    styles = document.styles
    styles["Normal"].font.name = "Aptos"
    styles["Normal"]._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
    styles["Normal"]._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")
    styles["Normal"].font.size = Pt(11)
    for name in ("Heading 1", "Heading 2"):
        styles[name].font.color.rgb = RGBColor(0, 0, 0)
    header = section.header.paragraphs[0]
    header.text = "SHAKALPA"
    header.alignment = WD_ALIGN_PARAGRAPH.LEFT
    for run in header.runs:
        set_font(run, 9, True)
    add_page_number(section.footer.paragraphs[0])

    title_p = document.add_paragraph(style="Title")
    title_p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    title_p.paragraph_format.space_after = Pt(5)
    title_run = title_p.add_run(title)
    set_font(title_run, 24, True)
    meta = document.add_paragraph()
    meta.paragraph_format.space_after = Pt(15)
    meta_run = meta.add_run("Version 1.0 | Partner onboarding draft | India")
    set_font(meta_run, 9)
    paragraph(document, purpose)
    paragraph(document, "This document is intended for partner onboarding and operational use. It should be reviewed and approved by SHAKALPA's legal and compliance teams before production use.")
    for section_title, intro, points in sections:
        heading(document, section_title)
        if intro:
            paragraph(document, intro)
        if points:
            bullets(document, points)
    heading(document, "Acknowledgement")
    paragraph(document, acknowledgement)
    paragraph(document, "By accepting this document in the SHAKALPA partner onboarding flow, the partner confirms that the information provided is accurate and agrees to comply with this document as updated from time to time.")
    OUT.mkdir(exist_ok=True)
    document.save(OUT / filename)


make_document(
    "SHAKALPA Code of Conduct",
    "This Code of Conduct sets the minimum standards for every SHAKALPA Service Partner, including electrical service partners, when serving customers through the platform.",
    [
        ("Scope and purpose", "Partners must conduct themselves professionally, safely, lawfully, and respectfully in every customer interaction.", []),
        ("Professional conduct", "Partners must:", ["provide accurate service descriptions, pricing, availability, qualifications, and contact information;", "arrive on time where an appointment is accepted, communicate delays promptly, and complete agreed work with reasonable care;", "treat customers, colleagues, and other partners with dignity and without discrimination, harassment, intimidation, or abusive language;", "not request payment outside SHAKALPA where platform rules require the platform payment flow."]),
        ("Customer safety and property", "Partners must:", ["use suitable tools, personal protective equipment, and safe work practices;", "obtain customer approval before material changes, additional work, or charges beyond the quoted scope;", "protect customer property, keep work areas orderly, and report damage or incidents promptly;", "stop work and escalate when a task cannot be performed safely or lawfully."]),
        ("Integrity and compliance", "Partners must not:", ["misrepresent licences, qualifications, customer ratings, photographs, service records, or prices;", "offer, request, or accept bribes, kickbacks, or improper benefits;", "use another person's identity, account, documents, or payment details without authority;", "perform work for which a licence, registration, insurance, or qualification is required unless the partner holds and maintains the applicable requirement."]),
        ("Privacy and reporting", "Partners must protect customer information and use it only to deliver the booked service. Suspected safety incidents, fraud, harassment, data misuse, or serious service failures must be reported to SHAKALPA without delay.", []),
        ("Enforcement", "SHAKALPA may investigate concerns, request evidence, pause listings or bookings, require corrective action, or suspend or terminate access where this Code or applicable law is breached.", []),
    ],
    "I have read and understood the SHAKALPA Code of Conduct and agree to follow it.",
    "SHAKALPA_Code_of_Conduct_India_Draft.docx",
)

make_document(
    "SHAKALPA Electrical Safety Declaration",
    "This Safety Declaration applies to Service Partners offering electrical repair, wiring, inspection, fan or light installation, inverter installation, or related electrical services through SHAKALPA.",
    [
        ("Purpose", "Electrical work can create risks to people and property. This declaration records the safety commitments required before a partner can be activated for electrical services.", []),
        ("Competence and authority", "The partner declares that they will:", ["offer only services within their competence, experience, and legal authority;", "maintain any licence, registration, certification, insurance, or supervision required for the specific work and location;", "not undertake higher-risk work such as home wiring, inverter installation, or electrical inspection without the appropriate qualification and registration details supplied to SHAKALPA."]),
        ("Safe work practices", "Before and during work, the partner will:", ["assess the work area and identify hazards before beginning;", "isolate, test, and verify electrical systems where required before working on them;", "use suitable insulated tools, testing equipment, protective equipment, and materials;", "keep customers, children, and bystanders away from hazards and explain any needed precautions;", "stop work when unsafe conditions, missing information, or required authorisations prevent safe completion."]),
        ("Pricing and materials", "The partner will explain inspection, labour, emergency, and material charges before incurring them where reasonably possible. Substitute materials or material costs outside the agreed scope require customer approval.", []),
        ("Incidents and escalation", "The partner will promptly notify emergency services when needed, make the area safe where possible, and report serious incidents, property damage, electrical hazards, or customer complaints to SHAKALPA.", []),
        ("No waiver of legal requirements", "This declaration does not replace any licence, statutory duty, local authority approval, electrical code, insurance requirement, or other legal obligation that applies to the work.", []),
    ],
    "I confirm that I will follow these safety commitments and will not accept or complete work that I am not qualified, authorised, or equipped to perform safely.",
    "SHAKALPA_Electrical_Safety_Declaration_India_Draft.docx",
)

make_document(
    "SHAKALPA Background Verification Consent",
    "This consent explains how SHAKALPA may conduct a background verification for a Service Partner before or after activation, where permitted by applicable law.",
    [
        ("What SHAKALPA may verify", "With the partner's consent and where lawful, SHAKALPA may verify identity information, address information, work experience or credentials, licences or registrations, business details, public professional references, and records relevant to safety, fraud prevention, or platform trust.", []),
        ("Purpose", "Verification supports customer safety, platform integrity, prevention of fraud, and compliance with SHAKALPA's onboarding standards. It is not a guarantee of employment, bookings, earnings, or continued activation.", []),
        ("Sources and sharing", "SHAKALPA may use information supplied by the partner, authorised verification providers, issuing authorities, professional references, and publicly available sources where permitted. Information is shared only with personnel and providers who need it for verification, compliance, or safety purposes.", []),
        ("Partner responsibilities", "The partner must provide accurate information, promptly disclose material changes to verification information, and cooperate with reasonable document or clarification requests. False, incomplete, or misleading information may delay, suspend, or end activation.", []),
        ("Privacy and retention", "SHAKALPA will handle verification information under its Privacy Policy and retain it only for as long as needed for the stated purposes, legal obligations, dispute handling, or legitimate security needs.", []),
        ("Review and questions", "Where appropriate, a partner may ask SHAKALPA to correct inaccurate information or request an explanation of a verification outcome, subject to legal, safety, and fraud-prevention limits.", []),
    ],
    "I voluntarily consent to the background verification activities described in this document and confirm that I have authority to provide the information and documents requested.",
    "SHAKALPA_Background_Verification_Consent_India_Draft.docx",
)
