"""
NetraAI (SIH26038): Patient SMS Notification & Telephony Service.
Supports simulated/mock SMS delivery (for zero-cost evaluation and offline demos)
as well as live integrations with Fast2SMS (India DLT/Quick SMS) and Twilio.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import requests
from sqlmodel import Session

from backend.app.config import settings
from backend.app.models.reminder import SMSLog, PatientReminder

logger = logging.getLogger(__name__)


# Bilingual SMS Templates (English & Hindi)
SMS_TEMPLATES: Dict[str, Dict[str, str]] = {
    "blood_sugar": {
        "en": (
            "Namaste {name}. Health reminder from NetraAI Tele-Clinic: "
            "Please check your Fasting Blood Glucose this week. Keeping sugar in control protects your eyesight. "
            "Helpline: 104."
        ),
        "hi": (
            "नमस्ते {name}। NetraAI टेली-क्लिनिक से स्वास्थ्य अनुस्मारक: "
            "कृपया इस सप्ताह अपना फास्टिंग ब्लड शुगर टेस्ट कराएं। शुगर नियंत्रण में रखने से आंखों की रोशनी सुरक्षित रहती है। "
            "हेल्पलाइन: 104।"
        )
    },
    "hba1c": {
        "en": (
            "Health Alert: Namaste {name}. Your quarterly HbA1c test is due. "
            "Target HbA1c below 7.0% prevents retinal damage. Please visit your nearest PHC or diagnostic lab."
        ),
        "hi": (
            "स्वास्थ्य अलर्ट: नमस्ते {name}। आपका त्रैमासिक HbA1c टेस्ट नियत है। "
            "HbA1c 7.0% से कम रखने से रेटिना को नुकसान से बचाया जा सकता है। कृपया नजदीकी स्वास्थ्य केंद्र में जांच कराएं।"
        )
    },
    "retinal_screening": {
        "en": (
            "Eye Care Reminder: Namaste {name}. Your scheduled Diabetic Retinopathy screening is due. "
            "Timely retinal evaluation prevents permanent visual impairment. Center: {clinic}."
        ),
        "hi": (
            "नेत्र स्वास्थ्य सूचना: नमस्ते {name}। आपकी निर्धारित डायबिटिक रेटिनोपैथी जांच नियत है। "
            "समय पर रेटिना जांच से अंधापन रोका जा सकता है। केंद्र: {clinic}।"
        )
    },
    "specialist_referral": {
        "en": (
            "URGENT Medical Notice: Namaste {name}. Your recent retinal screening indicated {grade_label}, "
            "requiring specialist vitreoretinal evaluation within {timeframe}. Please visit an eye hospital immediately."
        ),
        "hi": (
            "अति आवश्यक सूचना: नमस्ते {name}। आपकी हालिया रेटिना जांच में {grade_label} पाया गया है। "
            "{timeframe} के भीतर विशेषज्ञ को दिखाना अनिवार्य है। कृपया तुरंत नेत्र अस्पताल जाएं।"
        )
    },
    "custom": {
        "en": "NetraAI Tele-Health Update: Namaste {name}. {custom_text}",
        "hi": "NetraAI टेली-हेल्थ सूचना: नमस्ते {name}। {custom_text}"
    }
}


class SMSService:
    def __init__(self):
        self.provider = (settings.SMS_PROVIDER or "mock").lower()
        self.fast2sms_key = settings.FAST2SMS_API_KEY
        self.twilio_sid = settings.TWILIO_ACCOUNT_SID
        self.twilio_token = settings.TWILIO_AUTH_TOKEN
        self.twilio_from = settings.TWILIO_PHONE_NUMBER
        self.default_lang = settings.DEFAULT_REMINDER_LANGUAGE or "en"

    def format_message(
        self,
        reminder_type: str,
        patient_name: str,
        lang: str = "en",
        extra_params: Optional[Dict[str, Any]] = None
    ) -> str:
        """Constructs a personalized bilingual SMS text from templates."""
        lang_code = lang if lang in ["en", "hi"] else self.default_lang
        tpl_dict = SMS_TEMPLATES.get(reminder_type, SMS_TEMPLATES["blood_sugar"])
        template = tpl_dict.get(lang_code, tpl_dict.get("en", ""))

        params = {
            "name": patient_name or ("Patient" if lang_code == "en" else "मरीज"),
            "clinic": "District PHC / Vision Center",
            "timeframe": "2 to 4 weeks",
            "grade_label": "Diabetic Retinopathy",
            "custom_text": ""
        }
        if extra_params:
            params.update(extra_params)

        try:
            return template.format(**params)
        except Exception as err:
            logger.warning(f"Error formatting SMS template: {err}")
            return template

    def send_sms(
        self,
        phone_number: str,
        message_text: str,
        reminder_type: str = "general",
        reminder_id: Optional[int] = None,
        case_id: Optional[str] = None,
        session: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Dispatches SMS via the configured provider (mock, fast2sms, twilio)
        and persists the transaction to the SMSLog audit table.
        """
        clean_phone = "".join(c for c in phone_number if c.isdigit() or c == "+")
        provider_used = self.provider
        status = "delivered"
        provider_resp = "Simulated delivery successful (Mock Gateway)"

        # 1. Dispatch through chosen provider
        if self.provider == "fast2sms" and self.fast2sms_key:
            try:
                # Fast2SMS Quick SMS API for Indian numbers
                url = "https://www.fast2sms.com/dev/bulkV2"
                headers = {
                    "authorization": self.fast2sms_key,
                    "Content-Type": "application/json"
                }
                # Normalize phone to 10 digits
                dest_phone = clean_phone.replace("+91", "").strip()
                payload = {
                    "route": "q",
                    "message": message_text,
                    "language": "unicode",
                    "numbers": dest_phone
                }
                res = requests.post(url, json=payload, headers=headers, timeout=8)
                if res.status_code == 200 and res.json().get("return"):
                    status = "delivered"
                    provider_resp = res.text[:250]
                else:
                    status = "failed"
                    provider_resp = f"HTTP {res.status_code}: {res.text[:250]}"
            except Exception as e:
                logger.error(f"Fast2SMS error: {e}")
                status = "failed"
                provider_resp = f"Fast2SMS error: {str(e)}"

        elif self.provider == "twilio" and self.twilio_sid and self.twilio_token:
            try:
                url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_sid}/Messages.json"
                auth = (self.twilio_sid, self.twilio_token)
                data = {
                    "To": clean_phone,
                    "From": self.twilio_from,
                    "Body": message_text
                }
                res = requests.post(url, data=data, auth=auth, timeout=8)
                if res.status_code in [200, 201]:
                    status = "delivered"
                    provider_resp = res.text[:250]
                else:
                    status = "failed"
                    provider_resp = f"HTTP {res.status_code}: {res.text[:250]}"
            except Exception as e:
                logger.error(f"Twilio error: {e}")
                status = "failed"
                provider_resp = f"Twilio error: {str(e)}"

        else:
            # Default Mock Simulation
            provider_used = "mock"
            status = "delivered"
            logger.info(f"[MOCK SMS] To: {clean_phone} | Type: {reminder_type} | Content: {message_text}")

        # 2. Persist to SMSLog if database session provided
        log_id = None
        if session:
            sms_log = SMSLog(
                reminder_id=reminder_id,
                case_id=case_id,
                recipient_phone=clean_phone,
                message_text=message_text,
                reminder_type=reminder_type,
                provider=provider_used,
                status=status,
                provider_response=provider_resp,
                sent_at=datetime.now(timezone.utc)
            )
            session.add(sms_log)

            # Update reminder status if attached
            if reminder_id:
                reminder = session.get(PatientReminder, reminder_id)
                if reminder:
                    reminder.last_sent_at = datetime.now(timezone.utc)
                    reminder.status = "sent"
                    session.add(reminder)

            session.commit()
            session.refresh(sms_log)
            log_id = sms_log.id

        return {
            "success": status in ["delivered", "sent"],
            "log_id": log_id,
            "status": status,
            "provider": provider_used,
            "recipient_phone": clean_phone,
            "message_text": message_text,
            "provider_response": provider_resp,
            "sent_at": datetime.now(timezone.utc).isoformat()
        }


sms_service = SMSService()
