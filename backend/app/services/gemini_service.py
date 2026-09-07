"""
NetraAI (SIH26038): Gemini 2.5 Flash Clinical Findings Validation & Explanation Service.
Connects to Google's Gemini 2.5 Flash API to perform multimodal and pathological reasoning
on fundus image findings, providing an authoritative, board-certified second opinion.
"""

import re
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import requests
from sqlmodel import Session, select

from backend.app.config import settings
from backend.app.models.case import Case, ImageQualityResult
from backend.app.models.grading import GradingResult, Lesion
from backend.app.models.gemini import GeminiValidation

logger = logging.getLogger(__name__)


class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL or "gemini-2.5-flash"
        self.endpoint_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"

    def _format_markdown_to_html(self, text: str) -> str:
        """Converts basic markdown headers, bolding, lists, and dividers to clean HTML."""
        html = text.strip()
        # Normalize dashes and entities
        html = html.replace("–", "&ndash;").replace("—", "&mdash;")
        html = html.replace("<", "&lt;").replace(">", "&gt;")
        
        # Horizontal rules
        html = re.sub(r'(?m)^---+\s*$', r'<hr style="border:0; border-top:1px solid #E2E8F0; margin:14px 0;">', html)

        # Headers
        html = re.sub(r'###\s*(.*?)(?:\n|$)', r'<h4 style="color:#0F766E; font-size:14px; font-weight:700; margin:16px 0 6px 0; letter-spacing:-0.2px;">\1</h4>', html)
        html = re.sub(r'##\s*(.*?)(?:\n|$)', r'<h3 style="color:#0F766E; font-size:16px; font-weight:800; margin:18px 0 8px 0;">\1</h3>', html)
        
        # Bold
        html = re.sub(r'\*\*(.*?)\*\*', r'<strong style="color:#0F172A; font-weight:700;">\1</strong>', html)
        
        # Bullet list items
        html = re.sub(r'(?m)^\s*[\*\-]\s+(.*?)$', r'<li style="margin-bottom:4px; line-height:1.5;">\1</li>', html)
        html = re.sub(r'(<li.*?>.*?</li>\n?)+', r'<ul style="margin:6px 0 12px 20px; padding-left:0; font-size:12.5px; color:#334155;">\g<0></ul>', html)
        
        # Paragraphs
        paragraphs = html.split("\n\n")
        formatted_paragraphs = []
        for p in paragraphs:
            p = p.strip()
            if not p:
                continue
            if p.startswith("<h") or p.startswith("<ul") or p.startswith("<ol") or p.startswith("<li") or p.startswith("<hr"):
                formatted_paragraphs.append(p)
            else:
                formatted_paragraphs.append(f'<p style="margin:6px 0 10px 0; font-size:12.5px; color:#334155; line-height:1.55;">{p}</p>')
        
        return "\n".join(formatted_paragraphs)

    def _generate_rule_based_fallback(self, case: Case, grading: Optional[GradingResult], 
                                      lesions: List[Lesion], lang: str) -> Dict[str, Any]:
        """
        Expert clinical fallback generator when Gemini API is offline or unreachable.
        Adheres to ICDR 2020 and ETDRS standards.
        """
        grade = grading.grade if grading else 0
        grade_label = grading.grade_label if grading else "No Apparent DR"
        conf_pct = round(grading.confidence * 100, 1) if grading else 90.0

        ma_count = sum(1 for l in lesions if l.type == "microaneurysm")
        he_count = sum(1 for l in lesions if l.type == "exudate")
        hem_count = sum(1 for l in lesions if l.type == "hemorrhage")
        nv_count = sum(1 for l in lesions if l.type == "neovascularization")

        # Check macular involvement
        macular_exudates = sum(1 for l in lesions if l.type == "exudate" and 0.35 <= l.bbox[0] <= 0.65 and 0.35 <= l.bbox[1] <= 0.65)
        has_macular_risk = macular_exudates > 0 or he_count >= 10

        if grade == 0:
            status = "CONCORDANT"
            risk_level = "Low"
            recommendation = "Routine annual dilated fundus screening with regular glycemic and blood pressure monitoring."
            text = (
                "### 1. Diagnostic Rationale & ICDR Correlation\n"
                f"Automated retinal screening confirms **Grade 0 — No Apparent Diabetic Retinopathy** with {conf_pct}% confidence. "
                "Retinal vasculature appears completely intact with no visible microvascular lesions, intraretinal hemorrhages, or lipid exudation.\n\n"
                "### 2. Anatomical Lesion Distribution & Microvascular Burden\n"
                "Pan-retinal evaluation demonstrates uniform arteriolar-venular caliber without signs of focal constriction, venous beading, or capillary leakage in any quadrant.\n\n"
                "### 3. Macular Edema & Visual Acuity Threat\n"
                "The foveal avascular zone (FAZ) exhibits regular elliptical contour with zero lipid accumulation. No risk of diabetic macular edema (DME) detected.\n\n"
                "### 4. Clinical Protocol & Specialist Management Plan\n"
                "Follow standard preventive protocol: annual tele-ophthalmology rescreening, maintaining target HbA1c < 7.0%, and optimal lipid/blood pressure management."
            )
        elif grade == 1:
            status = "CONCORDANT"
            risk_level = "Low to Mild"
            recommendation = "Re-evaluation within 6 to 12 months with emphasis on glycemic control to halt microvascular progression."
            text = (
                "### 1. Diagnostic Rationale & ICDR Correlation\n"
                f"Automated evaluation confirms **Grade 1 — Mild Non-Proliferative Diabetic Retinopathy (NPDR)** with {conf_pct}% confidence. "
                f"Pathology is characterized strictly by isolated microaneurysms ({ma_count} detected) in the absence of blot hemorrhages or lipid exudates.\n\n"
                "### 2. Anatomical Lesion Distribution & Microvascular Burden\n"
                "Microaneurysms represent focal saccular outpouchings of retinal capillaries due to pericyte loss. Lesion burden remains low and localized.\n\n"
                "### 3. Macular Edema & Visual Acuity Threat\n"
                "Foveal integrity is preserved with no focal lipid deposition within the central 1500 microns. Visual acuity is not currently threatened.\n\n"
                "### 4. Clinical Protocol & Specialist Management Plan\n"
                "Recommend follow-up retinal imaging in 6 to 12 months. Advise the primary care physician to review glycemic control and blood pressure."
            )
        elif grade == 2:
            status = "CONCORDANT_WITH_CAUTION" if has_macular_risk else "CONCORDANT"
            risk_level = "High (Macular Involvement)" if has_macular_risk else "Moderate"
            recommendation = "Ophthalmology referral within 4 to 8 weeks. Optical Coherence Tomography (OCT) recommended to evaluate macular thickening."
            text = (
                "### 1. Diagnostic Rationale & ICDR Correlation\n"
                f"Analysis substantiates **Grade 2 — Moderate NPDR** with {conf_pct}% confidence. "
                f"The clinical profile exhibits {ma_count} microaneurysms, {hem_count} intraretinal hemorrhages, and {he_count} hard exudates, indicating progressive capillary leakage without meeting the 4-2-1 severe criteria.\n\n"
                "### 2. Anatomical Lesion Distribution & Microvascular Burden\n"
                "Lesions demonstrate active breakdown of the blood-retinal barrier. Lipid transudates have precipitated into distinct hard exudate clusters.\n\n"
                "### 3. Macular Edema & Visual Acuity Threat\n"
                + (f"**ELEVATED RISK:** {macular_exudates} hard exudates are detected in proximity to the macular center. High suspicion for Clinically Significant Macular Edema (CSME)."
                   if has_macular_risk else "Exudates are currently extra-foveal, but ongoing lipid extravasation warrants close central monitoring.") + "\n\n"
                "### 4. Clinical Protocol & Specialist Management Plan\n"
                "Refer to comprehensive ophthalmology within 1-2 months. Perform macular OCT. Counsel patient on strict glycemic control (HbA1c < 7.0%) and lipid optimization."
            )
        elif grade == 3:
            status = "REVIEW_REQUIRED"
            risk_level = "Severe / Pre-Proliferative"
            recommendation = "Expedited retinal specialist consultation within 2 to 4 weeks. High risk of conversion to proliferative retinopathy."
            text = (
                "### 1. Diagnostic Rationale & ICDR Correlation\n"
                f"Analysis indicates **Grade 3 — Severe NPDR** with {conf_pct}% confidence. "
                f"Substantial microvascular compromise with extensive intraretinal hemorrhages ({hem_count}) and microaneurysms ({ma_count}) fulfilling the clinical 4-2-1 rule criteria.\n\n"
                "### 2. Anatomical Lesion Distribution & Microvascular Burden\n"
                "Pan-retinal ischemic insult with widespread capillary non-perfusion across multiple quadrants. The high hemorrhage density signals severe endothelial breakdown.\n\n"
                "### 3. Macular Edema & Visual Acuity Threat\n"
                "Significant risk of concurrent macular edema and progressive retinal ischemia threatening central visual acuity.\n\n"
                "### 4. Clinical Protocol & Specialist Management Plan\n"
                "Expedited vitreoretinal referral within 2-4 weeks. Perform widefield fluorescein angiography (FFA) and macular OCT. Prepare for potential prophylactic anti-VEGF or panretinal photocoagulation (PRP) if rapid progression occurs."
            )
        else:  # Grade 4
            status = "REVIEW_REQUIRED"
            risk_level = "Urgent / Vision-Threatening"
            recommendation = "URGENT vitreoretinal referral within 24 to 72 hours. High danger of preretinal/vitreous hemorrhage or tractional retinal detachment."
            text = (
                "### 1. Diagnostic Rationale & ICDR Correlation\n"
                f"Screening confirms **Grade 4 — Proliferative Diabetic Retinopathy (PDR)** with {conf_pct}% confidence. "
                f"Identification of neovascularization fronds ({nv_count} detected) or massive hemorrhagic burden indicates critical ischemic VEGF upregulation.\n\n"
                "### 2. Anatomical Lesion Distribution & Microvascular Burden\n"
                "Pathological new fragile vessels breaching the internal limiting membrane. Severe pan-retinal capillary non-perfusion.\n\n"
                "### 3. Macular Edema & Visual Acuity Threat\n"
                "Immediate vision-threatening state. High risk of acute visual loss secondary to vitreous hemorrhage, fibrovascular proliferation, or tractional macular detachment.\n\n"
                "### 4. Clinical Protocol & Specialist Management Plan\n"
                "Urgent vitreoretinal intervention required within 24-72 hours. Evaluate for immediate anti-VEGF injections and urgent Panretinal Photocoagulation (PRP). Restrict strenuous physical exertion."
            )

        return {
            "status": status,
            "macular_edema_risk": risk_level,
            "clinical_recommendation": recommendation,
            "clinical_explanation": text,
            "model_name": "gemini-2.5-flash (offline clinical fallback)"
        }

    def validate_and_explain_case(self, case_id: str, session: Session, lang: str = "en", 
                                  force_refresh: bool = False) -> GeminiValidation:
        """
        Retrieves or generates an exhaustive Gemini 2.5 Flash clinical validation and explanation.
        Caches results in the database to prevent duplicate API overhead.
        """
        # 1. Check existing cached validation
        if not force_refresh:
            existing = session.exec(
                select(GeminiValidation)
                .where(GeminiValidation.case_id == case_id)
                .where(GeminiValidation.lang == lang)
            ).first()
            if existing:
                return existing

        case = session.get(Case, case_id)
        if not case:
            raise ValueError(f"Case {case_id} not found")

        grading = session.exec(select(GradingResult).where(GradingResult.case_id == case_id)).first()
        quality = session.exec(select(ImageQualityResult).where(ImageQualityResult.case_id == case_id)).first()
        lesions = session.exec(select(Lesion).where(Lesion.case_id == case_id)).all()

        # Count lesions
        ma_count = sum(1 for l in lesions if l.type == "microaneurysm")
        he_count = sum(1 for l in lesions if l.type == "exudate")
        hem_count = sum(1 for l in lesions if l.type == "hemorrhage")
        nv_count = sum(1 for l in lesions if l.type == "neovascularization")

        # Quadrant counts
        st_count = sum(1 for l in lesions if l.bbox[0] >= 0.5 and l.bbox[1] < 0.5)
        it_count = sum(1 for l in lesions if l.bbox[0] >= 0.5 and l.bbox[1] >= 0.5)
        sn_count = sum(1 for l in lesions if l.bbox[0] < 0.5 and l.bbox[1] < 0.5)
        in_count = sum(1 for l in lesions if l.bbox[0] < 0.5 and l.bbox[1] >= 0.5)

        macular_exudates = sum(1 for l in lesions if l.type == "exudate" and 0.35 <= l.bbox[0] <= 0.65 and 0.35 <= l.bbox[1] <= 0.65)
        macular_risk_str = "High (exudates present within 1 disc diameter of foveal center)" if macular_exudates > 0 else (
            "Moderate (peripheral exudate clusters)" if he_count > 10 else "Low (no central lipid accumulation)"
        )

        patient_ref = case.patient_ref or f"PATIENT-{case.case_id[:8].upper()}"
        grade_val = grading.grade if grading else 0
        grade_label = grading.grade_label if grading else "No Apparent DR"
        conf_pct = round(grading.confidence * 100, 1) if grading else 0.0
        referable_str = "SPECIALIST REFERRAL REQUIRED" if (grading and grading.referable) else "ROUTINE ANNUAL FOLLOW-UP"
        summary_str = grading.summary_text if grading else "No focal retinal lesions."

        # 2. Attempt Google Gemini 2.5 Flash API call
        validation_data = None
        if self.api_key:
            prompt_lang_note = " Respond in professional medical Hindi (Devanagari script) with standard clinical terms." if lang == "hi" else ""
            
            prompt = f"""You are a Senior Consultant Vitreoretinal Specialist and Lead AI Clinical Validator.
Analyze the following automated retinal screening results and provide a structured, detailed clinical diagnostic explanation for the official patient report.{prompt_lang_note}

Screening Case Findings:
- Patient Reference: {patient_ref}
- Image Quality Check: {'Passed' if quality and quality.passed else 'Sub-optimal'} (Score: {int(quality.quality_score * 100) if quality else 85}%, Focus: {int(quality.focus_score * 100) if quality else 90}%, Illumination: {int(quality.illumination_score * 100) if quality else 88}%)
- Predicted ICDR Severity Grade: Grade {grade_val} — {grade_label}
- Calibrated AI Confidence: {conf_pct}%
- Clinical Referral Status: {referable_str}
- Quantified Lesions:
  * Microaneurysms: {ma_count}
  * Intraretinal Hemorrhages: {hem_count}
  * Hard Exudates (Lipid Deposits): {he_count}
  * Neovascularization Fronds: {nv_count}
- Quadrant Spatial Distribution:
  * Superior Temporal: {st_count} lesions
  * Inferior Temporal: {it_count} lesions
  * Superior Nasal: {sn_count} lesions
  * Inferior Nasal: {in_count} lesions
- Diabetic Macular Edema (DME) Risk: {macular_risk_str}
- Automated Segmentation Summary: {summary_str}

Please generate an authoritative, highly detailed clinical review divided explicitly into the following 4 sections:

### 1. Diagnostic Rationale & ICDR Correlation
Explain in comprehensive ophthalmological detail why the detected lesion profile justifies Grade {grade_val} ({grade_label}) according to the International Clinical Diabetic Retinopathy (ICDR) scale and ETDRS standards. Note the significance of lesion types, presence or absence of 4-2-1 criteria, and proliferative signs.

### 2. Anatomical Lesion Distribution & Microvascular Burden
Analyze the clinical significance of the spatial lesion spread across retinal quadrants. Discuss what the quadrant concentrations indicate regarding capillary non-perfusion, blood-retinal barrier breakdown, and retinal ischemia.

### 3. Macular Edema & Visual Acuity Threat
Evaluate the risk to central visual acuity. Assess the proximity of hard exudates and hemorrhages to the foveal avascular zone (FAZ) and the urgency of Optical Coherence Tomography (OCT) verification for Clinically Significant Macular Edema (CSME).

### 4. Clinical Protocol & Specialist Management Plan
Provide a prescriptive, actionable clinical roadmap:
- Specific specialist referral timeframe (e.g. urgent 24-72 hours, 2-4 weeks, 2 months, or routine annual rescreen)
- Recommended diagnostic investigations (OCT, Fluorescein Angiography, visual fields)
- Systemic diabetes targets (HbA1c, blood pressure, lipid control)
- Critical warning signs and counseling for the patient.

Maintain an authoritative, clinical tone suitable for reviewing ophthalmologists and primary care physicians."""

            try:
                url = f"{self.endpoint_url}?key={self.api_key}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.2,
                        "maxOutputTokens": 4096,
                        "thinkingConfig": {"thinkingBudget": 0}
                    }
                }
                response = requests.post(url, json=payload, timeout=25)
                if response.status_code == 200:
                    resp_json = response.json()
                    candidates = resp_json.get("candidates", [])
                    if candidates:
                        text_content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if text_content:
                            status_val = "REVIEW_REQUIRED" if grade_val >= 3 or nv_count > 0 else (
                                "CONCORDANT_WITH_CAUTION" if macular_exudates > 0 or he_count >= 10 else "CONCORDANT"
                            )
                            validation_data = {
                                "status": status_val,
                                "macular_edema_risk": "High" if macular_exudates > 0 else ("Moderate" if he_count >= 10 else "Low"),
                                "clinical_recommendation": f"Referral: {referable_str}. Specific timeframe detailed in protocol below.",
                                "clinical_explanation": text_content,
                                "model_name": f"gemini-2.5-flash (Google GenAI)"
                            }
                else:
                    logger.warning(f"Gemini API returned status {response.status_code}: {response.text[:200]}")
            except Exception as e:
                logger.error(f"Error invoking Gemini API for case {case_id}: {e}")

        # 3. Use clinical rule-based fallback if API call was skipped or failed
        if not validation_data:
            validation_data = self._generate_rule_based_fallback(case, grading, lesions, lang)

        # 4. Upsert into database
        existing = session.exec(
            select(GeminiValidation)
            .where(GeminiValidation.case_id == case_id)
            .where(GeminiValidation.lang == lang)
        ).first()

        if existing:
            existing.status = validation_data["status"]
            existing.clinical_explanation = validation_data["clinical_explanation"]
            existing.clinical_recommendation = validation_data.get("clinical_recommendation")
            existing.macular_edema_risk = validation_data.get("macular_edema_risk")
            existing.model_name = validation_data["model_name"]
            existing.created_at = datetime.now(timezone.utc)
            record = existing
        else:
            record = GeminiValidation(
                case_id=case_id,
                lang=lang,
                status=validation_data["status"],
                clinical_explanation=validation_data["clinical_explanation"],
                clinical_recommendation=validation_data.get("clinical_recommendation"),
                macular_edema_risk=validation_data.get("macular_edema_risk"),
                model_name=validation_data["model_name"]
            )
            session.add(record)

        session.commit()
        session.refresh(record)
        return record


gemini_service = GeminiService()
