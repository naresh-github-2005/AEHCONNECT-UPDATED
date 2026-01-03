-- Migration: Update eligible duties and restructure channels
-- Date: 2026-01-03

-- Step 1: Define the new duty types
-- OPD Units: Unit 1, Unit 2, Unit 3, Unit 4, Free Unit, Cornea, Retina, Glaucoma, Neuro-Ophthalmology, IOL, UVEA, ORBIT, Pediatric
-- OT Specialties: Cataract OT, Cornea OT, Retina OT, Glaucoma OT, Neuro OT, ORBIT OT, Pediatrics OT, IOL OT
-- Others: Ward, Stay Camp, Day Camp, Daycare, Physician, Block Room, Night Duty, Emergency

-- Step 2: Update all doctors with random eligible duties
DO $$
DECLARE
    doc_record RECORD;
    all_duties TEXT[] := ARRAY[
        'Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Free Unit',
        'Cornea', 'Retina', 'Glaucoma', 'Neuro-Ophthalmology', 'IOL', 'UVEA', 'ORBIT', 'Pediatric',
        'Cataract OT', 'Cornea OT', 'Retina OT', 'Glaucoma OT', 'Neuro OT', 'ORBIT OT', 'Pediatrics OT', 'IOL OT',
        'Ward', 'Stay Camp', 'Day Camp', 'Daycare', 'Physician', 'Block Room', 'Night Duty', 'Emergency'
    ];
    selected_duties TEXT[];
    num_duties INT;
    i INT;
    random_idx INT;
BEGIN
    FOR doc_record IN SELECT id FROM doctors LOOP
        -- Each doctor gets 5-12 random duties
        num_duties := 5 + floor(random() * 8)::INT;
        selected_duties := ARRAY[]::TEXT[];
        
        -- Shuffle and pick duties
        FOR i IN 1..num_duties LOOP
            random_idx := 1 + floor(random() * array_length(all_duties, 1))::INT;
            IF NOT all_duties[random_idx] = ANY(selected_duties) THEN
                selected_duties := array_append(selected_duties, all_duties[random_idx]);
            END IF;
        END LOOP;
        
        -- Update the doctor's eligible duties
        UPDATE doctors SET eligible_duties = selected_duties WHERE id = doc_record.id;
    END LOOP;
END $$;

-- Step 3: Delete all existing channels and messages
DELETE FROM chat_messages;
DELETE FROM channel_members;
DELETE FROM chat_channels;

-- Step 4: Create the new channel structure
-- Main department channels (parent channels)
INSERT INTO chat_channels (id, name, description, channel_type, category, eligible_duties) VALUES
-- OPD Parent - visible to anyone with any OPD unit duty
(gen_random_uuid(), 'OPD', 'General OPD discussions', 'department', 'opd', 
 ARRAY['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Free Unit', 'Cornea', 'Retina', 'Glaucoma', 'Neuro-Ophthalmology', 'IOL', 'UVEA', 'ORBIT', 'Pediatric']),

-- OPD Unit channels - visible only to doctors eligible for that specific unit
(gen_random_uuid(), 'Unit 1', 'OPD Unit 1 discussions', 'department', 'opd', ARRAY['Unit 1']),
(gen_random_uuid(), 'Unit 2', 'OPD Unit 2 discussions', 'department', 'opd', ARRAY['Unit 2']),
(gen_random_uuid(), 'Unit 3', 'OPD Unit 3 discussions', 'department', 'opd', ARRAY['Unit 3']),
(gen_random_uuid(), 'Unit 4', 'OPD Unit 4 discussions', 'department', 'opd', ARRAY['Unit 4']),
(gen_random_uuid(), 'Free Unit', 'OPD Free Unit discussions', 'department', 'opd', ARRAY['Free Unit']),
(gen_random_uuid(), 'Cornea', 'Cornea specialty discussions', 'department', 'opd', ARRAY['Cornea']),
(gen_random_uuid(), 'Retina', 'Retina specialty discussions', 'department', 'opd', ARRAY['Retina']),
(gen_random_uuid(), 'Glaucoma', 'Glaucoma specialty discussions', 'department', 'opd', ARRAY['Glaucoma']),
(gen_random_uuid(), 'Neuro-Ophthalmology', 'Neuro-Ophthalmology specialty discussions', 'department', 'opd', ARRAY['Neuro-Ophthalmology']),
(gen_random_uuid(), 'IOL', 'IOL specialty discussions', 'department', 'opd', ARRAY['IOL']),
(gen_random_uuid(), 'UVEA', 'UVEA specialty discussions', 'department', 'opd', ARRAY['UVEA']),
(gen_random_uuid(), 'ORBIT', 'ORBIT specialty discussions', 'department', 'opd', ARRAY['ORBIT']),
(gen_random_uuid(), 'Pediatric', 'Pediatric specialty discussions', 'department', 'opd', ARRAY['Pediatric']),

-- OT Parent - visible to anyone with any OT specialty duty
(gen_random_uuid(), 'OT', 'General OT discussions', 'department', 'ot',
 ARRAY['Cataract OT', 'Cornea OT', 'Retina OT', 'Glaucoma OT', 'Neuro OT', 'ORBIT OT', 'Pediatrics OT', 'IOL OT']),

-- OT Specialty channels - visible only to doctors eligible for that specific OT
(gen_random_uuid(), 'Cataract OT', 'Cataract OT discussions', 'department', 'ot', ARRAY['Cataract OT']),
(gen_random_uuid(), 'Cornea OT', 'Cornea OT discussions', 'department', 'ot', ARRAY['Cornea OT']),
(gen_random_uuid(), 'Retina OT', 'Retina OT discussions', 'department', 'ot', ARRAY['Retina OT']),
(gen_random_uuid(), 'Glaucoma OT', 'Glaucoma OT discussions', 'department', 'ot', ARRAY['Glaucoma OT']),
(gen_random_uuid(), 'Neuro OT', 'Neuro OT discussions', 'department', 'ot', ARRAY['Neuro OT']),
(gen_random_uuid(), 'ORBIT OT', 'ORBIT OT discussions', 'department', 'ot', ARRAY['ORBIT OT']),
(gen_random_uuid(), 'Pediatrics OT', 'Pediatrics OT discussions', 'department', 'ot', ARRAY['Pediatrics OT']),
(gen_random_uuid(), 'IOL OT', 'IOL OT discussions', 'department', 'ot', ARRAY['IOL OT']),

-- Ward channel
(gen_random_uuid(), 'Ward', 'Ward duty discussions', 'department', 'ward', ARRAY['Ward']),

-- Camp Parent - visible to anyone with any camp duty
(gen_random_uuid(), 'Camp', 'General Camp discussions', 'department', 'camp', ARRAY['Stay Camp', 'Day Camp']),

-- Camp type channels
(gen_random_uuid(), 'Stay Camp', 'Stay Camp discussions', 'department', 'camp', ARRAY['Stay Camp']),
(gen_random_uuid(), 'Day Camp', 'Day Camp discussions', 'department', 'camp', ARRAY['Day Camp']),

-- Other department channels
(gen_random_uuid(), 'Daycare', 'Daycare duty discussions', 'department', 'daycare', ARRAY['Daycare']),
(gen_random_uuid(), 'Physician', 'Physician duty discussions', 'department', 'physician', ARRAY['Physician']),
(gen_random_uuid(), 'Block Room', 'Block Room duty discussions', 'department', 'block_room', ARRAY['Block Room']),
(gen_random_uuid(), 'Night Duty', 'Night Duty discussions', 'department', 'night_duty', ARRAY['Night Duty']),
(gen_random_uuid(), 'Emergency', 'Emergency duty discussions', 'department', 'emergency', ARRAY['Emergency']),

-- General Announcements channel - visible to all (no duty restrictions)
(gen_random_uuid(), 'Announcements', 'Hospital-wide announcements', 'announcement', 'general', NULL);
