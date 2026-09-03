function segmentation_output = retinal_structure_segmentation(enhanced_img)
%% =========================================================================
%% NetraAI (SIH26038): Retinal Structure & Lesion Segmentation Module
%% MathWorks Toolboxes Used:
%% - Medical Imaging Toolbox (Morphological filtering, region properties)
%% - Image Processing Toolbox (imtophat, imopen, strel, bwconncomp, regionprops)
%% =========================================================================
% Extracts clinically mandated retinal structures:
% 1. Optic Disc (OD) & Foveal localization
% 2. Retinal blood vessel tree extraction (DRIVE benchmark)
% 3. Pathological lesion detection: Microaneurysms, Exudates, Hemorrhages, Neovascularization
% 4. Quadrant assignment (Superior Temporal, Superior Nasal, Inferior Temporal, Inferior Nasal)
% =========================================================================

[H, W, ~] = size(enhanced_img);
r_channel = double(enhanced_img(:, :, 1));
g_channel = double(enhanced_img(:, :, 2));
b_channel = double(enhanced_img(:, :, 3));

%% 1. Retinal Vasculature Segmentation (Top-Hat Transform)
% Blood vessels appear dark in green channel; invert to make vessels bright
inverted_green = 255.0 - g_channel;

% Morphological top-hat filter using disc structuring element
se_vessel = strel('disk', 8);
vessel_tophat = imtophat(uint8(inverted_green), se_vessel);

% Adaptive thresholding to segment fine vessel arcade
vessel_mask = vessel_tophat > 18;
vessel_mask = bwareaopen(vessel_mask, 15); % Remove small speckles

%% 2. Optic Disc (OD) Localization
% Optic Disc is bright circular anatomical structure in red channel
se_od = strel('disk', 25);
od_opened = imopen(uint8(r_channel), se_od);
od_blurred = imgaussfilt(double(od_opened), 10);

[~, max_idx] = max(od_blurred(:));
[od_y, od_x] = ind2sub([H, W], max_idx);
od_radius = round(H * 0.08); % Approximate OD radius (~40px in 512x512)

% Create OD Exclusion Mask to eliminate false exudates
[X, Y] = meshgrid(1:W, 1:H);
od_mask = ((X - od_x).^2 + (Y - od_y).^2) <= (od_radius * 1.35)^2;

%% 3. Fovea Localization
% Fovea lies approximately 2.5 disc diameters temporal to Optic Disc
if od_x < (W / 2)
    % Right eye fundus: OD on nasal (left), Fovea on temporal (right)
    fovea_x = min(W - 20, od_x + round(od_radius * 3.2));
else
    % Left eye fundus: OD on nasal (right), Fovea on temporal (left)
    fovea_x = max(20, od_x - round(od_radius * 3.2));
end
fovea_y = od_y;

%% 4. Lesion Segmentation
% Exudates: Bright yellowish lipid deposits (high in R and G, outside OD)
brightness = (r_channel + g_channel + b_channel) / 3.0;
exudate_candidates = (brightness > 180) & (r_channel > 170) & (g_channel > 165);
exudate_candidates(od_mask) = false;
exudate_mask = bwareaopen(exudate_candidates, 8);

% Hemorrhages and Microaneurysms: Dark focal spots isolated from vessels
dark_candidates = (brightness < 65) & (g_channel < 65) & (r_channel < 75);
vessel_dilated = imdilate(vessel_mask, strel('disk', 3));
dark_candidates(vessel_dilated) = false;
dark_candidates(od_mask) = false;

% Separate Microaneurysms (MAs) by area (4 to 45 px) vs Hemorrhages (> 45 px)
cc_dark = bwconncomp(dark_candidates);
stats_dark = regionprops(cc_dark, 'Area', 'BoundingBox', 'Centroid');

ma_count = 0;
hem_count = 0;
exudate_count = sum(exudate_mask(:) > 0);

lesion_list = {};

for i = 1:numel(stats_dark)
    a = stats_dark(i).Area;
    bb = stats_dark(i).BoundingBox;
    cx = stats_dark(i).Centroid(1);
    cy = stats_dark(i).Centroid(2);
    
    % Determine quadrant
    quad = get_quadrant(cx, cy, W, H);
    
    if a >= 4 && a <= 45
        ma_count = ma_count + 1;
        lesion_list{end+1} = struct('type', 'microaneurysm', 'bbox', bb, 'area', a, 'quadrant', quad);
    elseif a > 45 && a <= 2500
        hem_count = hem_count + 1;
        lesion_list{end+1} = struct('type', 'hemorrhage', 'bbox', bb, 'area', a, 'quadrant', quad);
    end
end

%% 5. Neovascularization (NV) Detection
% Proliferative new fine tangled vessels in peripapillary region (NVD)
peripapillary_roi = (((X - od_x).^2 + (Y - od_y).^2) <= (od_radius * 2.2)^2) & ~od_mask;
fine_vessels = imtophat(uint8(inverted_green), strel('disk', 4)) > 20;
nv_candidates = fine_vessels & peripapillary_roi & ~imdilate(vessel_mask, strel('disk', 4));
cc_nv = bwconncomp(nv_candidates);
stats_nv = regionprops(cc_nv, 'Area', 'Perimeter', 'BoundingBox');

neovasc_count = 0;
for i = 1:numel(stats_nv)
    a = stats_nv(i).Area;
    p = stats_nv(i).Perimeter;
    if a >= 35 && a <= 1200 && p > 0
        circ = (4 * pi * a) / (p^2);
        if circ < 0.35 % High tortuosity / tangled branching
            neovasc_count = neovasc_count + 1;
            lesion_list{end+1} = struct('type', 'neovascularization', 'bbox', stats_nv(i).BoundingBox, 'area', a, 'quadrant', 'peripapillary');
        end
    end
end

%% 6. Compile Structured Segmentation Output
segmentation_output = struct();
segmentation_output.optic_disc = struct('x', od_x, 'y', od_y, 'radius', od_radius);
segmentation_output.fovea = struct('x', fovea_x, 'y', fovea_y);
segmentation_output.vessel_mask = vessel_mask;
segmentation_output.vessel_density_pct = round((sum(vessel_mask(:)) / numel(vessel_mask)) * 100, 2);
segmentation_output.microaneurysm_count = ma_count;
segmentation_output.hemorrhage_count = hem_count;
segmentation_output.exudate_detected = (exudate_count > 20);
segmentation_output.neovascularization_count = neovasc_count;
segmentation_output.total_lesions = numel(lesion_list);
segmentation_output.lesion_list = lesion_list;

end

function quad = get_quadrant(cx, cy, W, H)
    is_sup = cy < (H / 2);
    is_temp = cx < (W / 2);
    if is_sup && is_temp
        quad = 'Superior Temporal';
    elseif is_sup && ~is_temp
        quad = 'Superior Nasal';
    elseif ~is_sup && is_temp
        quad = 'Inferior Temporal';
    else
        quad = 'Inferior Nasal';
    end
end
