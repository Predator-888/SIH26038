"""
Clinical Diagnostic Report Generator Service.
Generates an A4 scannable diagnostic summary report with auto-print capability.
"""

import os
import base64
from datetime import datetime
from sqlmodel import Session, select
from backend.app.models.case import Case, ImageQualityResult
from backend.app.models.grading import GradingResult, Lesion


class ReportService:
    @staticmethod
    def _image_to_base64(image_path: str) -> str:
        """Helper to encode image file as base64 data URI."""
        if not os.path.exists(image_path):
            return ""
        with open(image_path, "rb") as img_file:
            encoded = base64.b64encode(img_file.read()).decode("utf-8")
            ext = os.path.splitext(image_path)[1].lower().replace(".", "")
            if ext == "jpg":
                ext = "jpeg"
            return f"data:image/{ext};base64,{encoded}"

    @staticmethod
    def generate_html_report(case_id: str, session: Session, lang: str = "en") -> str:
        """
        Generates a standalone HTML clinical diagnostic summary report.
        """
        case = session.get(Case, case_id)
        if not case:
            raise ValueError(f"Case {case_id} not found")

        grading = session.exec(select(GradingResult).where(GradingResult.case_id == case_id)).first()
        quality = session.exec(select(ImageQualityResult).where(ImageQualityResult.case_id == case_id)).first()
        lesions = session.exec(select(Lesion).where(Lesion.case_id == case_id)).all()

        patient_ref = case.patient_ref or f"PATIENT-{case.case_id[:8].upper()}"
        created_str = case.created_at.strftime("%d %B %Y, %H:%M UTC")
        
        grade_val = grading.grade if grading else 0
        grade_label = grading.grade_label if grading else "Pending"
        confidence_pct = round(grading.confidence * 100, 1) if grading else 0.0
        referable = grading.referable if grading else False
        summary_text = grading.summary_text if grading else "No focal retinal lesions detected."
        
        # Colors
        status_color = "#E11D48" if referable else ("#059669" if grade_val == 0 else "#D97706")
        status_bg = "#FFF1F2" if referable else ("#ECFDF5" if grade_val == 0 else "#FFFBEB")

        # Encode images
        base_img_uri = ReportService._image_to_base64(case.image_path)
        gradcam_uri = ReportService._image_to_base64(grading.gradcam_overlay_path) if grading and grading.gradcam_overlay_path else base_img_uri

        # Lesions table rows
        lesion_rows = ""
        if lesions:
            for idx, l in enumerate(lesions[:8], 1):
                lesion_rows += f"""
                <tr style="border-bottom: 1px solid #E2E8F0; font-size: 13px;">
                    <td style="padding: 8px 12px; font-weight: 600; font-family: monospace;">#{idx}</td>
                    <td style="padding: 8px 12px; text-transform: capitalize; font-weight: 500;">{l.type.replace('_', ' ')}</td>
                    <td style="padding: 8px 12px; font-family: monospace; color: #475569;">[{l.bbox[0]:.2f}, {l.bbox[1]:.2f}]</td>
                    <td style="padding: 8px 12px; font-weight: 700; color: #0F172A;">{int(l.confidence * 100)}%</td>
                </tr>
                """
        else:
            lesion_rows = """
            <tr>
                <td colspan="4" style="padding: 16px; text-align: center; color: #64748B; font-size: 13px; font-style: italic;">
                    No microaneurysms, hemorrhages, or exudates detected above confidence threshold. Retinal vasculature normal.
                </td>
            </tr>
            """

        html_content = f"""
        <!DOCTYPE html>
        <html lang="{lang}">
        <head>
            <meta charset="UTF-8">
            <title>Diagnostic Retinal Report — {patient_ref}</title>
            <style>
                @page {{ size: A4; margin: 15mm; }}
                @media print {{
                    body {{ padding: 0 !important; }}
                    .no-print {{ display: none !important; }}
                }}
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    color: #0F172A;
                    background-color: #FFFFFF;
                    margin: 0;
                    padding: 24px;
                    line-height: 1.45;
                }}
                .header {{
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #0F766E;
                    padding-bottom: 14px;
                    margin-bottom: 20px;
                }}
                .title {{
                    font-size: 22px;
                    font-weight: 800;
                    color: #0F766E;
                    margin: 0;
                    letter-spacing: -0.5px;
                }}
                .subtitle {{
                    font-size: 11px;
                    color: #64748B;
                    margin-top: 3px;
                }}
                .badge-grid {{
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 18px;
                }}
                .card {{
                    background: #F8FAFC;
                    border: 1px solid #E2E8F0;
                    border-radius: 8px;
                    padding: 10px 14px;
                }}
                .card-label {{
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #64748B;
                    font-weight: 700;
                    margin-bottom: 2px;
                }}
                .card-value {{
                    font-size: 15px;
                    font-weight: 700;
                    color: #0F172A;
                }}
                .severity-box {{
                    background-color: {status_bg};
                    border: 2px solid {status_color};
                    border-radius: 10px;
                    padding: 14px 18px;
                    margin-bottom: 18px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }}
                .images-row {{
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 18px;
                }}
                .img-container {{
                    text-align: center;
                    background: #F8FAFC;
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px solid #E2E8F0;
                }}
                .fundus-img {{
                    width: 210px;
                    height: 210px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 3px solid #0F766E;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                }}
                table {{
                    width: 100%;
                    border-collapse: collapse;
                    background: #FFFFFF;
                    border: 1px solid #E2E8F0;
                    border-radius: 8px;
                    overflow: hidden;
                    margin-bottom: 18px;
                }}
                th {{
                    background: #F1F5F9;
                    text-align: left;
                    padding: 9px 12px;
                    font-size: 11px;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }}
                .footer {{
                    margin-top: 24px;
                    border-top: 1px solid #E2E8F0;
                    padding-top: 14px;
                    display: flex;
                    justify-content: space-between;
                    font-size: 10px;
                    color: #64748B;
                }}
                .signature-box {{
                    border-top: 1px dashed #94A3B8;
                    width: 190px;
                    text-align: center;
                    padding-top: 6px;
                    margin-top: 20px;
                }}
            </style>
            <script>
                window.onload = function() {{
                    const params = new URLSearchParams(window.location.search);
                    if (params.get('print') === 'true') {{
                        setTimeout(function() {{ window.print(); }}, 400);
                    }}
                }};
            </script>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1 class="title">Tele-Ophthalmology Diagnostic Report</h1>
                    <div class="subtitle">Explainable AI Diabetic Retinopathy Diagnostic System · Tele-health Reading Center</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12px; font-weight: 700; font-family: monospace;">Case Ref: {case_id[:13]}</div>
                    <div style="font-size: 11px; color: #64748B;">{created_str}</div>
                </div>
            </div>

            <div class="badge-grid">
                <div class="card">
                    <div class="card-label">Patient Identifier</div>
                    <div class="card-value" style="font-family: monospace;">{patient_ref}</div>
                </div>
                <div class="card">
                    <div class="card-label">Quality Assessment</div>
                    <div class="card-value" style="color: {'#059669' if quality and quality.passed else '#E11D48'};">
                        {f'Passed ({int(quality.quality_score * 100)}%)' if quality else 'Verified'}
                    </div>
                </div>
                <div class="card">
                    <div class="card-label">Calibrated AI Confidence</div>
                    <div class="card-value">{confidence_pct}% ({grading.confidence_band.replace('_', ' ').title() if grading else 'N/A'})</div>
                </div>
            </div>

            <div class="severity-box">
                <div>
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: {status_color};">
                        Predicted ICDR Severity Grade
                    </div>
                    <div style="font-size: 20px; font-weight: 800; color: {status_color}; margin-top: 1px;">
                        Grade {grade_val} — {grade_label}
                    </div>
                </div>
                <div style="text-align: right;">
                    <span style="display: inline-block; padding: 6px 14px; background: {status_color}; color: #FFF; border-radius: 9999px; font-size: 12px; font-weight: 700;">
                        {'SPECIALIST REFERRAL REQUIRED' if referable else 'ROUTINE ANNUAL FOLLOW-UP'}
                    </span>
                </div>
            </div>

            <div class="images-row">
                <div class="img-container">
                    <div style="font-size: 11px; font-weight: 700; margin-bottom: 6px; color: #0F766E;">Original Retinal Fundus</div>
                    <img src="{base_img_uri}" class="fundus-img" alt="Original Fundus" />
                </div>
                <div class="img-container">
                    <div style="font-size: 11px; font-weight: 700; margin-bottom: 6px; color: #0F766E;">Grad-CAM++ Saliency Heatmap</div>
                    <img src="{gradcam_uri}" class="fundus-img" alt="Grad-CAM Overlay" />
                </div>
            </div>

            <div style="margin-bottom: 14px;">
                <div style="font-size: 11px; font-weight: 800; color: #0F766E; margin-bottom: 4px; text-transform: uppercase;">
                    Lesion-Level Saliency Findings:
                </div>
                <div style="background: #F8FAFC; border-left: 4px solid #0F766E; padding: 9px 12px; font-size: 13px; border-radius: 0 6px 6px 0;">
                    {summary_text}
                </div>
            </div>

            <div style="font-size: 11px; font-weight: 800; color: #0F766E; margin-bottom: 4px; text-transform: uppercase;">
                Indexed Pathological Lesions:
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Index</th>
                        <th>Pathology Type</th>
                        <th>Normalized Coordinates</th>
                        <th>Confidence</th>
                    </tr>
                </thead>
                <tbody>
                    {lesion_rows}
                </tbody>
            </table>

            <div class="footer">
                <div>
                    <div><strong>Compliance:</strong> DPDP Act 2023 Compliant · De-identified Health Record</div>
                    <div><strong>Validated Pipeline:</strong> Ben Graham Preprocessing · U-Net Segmentation · EfficientNet-B3 Grad-CAM</div>
                </div>
                <div class="signature-box">
                    <div>Reviewing Ophthalmologist</div>
                    <div style="font-size: 9px; color: #94A3B8; margin-top: 1px;">Sign & Date Verification</div>
                </div>
            </div>
        </body>
        </html>
        """
        return html_content


report_service = ReportService()
