%% =========================================================================
%% SIH26038: Automated Simulink Model (.slx) Builder
%% Sponsor: MathWorks · Theme: MedTech / BioTech / HealthTech
%% =========================================================================
% This script programmatically builds, configures, and saves the 
% 'screening_workflow.slx' Simulink model for district-scale telemedicine 
% screening simulation (100,000+ patients/year).
%
% Toolboxes Required:
% - Simulink
% - Statistics and Machine Learning Toolbox
% =========================================================================

clear; clc;

modelName = 'screening_workflow';
fprintf('Building Simulink Model: %s.slx...\n', modelName);

% 1. Close existing model if open in memory
if bdIsLoaded(modelName)
    close_system(modelName, 0);
end

% 2. Check if screening_workflow.mdl exists and convert/save as .slx
mdlPath = fullfile(pwd, [modelName '.mdl']);
slxPath = fullfile(pwd, [modelName '.slx']);

if exist(mdlPath, 'file')
    fprintf('Loading model specification from %s...\n', mdlPath);
    load_system(mdlPath);
    set_param(modelName, 'StopTime', '365');
    set_param(modelName, 'Solver', 'FixedStepDiscrete');
    set_param(modelName, 'FixedStep', '1.0');
    
    save_system(modelName, slxPath);
    fprintf('Successfully generated: %s\n', slxPath);
    close_system(modelName);
    return;
end

% 3. Fallback: Build programmatically from scratch if MDL not present
new_system(modelName);
open_system(modelName);

% Configure Solver
set_param(modelName, 'Solver', 'FixedStepDiscrete', 'FixedStep', '1', 'StopTime', '365');

% Add Generator & Subsystems
add_block('simulink/Sources/Constant', [modelName '/Daily_Demand_Generator'], ...
    'Value', 'num_cameras * images_per_day_per_camera', 'Position', [50, 120, 150, 160]);

add_block('simulink/Sources/Constant', [modelName '/Bandwidth_Capacity'], ...
    'Value', 'bandwidth_daily_capacity', 'Position', [50, 200, 150, 240]);

add_block('simulink/Sources/Constant', [modelName '/AI_Compute_Capacity'], ...
    'Value', 'ai_daily_capacity', 'Position', [50, 280, 150, 320]);

add_block('simulink/Sources/Constant', [modelName '/Reviewer_Reading_Capacity'], ...
    'Value', 'reviewer_daily_capacity', 'Position', [50, 360, 150, 400]);

add_block('simulink/Math Operations/MinMax', [modelName '/System_Bottleneck_Detector'], ...
    'Function', 'min', 'Inputs', '3', 'Position', [260, 250, 310, 350]);

add_block('simulink/Math Operations/MinMax', [modelName '/Effective_Daily_Throughput'], ...
    'Function', 'min', 'Inputs', '2', 'Position', [400, 180, 450, 240]);

add_block('simulink/Math Operations/Sum', [modelName '/Daily_Net_Backlog_Change'], ...
    'Inputs', '+-', 'Position', [520, 130, 550, 190]);

add_block('simulink/Discrete/Discrete-Time Integrator', [modelName '/Backlog_Accumulator'], ...
    'IntegratorMethod', 'Forward Euler', 'Position', [620, 140, 670, 180]);

add_block('simulink/Sinks/Scope', [modelName '/Backlog_Evolution_Scope'], ...
    'Position', [750, 144, 780, 176]);

add_block('simulink/Sinks/Outport', [modelName '/DailyThroughput'], ...
    'Position', [620, 213, 650, 227]);

% Connect Blocks
add_line(modelName, 'Daily_Demand_Generator/1', 'Daily_Net_Backlog_Change/1');
add_line(modelName, 'Daily_Demand_Generator/1', 'Effective_Daily_Throughput/1');
add_line(modelName, 'Bandwidth_Capacity/1', 'System_Bottleneck_Detector/1');
add_line(modelName, 'AI_Compute_Capacity/1', 'System_Bottleneck_Detector/2');
add_line(modelName, 'Reviewer_Reading_Capacity/1', 'System_Bottleneck_Detector/3');
add_line(modelName, 'System_Bottleneck_Detector/1', 'Effective_Daily_Throughput/2');
add_line(modelName, 'Effective_Daily_Throughput/1', 'Daily_Net_Backlog_Change/2');
add_line(modelName, 'Daily_Net_Backlog_Change/1', 'Backlog_Accumulator/1');
add_line(modelName, 'Backlog_Accumulator/1', 'Backlog_Evolution_Scope/1');

% Save model
save_system(modelName, slxPath);
fprintf('Successfully generated Simulink model: %s\n', slxPath);
close_system(modelName);
