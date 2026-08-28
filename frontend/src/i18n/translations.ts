export type Language = 'en' | 'hi';

export const translations = {
  en: {
    appTitle: "NetraAI Enterprise",
    appSubtitle: "Clinical Tele-Ophthalmology Diagnostic PACS",
    sponsorBadge: "PACS Enterprise v2.4",
    
    // Roles
    chooseRole: "Select Operational Workstation",
    fieldWorker: "Point-of-Care Acquisition",
    fieldWorkerDesc: "Clinical patient intake and retinal fundus capture with synchronous optical quality gating.",
    reviewer: "Clinician Diagnostic PACS",
    reviewerDesc: "Triaged diagnostic reading queue with lesion-level visual Grad-CAM evidence.",
    admin: "District Capacity Analytics",
    adminDesc: "Telemedicine network capacity planning, bottleneck detection & queue simulations.",
    
    // Quality & Upload
    captureTitle: "Fundus Optical Acquisition",
    captureSubtitle: "Record patient parameters and acquire 45° posterior pole retinal scan for automated validation.",
    dropzoneText: "Drag & drop fundus scan or tap to browse",
    dropzoneSubtext: "Supports standard DICOM, JPEG, PNG up to 15MB. Preprocessing and quality scoring will execute synchronously.",
    patientRefLabel: "Patient Identifier / Medical Record Number (MRN)",
    patientRefPlaceholder: "e.g., MRN-2026-84920",
    checkQualityBtn: "Verify Quality & Register Study",
    checkingQuality: "Evaluating focus & illumination...",
    
    // Quality feedback
    qualityPassed: "Image Quality Verified",
    qualityPassedDesc: "Sharp retinal clarity, balanced illumination, and complete 45° field of view confirmed.",
    qualityRejected: "Recapture Recommended",
    qualityRejectedDesc: "Image does not meet clinical sharpness thresholds. Please retake following guidance below:",
    proceedToAnalysis: "Proceed to AI Diagnostic Pipeline",
    retakeBtn: "Retake Photo",
    
    // Quality reject reasons
    blur: "Image is blurry. Hold the camera steady and refocus.",
    underexposed: "Image is too dark. Increase illumination or capture in better ambient lighting.",
    overexposed: "Image is too bright with glare. Reduce flash intensity and eliminate reflections.",
    incomplete_fov: "Retina is off-center. Re-align pupil within the circular target frame.",
    
    // Analysis
    analyzingTitle: "Analyzing Retinal Structures",
    analyzingVessels: "Segmenting vascular tree & locating optic disc...",
    analyzingGrading: "Computing 5-class ICDR severity grade & calibrating confidence...",
    analyzingExplainability: "Generating Grad-CAM++ heatmaps & extracting quadrant lesion markers...",
    
    // Results & Workstation
    screeningResult: "Diagnostic Screening Result",
    severityGrade: "ICDR Severity Grade",
    referableAlert: "SPECIALIST REFERRAL REQUIRED (ICDR Grade 2+)",
    normalAlert: "ROUTINE ANNUAL TELE-SCREENING FOLLOW-UP",
    confidence: "Calibrated Confidence",
    evidenceTitle: "Retinal Evidence Lightbox",
    showGradcam: "Show Grad-CAM Heatmap",
    heatmapIntensity: "Overlay Opacity",
    lesionsDetected: "Detected Retinal Lesions",
    clinicalSummary: "Clinical Evidence Narrative",
    viewReportBtn: "Diagnostic Report",
    downloadPdf: "Download Report",
    
    // Queue & Review
    worklistTitle: "Ophthalmologist Reading Worklist",
    urgentReview: "Priority Review (Uncertain AI)",
    referableHighConf: "Referable DR (High Confidence)",
    normalHighConf: "Normal / Non-Referable (High Confidence)",
    confirmGradeBtn: "Confirm AI Grade",
    overrideGradeBtn: "Override Diagnosis",
    notesPlaceholder: "Enter clinical remarks, referral notes, or treatment advice...",
    submitReviewBtn: "Sign & Complete Case",
    
    // Simulation
    simTitle: "District Telemedicine Resource Management",
    simSubtitle: "Discrete-event queue modeling engine for district-scale tele-screening throughput.",
    camerasLabel: "Deployed Field Cameras",
    reviewersLabel: "Reviewing Ophthalmologists",
    bandwidthLabel: "Clinic Uplink Bandwidth (Mbps)",
    intakeLabel: "Daily Scans per Camera",
    reviewTimeLabel: "Avg Review Time (Seconds)",
    annualCapacity: "Projected Annual Capacity",
    annualDemand: "Projected Annual Demand",
    systemBottleneck: "Current System Bottleneck",
    recommendationTitle: "AI Operational Recommendation",
    runSimBtn: "Recalculate District Dynamics"
  },
  hi: {
    appTitle: "नेत्रAI (NetraAI)",
    appSubtitle: "क्लिनिकल टेली-ऑप्थल्मोलॉजी डायग्नोस्टिक पीएसीएस",
    sponsorBadge: "पीएसीएस एंटरप्राइज v2.4",
    
    // Roles
    chooseRole: "अपना कार्यक्षेत्र चुनें",
    fieldWorker: "पॉइंट-ऑफ-केयर अधिग्रहण",
    fieldWorkerDesc: "मरीज विवरण और ऑप्टिकल गुणवत्ता जांच के साथ रेटिना फोटो कैप्चर करें।",
    reviewer: "चिकित्सक वर्कस्टेशन",
    reviewerDesc: "Grad-CAM और घाव विवरण के साथ मामलों की त्वरित समीक्षा करें।",
    admin: "जिला क्षमता एनालिटिक्स",
    adminDesc: "टेलीमेडिसिन नेटवर्क क्षमता नियोजन, बाधा पहचान और प्रवाह विश्लेषण।",
    
    // Quality & Upload
    captureTitle: "रेटिना छवि अधिग्रहण",
    captureSubtitle: "मरीज का विवरण दर्ज करें और स्वचालित गुणवत्ता जांच के लिए फंडस फोटो अपलोड करें।",
    dropzoneText: "फंडस स्कैन खींचें या अपलोड करने के लिए टैप करें",
    dropzoneSubtext: "मानक DICOM, JPEG, PNG समर्थित (अधिकतम 15MB)।",
    patientRefLabel: "रोगी पहचान संख्या (MRN)",
    patientRefPlaceholder: "उदा. MRN-2026-84920",
    checkQualityBtn: "गुणवत्ता सत्यापित करें और पंजीकृत करें",
    checkingQuality: "स्पष्टता और प्रकाश की जांच की जा रही है...",
    
    // Quality feedback
    qualityPassed: "छवि गुणवत्ता स्वीकृत",
    qualityPassedDesc: "स्पष्ट रेटिना दृश्य, संतुलित प्रकाश और 45° पूर्ण दृश्य क्षेत्र की पुष्टि की गई।",
    qualityRejected: "पुनः फोटो खींचने की आवश्यकता",
    qualityRejectedDesc: "छवि चिकित्सीय मानकों के अनुरूप नहीं है। कृपया नीचे दिए गए सुझावों का पालन करें:",
    proceedToAnalysis: "एआई रोग निदान आगे बढ़ाएं",
    retakeBtn: "पुनः फोटो लें",
    
    // Quality reject reasons
    blur: "छवि धुंधली है। कैमरा स्थिर रखें और पुनः फोकस करें।",
    underexposed: "छवि बहुत अंधेरी है। प्रकाश बढ़ाएं।",
    overexposed: "छवि बहुत अधिक चमकदार है। चमक कम करें।",
    incomplete_fov: "रेटिना केंद्र में नहीं है। पुतली को पुनः संरेखित करें।",
    
    // Analysis
    analyzingTitle: "रेटिना संरचनाओं का विश्लेषण",
    analyzingVessels: "रक्त वाहिकाओं और ऑप्टिक डिस्क की पहचान...",
    analyzingGrading: "5-स्तरीय रोग गंभीरता और विश्वसनीयता की गणना...",
    analyzingExplainability: "Grad-CAM हीटमैप और घाव के चिन्ह तैयार किए जा रहे हैं...",
    
    // Results & Workstation
    screeningResult: "निदान परिणाम",
    severityGrade: "आईडीसीआर गंभीरता स्तर",
    referableAlert: "विशेषज्ञ रेफरल आवश्यक (ICDR ग्रेड 2+)",
    normalAlert: "वार्षिक नियमित टेली-स्क्रीनिंग फॉलो-अप",
    confidence: "प्रमाणित विश्वसनीयता",
    evidenceTitle: "रेटिना प्रमाण लाइटबॉक्स",
    showGradcam: "Grad-CAM हीटमैप दिखाएं",
    heatmapIntensity: "हीटमैप पारदर्शिता",
    lesionsDetected: "पहचाने गए रेटिना घाव",
    clinicalSummary: "चिकित्सीय विवरण सारांश",
    viewReportBtn: "डायग्नोस्टिक रिपोर्ट",
    downloadPdf: "रिपोर्ट डाउनलोड करें",
    
    // Queue & Review
    worklistTitle: "विशेषज्ञ कार्य सूची",
    urgentReview: "प्राथमिकता समीक्षा (अनिश्चित एआई)",
    referableHighConf: "रेफरल योग्य (उच्च विश्वसनीयता)",
    normalHighConf: "सामान्य / बिना रोग (उच्च विश्वसनीयता)",
    confirmGradeBtn: "एआई निदान की पुष्टि करें",
    overrideGradeBtn: "निदान संशोधित करें",
    notesPlaceholder: "चिकित्सीय टिप्पणी या उपचार निर्देश दर्ज करें...",
    submitReviewBtn: "सत्यापित करें और पूर्ण करें",
    
    // Simulation
    simTitle: "जिला स्तरीय टेलीमेडिसिन संसाधन प्रबंधन",
    simSubtitle: "जिला स्तरीय टेली-जांच प्रवाह के लिए संसाधन मॉडल।",
    camerasLabel: "तैनात फील्ड कैमरे",
    reviewersLabel: "समीक्षक नेत्र रोग विशेषज्ञ",
    bandwidthLabel: "क्लिनिक इंटरनेट गति (Mbps)",
    intakeLabel: "प्रति कैमरा दैनिक जांच",
    reviewTimeLabel: "औसत समीक्षा समय (सेकंड)",
    annualCapacity: "वार्षिक जांच क्षमता",
    annualDemand: "अनुमानित वार्षिक मांग",
    systemBottleneck: "मुख्य बाधा घटक",
    recommendationTitle: "एआई परिचालन अनुशंसा",
    runSimBtn: "सिमुलेशन पुनः चलाएं"
  }
};
