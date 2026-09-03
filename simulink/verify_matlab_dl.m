%% =========================================================================
%% NetraAI (SIH26038): MATLAB Deep Learning Toolbox Verification
%% Sponsor: MathWorks · Theme: MedTech / BioTech / HealthTech
%% =========================================================================
% Verifies that the exported ONNX model loads cleanly into MATLAB's
% Deep Learning Toolbox via importNetworkFromONNX or importONNXNetwork.
% =========================================================================

clear; clc;

onnx_file = fullfile(fileparts(mfilename('fullpath')), '..', 'ml', 'checkpoints', 'idrid_grading_model.onnx');

fprintf('------------------------------------------------------------\n');
fprintf('NetraAI: MATLAB Deep Learning Toolbox Verification\n');
fprintf('Target ONNX Model: %s\n', onnx_file);
fprintf('------------------------------------------------------------\n');

if ~exist(onnx_file, 'file')
    fprintf('Note: ONNX file not generated yet. Generating on-demand or check ml/checkpoints/.\n');
    fprintf('To export from PyTorch:\n');
    fprintf('  python ../ml/grading/export_onnx.py\n');
    return;
end

has_importer = exist('importNetworkFromONNX', 'file') == 2 || exist('importONNXNetwork', 'file') == 2;
if ~has_importer
    fprintf('Warning: Deep Learning Toolbox ONNX importer not found in this MATLAB installation.\n');
    fprintf('Install via: Add-Ons -> Deep Learning Toolbox Converter for ONNX Model Format\n');
    return;
end

fprintf('Loading ONNX model into Deep Learning Toolbox...\n');
try
    if exist('importNetworkFromONNX', 'file') == 2
        net = importNetworkFromONNX(onnx_file);
    else
        net = importONNXNetwork(onnx_file);
    end
    fprintf('SUCCESS: Model successfully loaded into MATLAB Deep Learning Toolbox!\n');
    
    % Test forward pass with dummy 512x512x3 single tensor
    dummy_input = single(rand(512, 512, 3));
    logits = predict(net, dummy_input);
    fprintf('Forward Pass Output Logits (5 Classes):\n');
    disp(logits);
    
    [~, top_class] = max(logits);
    fprintf('Predicted Class Index: %d (Grade %d)\n', top_class, top_class - 1);
catch ME
    fprintf('Import error: %s\n', ME.message);
end
