%% =========================================================================
%% NetraAI (SIH26038): Automated Telemedicine Simulink / SimEvents Model Builder
%% Conforms to: MATLAB_INTEGRATION_SPEC_SIH26038.md (Phase 3)
%% Sponsor: MathWorks · Theme: MedTech / BioTech / HealthTech
%% =========================================================================
% Builds the 'telemedicine_district_model.slx' SimEvents discrete-event
% queue simulation model for district-scale telemedicine screening.
%
% Toolboxes Required:
% - Simulink
% - SimEvents (Entity Generator, Entity Queue, Entity Server, Entity Terminator)
% - Statistics and Machine Learning Toolbox
%% =========================================================================

clear; clc;
modelName = 'telemedicine_district_model';
fprintf('Building SimEvents Telemedicine Model: %s.slx...\n', modelName);

% 1. Close system if already loaded
if bdIsLoaded(modelName)
    close_system(modelName, 0);
end

% 2. Check if already built
slxPath = fullfile(pwd, [modelName '.slx']);

% 3. Synchronized Parameter Baseline (matches simulation_service.py and run_simulation.m)
num_cameras = 5;
images_per_day_per_camera = 40;
bandwidth_mbps = 4.0;
ai_processing_time_sec = 3.5;
num_reviewers = 2;
avg_review_time_sec = 25.0;

fprintf('Configuring District Parameters:\n');
fprintf('  Cameras: %d | Intake/Day: %d | Bandwidth: %.1f Mbps\n', ...
    num_cameras, num_cameras * images_per_day_per_camera, bandwidth_mbps);
fprintf('  Reviewers: %d | AI Time: %.1fs | Review Time: %.1fs\n', ...
    num_reviewers, ai_processing_time_sec, avg_review_time_sec);

% 4. Create new Simulink system
new_system(modelName);
open_system(modelName);

% Configure discrete solver for 365 days
set_param(modelName, 'Solver', 'FixedStepDiscrete', 'FixedStep', '1.0', 'StopTime', '365');

% Add SimEvents / Simulink functional blocks
% Try adding SimEvents blocks if SimEvents library is available
has_simevents = ~isempty(find_system('simevents', 'SearchDepth', 0));

if has_simevents
    fprintf('[+] SimEvents library detected. Assembling discrete-event entity queue...\n');
    try
        % Entity Generator (Patient arrivals from Primary Health Centers)
        add_block('simevents/SimEvents Blocks/Generators/Entity Generator', ...
            [modelName '/PHC_Patient_Arrivals'], 'Position', [50, 100, 150, 160]);

        % Entity Queue (Backlog buffer)
        add_block('simevents/SimEvents Blocks/Queues/FIFO Queue', ...
            [modelName '/Screening_Backlog_Queue'], 'Position', [220, 100, 300, 160], ...
            'Capacity', '50000');

        % Entity Server (AI + Clinician Review Processing)
        add_block('simevents/SimEvents Blocks/Servers/Single Server', ...
            [modelName '/AI_Clinician_Triage_Server'], 'Position', [380, 100, 480, 160]);

        % Entity Terminator (Patient completed & referred)
        add_block('simevents/SimEvents Blocks/Sinks/Entity Terminator', ...
            [modelName '/Completed_Screenings'], 'Position', [560, 110, 620, 150]);

        % Connect SimEvents flow
        add_line(modelName, 'PHC_Patient_Arrivals/1', 'Screening_Backlog_Queue/1');
        add_line(modelName, 'Screening_Backlog_Queue/1', 'AI_Clinician_Triage_Server/1');
        add_line(modelName, 'AI_Clinician_Triage_Server/1', 'Completed_Screenings/1');
        fprintf('[+] Connected SimEvents entity pipeline successfully.\n');
    catch ME
        fprintf('[!] SimEvents block configuration notice: %s. Building standard discrete model.\n', ME.message);
    end
else
    fprintf('[*] SimEvents not in search path. Building high-fidelity discrete capacity accumulator...\n');
end

% Standard discrete queue fallback / parallel monitoring blocks
add_block('simulink/Sources/Constant', [modelName '/Daily_PHC_Demand'], ...
    'Value', sprintf('%d', num_cameras * images_per_day_per_camera), 'Position', [50, 220, 160, 260]);

add_block('simulink/Sources/Constant', [modelName '/Reviewer_Capacity'], ...
    'Value', sprintf('%d', floor(num_reviewers * ((6 * 3600) / avg_review_time_sec))), 'Position', [50, 300, 160, 340]);

add_block('simulink/Math Operations/MinMax', [modelName '/Effective_Throughput'], ...
    'Function', 'min', 'Inputs', '2', 'Position', [260, 240, 300, 300]);

add_block('simulink/Math Operations/Sum', [modelName '/Net_Backlog_Delta'], ...
    'Inputs', '+-', 'Position', [380, 220, 410, 280]);

add_block('simulink/Discrete/Discrete-Time Integrator', [modelName '/Backlog_Tracker'], ...
    'IntegratorMethod', 'Forward Euler', 'Position', [480, 230, 530, 270]);

add_block('simulink/Sinks/Scope', [modelName '/Backlog_Scope'], 'Position', [600, 235, 630, 265]);

add_line(modelName, 'Daily_PHC_Demand/1', 'Effective_Throughput/1');
add_line(modelName, 'Reviewer_Capacity/1', 'Effective_Throughput/2');
add_line(modelName, 'Daily_PHC_Demand/1', 'Net_Backlog_Delta/1');
add_line(modelName, 'Effective_Throughput/1', 'Net_Backlog_Delta/2');
add_line(modelName, 'Net_Backlog_Delta/1', 'Backlog_Tracker/1');
add_line(modelName, 'Backlog_Tracker/1', 'Backlog_Scope/1');

% Save model
save_system(modelName, slxPath);
fprintf('[+] Successfully generated and saved: %s\n', slxPath);
close_system(modelName);
