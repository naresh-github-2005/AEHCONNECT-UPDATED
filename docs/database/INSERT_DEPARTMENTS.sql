-- Insert departments matching the OP DOCTORS POSTING format
-- Based on the uploaded image structure

INSERT INTO public.department_config (department_code, department_name, department_type, min_doctors, max_doctors, specialization_required) VALUES
-- UNIT 1
('UNIT1-CORNEA', 'Unit 1 - Cornea', 'SPECIALTY', 4, 7, 'CORNEA'),
('UNIT1-IOL', 'Unit 1 - IOL', 'SPECIALTY', 3, 6, 'CATARACT'),
('UNIT1-RETINA', 'Unit 1 - Retina', 'SPECIALTY', 4, 6, 'RETINA'),

-- UNIT 2
('UNIT2', 'Unit 2', 'UNIT', 6, 8, NULL),

-- UNIT 3
('UNIT3-ORBIT', 'Unit 3 - Orbit', 'SPECIALTY', 2, 3, 'ORBIT'),
('UNIT3-PAEDIATRIC', 'Unit 3 - Paediatric', 'SPECIALTY', 6, 8, 'PAEDIATRIC'),
('UNIT3-GLAUCOMA', 'Unit 3 - Glaucoma', 'SPECIALTY', 14, 20, 'GLAUCOMA'),

-- UNIT 4
('UNIT4', 'Unit 4', 'UNIT', 5, 7, NULL),

-- Special Departments
('FREE-UNIT', 'Free Unit', 'UNIT', 5, 7, NULL),
('BLOCK-ROOM', 'Block Room', 'SPECIAL', 4, 6, NULL),
('VISION-CENTER', 'Vision Center', 'SPECIAL', 2, 3, NULL),
('UVEA', 'Uvea', 'SPECIALTY', 1, 2, 'UVEA'),
('CITY-CENTRE', 'City Centre Posting', 'SPECIAL', 1, 2, NULL),
('FREE-OP-PHYSICIAN', 'Free OP Physician', 'SPECIAL', 1, 2, NULL),

-- Training Programs
('PHACO-TRAINING', 'Phaco Training', 'SPECIAL', 1, 4, NULL),
('SICS-PHACO-TRAINER', 'SICS/Phaco Trainer', 'SPECIAL', 1, 2, NULL),

-- Emergency
('EMERGENCY', 'Emergency', 'SPECIAL', 2, 4, NULL)
ON CONFLICT (department_code) DO UPDATE SET
  department_name = EXCLUDED.department_name,
  min_doctors = EXCLUDED.min_doctors,
  max_doctors = EXCLUDED.max_doctors,
  specialization_required = EXCLUDED.specialization_required;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Departments inserted successfully!';
  RAISE NOTICE '📋 Total departments: %', (SELECT COUNT(*) FROM public.department_config);
END $$;
