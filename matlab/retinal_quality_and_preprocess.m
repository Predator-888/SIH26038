function [enhanced_img, quality_result] = retinal_quality_and_preprocess(image_input)
%% =========================================================================
%% NetraAI (SIH26038): Retinal Quality Assessment & Enhancement
%% MathWorks Toolboxes Used:
%% - Image Processing Toolbox (adapthisteq, imgaussfilt, imtophat)
%% - Computer Vision Toolbox (boundary segmentation, Laplacian metrics)
%% =========================================================================
% Evaluates optical adequacy (focus blur, illumination balance, FOV completeness)
% and applies Ben Graham color normalization + Green-channel CLAHE.
%
% Syntax:
%   [enhanced_img, quality_result] = retinal_quality_and_preprocess('path/to/scan.jpg');
%   [enhanced_img, quality_result] = retinal_quality_and_preprocess(img_array);
% =========================================================================

% 1. Read input image if filepath provided
if ischar(image_input) || isstring(image_input)
    if ~exist(image_input, 'file')
        error('File not found: %s', image_input);
    end
    raw_img = imread(char(image_input));
else
    raw_img = image_input;
end

% Ensure 512x512 resolution for standardized diagnostic input
target_size = [512, 512];
resized_img = imresize(raw_img, target_size);

if size(resized_img, 3) ~= 3
    error('Input fundus image must be 3-channel RGB.');
end

% 2. Quality Metric A: Focus Score (Laplacian Filter Variance)
green_channel = resized_img(:, :, 2);
laplacian_kernel = [0, 1, 0; 1, -4, 1; 0, 1, 0];
lap_response = imfilter(double(green_channel), laplacian_kernel, 'replicate');
lap_var = var(lap_response(:));

% Normalize focus score (variance > 120 is sharp, < 60 is blurry)
focus_score = min(1.0, max(0.0, (lap_var - 40.0) / 160.0));

% 3. Quality Metric B: Illumination Balance Check
gray_img = rgb2gray(resized_img);
total_pixels = numel(gray_img);
underexposed_pct = sum(gray_img(:) < 30) / total_pixels;
overexposed_pct = sum(gray_img(:) > 235) / total_pixels;

illum_penalty = (underexposed_pct * 1.5) + (overexposed_pct * 2.0);
illum_score = max(0.0, 1.0 - illum_penalty);

% 4. Quality Metric C: Circular Field-of-View (FOV) Completeness
% Retinal fundus images are circular discs on dark background
disc_mask = gray_img > 18;
disc_area = sum(disc_mask(:));
expected_circle_area = pi * (target_size(1) * 0.44)^2;
fov_ratio = disc_area / expected_circle_area;
fov_score = min(1.0, max(0.0, fov_ratio));

% 5. Weighted Aggregate Quality Score
quality_score = (0.45 * focus_score) + (0.35 * illum_score) + (0.20 * fov_score);
is_gradable = quality_score >= 0.55 && focus_score >= 0.30 && illum_score >= 0.40;

% Determine specific actionable recapture code if rejected
reject_reasons = {};
if focus_score < 0.30
    reject_reasons{end+1} = 'blur';
end
if underexposed_pct > 0.30
    reject_reasons{end+1} = 'underexposed';
end
if overexposed_pct > 0.15
    reject_reasons{end+1} = 'overexposed';
end
if fov_score < 0.50
    reject_reasons{end+1} = 'incomplete_fov';
end

if isempty(reject_reasons)
    reject_code = 'passed';
    guidance_en = 'Optical quality acceptable. Retinal structures clearly resolved.';
    guidance_hi = 'चित्र की गुणवत्ता स्वीकार्य है।';
else
    reject_code = reject_reasons{1};
    switch reject_code
        case 'blur'
            guidance_en = 'Image is blurry. Hold camera steady and refocus on posterior pole.';
            guidance_hi = 'चित्र धुंधला है। कैमरे को स्थिर रखें और पुनः फोकस करें।';
        case 'underexposed'
            guidance_en = 'Retina is too dark. Increase flash intensity or dilate pupil.';
            guidance_hi = 'चित्र बहुत गहरा है। फ्लैश की रोशनी बढ़ाएं।';
        case 'overexposed'
            guidance_en = 'Excessive corneal flash reflection. Re-angle lens to eliminate glare.';
            guidance_hi = 'चमक बहुत अधिक है। लेंस का कोण बदलें।';
        case 'incomplete_fov'
            guidance_en = 'Retina perimeter cut off. Re-center pupil within alignment ring.';
            guidance_hi = 'पुतली को केंद्र में रखकर पुनः चित्र लें।';
    end
end

% 6. Adaptive Enhancement (Ben Graham Normalization + Green CLAHE)
% Ben Graham: Enhanced = 4 * Image - 4 * GaussianBlur(Image, sigma) + 128
sigma = target_size(1) / 30.0;
blurred = imgaussfilt(double(resized_img), sigma);
ben_graham_double = 4.0 * double(resized_img) - 4.0 * blurred + 128.0;
ben_graham = uint8(max(0.0, min(255.0, ben_graham_double)));

% Apply circular perimeter mask to clean outer canvas
[X, Y] = meshgrid(1:target_size(2), 1:target_size(1));
center = target_size / 2;
radius = target_size(1) * 0.47;
circular_mask = (X - center(2)).^2 + (Y - center(1)).^2 <= radius^2;

for c = 1:3
    channel = ben_graham(:, :, c);
    channel(~circular_mask) = 0;
    ben_graham(:, :, c) = channel;
end

% Apply Green-channel CLAHE (peak hemoglobin absorption in 540-570nm)
enhanced_img = ben_graham;
g_channel = enhanced_img(:, :, 2);
g_clahe = adapthisteq(g_channel, 'ClipLimit', 0.025, 'NumTiles', [8, 8], 'Distribution', 'uniform');
enhanced_img(:, :, 2) = g_clahe;

% Package Result Struct
quality_result = struct();
quality_result.passed = is_gradable;
quality_result.quality_score = round(quality_score, 3);
quality_result.focus_score = round(focus_score, 3);
quality_result.illumination_score = round(illum_score, 3);
quality_result.fov_score = round(fov_score, 3);
quality_result.reject_code = reject_code;
quality_result.guidance_en = guidance_en;
quality_result.guidance_hi = guidance_hi;

end
