import os, sys
sys.path.insert(0, os.path.abspath("."))
from ml.data.preprocess import preprocess_fundus_pipeline
from ml.segmentation.unet_vessels import vessel_segmentor
from ml.segmentation.unet_lesions import lesion_segmentor
from ml.grading.grading_model import dr_grader

scans = [
    ('normal_l0.jpg', 0),
    ('mild_l1.jpg', 1),
    ('moderate_l2.jpg', 2),
    ('severe_l3.jpg', 3),
    ('proliferative_l4.jpg', 4)
]
ref_dir = 'frontend/public/reference_scans'

for filename, expected_grade in scans:
    p = os.path.join(ref_dir, filename)
    proc, _ = preprocess_fundus_pipeline(p)
    dl_probs = dr_grader.get_dl_probabilities(proc)
    vessel = vessel_segmentor.segment_vessels(proc)
    od = vessel_segmentor.locate_optic_disc(proc)
    lesions = lesion_segmentor.extract_all_lesions(proc, vessel, od, dl_probs=dl_probs)
    pred = dr_grader.predict(proc, detected_lesions=lesions, dl_probs=dl_probs)
    
    types = [l['type'] for l in lesions]
    type_counts = {t: types.count(t) for t in set(types)}
    
    status = "SUCCESS" if pred['grade'] == expected_grade else "MISMATCH"
    print(f"[{status}] {filename:18s} | Expected: {expected_grade} | Result: Grade {pred['grade']} ({pred['grade_label']}) | Conf: {pred['confidence']*100:.1f}%")
    print(f"       Lesions: {type_counts}")
