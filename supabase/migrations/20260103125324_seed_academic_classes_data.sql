-- Seed academic data for Profile Academic Progress section
-- Shows conducted vs attended for conferences, classes, and CDs

-- Insert conferences over the last 6 months (about 2-3 per month = ~15 total)
INSERT INTO classes (title, class_type, class_date, start_time, end_time, department, topic, speaker_name)
VALUES
  ('Annual Ophthalmology Conference', 'conference', CURRENT_DATE - interval '10 days', '09:00', '17:00', 'Ophthalmology', 'Annual departmental review', 'Dr. HOD'),
  ('Glaucoma Update Conference', 'conference', CURRENT_DATE - interval '25 days', '09:00', '16:00', 'Glaucoma', 'Latest advances in glaucoma management', 'Dr. Specialist'),
  ('Retina Summit', 'conference', CURRENT_DATE - interval '40 days', '09:00', '17:00', 'Retina', 'Retinal surgery updates', 'Dr. Retina Expert'),
  ('Cornea Workshop Conference', 'conference', CURRENT_DATE - interval '55 days', '10:00', '16:00', 'Cornea', 'Corneal transplantation techniques', 'Dr. Cornea'),
  ('Pediatric Eye Conference', 'conference', CURRENT_DATE - interval '70 days', '09:00', '15:00', 'Pediatric', 'Pediatric eye care', 'Dr. Pediatric'),
  ('Cataract Conference 2025', 'conference', CURRENT_DATE - interval '85 days', '09:00', '17:00', 'Cataract', 'New IOL technologies', 'Dr. Cataract'),
  ('Neuro-Ophthalmology Meet', 'conference', CURRENT_DATE - interval '100 days', '10:00', '16:00', 'Neuro', 'Neuro-ophthalmic disorders', 'Dr. Neuro'),
  ('Oculoplasty Conference', 'conference', CURRENT_DATE - interval '115 days', '09:00', '16:00', 'Oculoplasty', 'Reconstructive surgery', 'Dr. Oculoplasty'),
  ('Research Conference', 'conference', CURRENT_DATE - interval '130 days', '09:00', '17:00', 'Research', 'Clinical research presentations', 'Dr. Research'),
  ('Quarterly Review Conference', 'conference', CURRENT_DATE - interval '145 days', '09:00', '15:00', 'General', 'Quarterly department review', 'Dr. HOD'),
  ('Inter-Department Conference', 'conference', CURRENT_DATE - interval '160 days', '10:00', '16:00', 'General', 'Multi-specialty discussion', 'Multiple Speakers'),
  ('CME Conference', 'conference', CURRENT_DATE - interval '175 days', '09:00', '17:00', 'CME', 'Continuing medical education', 'Dr. CME Coordinator')
ON CONFLICT DO NOTHING;

-- Insert seminars and workshops
INSERT INTO classes (title, class_type, class_date, start_time, end_time, department, topic, speaker_name)
VALUES
  ('Advanced Phaco Techniques Seminar', 'seminar', CURRENT_DATE - interval '15 days', '14:00', '16:00', 'Cataract', 'Advanced phaco techniques', 'Dr. Expert'),
  ('OCT Interpretation Workshop', 'workshop', CURRENT_DATE - interval '30 days', '10:00', '13:00', 'Retina', 'OCT interpretation', 'Dr. Imaging'),
  ('Glaucoma Diagnosis Seminar', 'seminar', CURRENT_DATE - interval '45 days', '14:00', '16:00', 'Glaucoma', 'Early diagnosis techniques', 'Dr. Glaucoma'),
  ('Surgical Skills Workshop', 'workshop', CURRENT_DATE - interval '60 days', '09:00', '12:00', 'Surgery', 'Basic surgical skills', 'Dr. Surgeon'),
  ('Contact Lens Fitting Seminar', 'seminar', CURRENT_DATE - interval '75 days', '15:00', '17:00', 'Cornea', 'Contact lens fitting', 'Dr. Optometry'),
  ('Low Vision Aids Workshop', 'workshop', CURRENT_DATE - interval '90 days', '10:00', '13:00', 'Low Vision', 'Low vision rehabilitation', 'Dr. LV Expert'),
  ('Pediatric Screening Seminar', 'seminar', CURRENT_DATE - interval '105 days', '14:00', '16:00', 'Pediatric', 'Pediatric eye screening', 'Dr. Pediatric'),
  ('Emergency Eye Care Workshop', 'workshop', CURRENT_DATE - interval '120 days', '09:00', '12:00', 'Emergency', 'Emergency protocols', 'Dr. Emergency')
ON CONFLICT DO NOTHING;

-- Create attendance records for all doctors for conferences
INSERT INTO class_attendees (class_id, doctor_id, doctor_name, role, attended)
SELECT 
  c.id,
  d.id,
  d.name,
  'attendee',
  (random() < CASE 
    WHEN d.seniority IN ('consultant', 'senior_consultant') THEN 0.82
    WHEN d.seniority = 'fellow' THEN 0.75
    ELSE 0.68
  END)
FROM classes c
CROSS JOIN doctors d
WHERE c.class_type = 'conference'
  AND c.class_date >= CURRENT_DATE - interval '180 days'
  AND c.class_date <= CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM class_attendees ca 
    WHERE ca.class_id = c.id AND ca.doctor_id = d.id
  )
ON CONFLICT DO NOTHING;

-- Create attendance records for seminars and workshops
INSERT INTO class_attendees (class_id, doctor_id, doctor_name, role, attended)
SELECT 
  c.id,
  d.id,
  d.name,
  'attendee',
  (random() < CASE 
    WHEN d.seniority IN ('consultant', 'senior_consultant') THEN 0.72
    WHEN d.seniority = 'fellow' THEN 0.68
    ELSE 0.62
  END)
FROM classes c
CROSS JOIN doctors d
WHERE c.class_type IN ('seminar', 'workshop')
  AND c.class_date >= CURRENT_DATE - interval '180 days'
  AND c.class_date <= CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM class_attendees ca 
    WHERE ca.class_id = c.id AND ca.doctor_id = d.id
  )
ON CONFLICT DO NOTHING;

-- Create attendance records for existing lectures
INSERT INTO class_attendees (class_id, doctor_id, doctor_name, role, attended)
SELECT 
  c.id,
  d.id,
  d.name,
  'attendee',
  (random() < CASE 
    WHEN d.seniority IN ('consultant', 'senior_consultant') THEN 0.72
    WHEN d.seniority = 'fellow' THEN 0.68
    ELSE 0.62
  END)
FROM classes c
CROSS JOIN doctors d
WHERE c.class_type = 'lecture'
  AND c.class_date >= CURRENT_DATE - interval '180 days'
  AND c.class_date <= CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM class_attendees ca 
    WHERE ca.class_id = c.id AND ca.doctor_id = d.id
  )
ON CONFLICT DO NOTHING;

-- Seed surgery_logs (CDs) for each doctor - 8-15 videos each
INSERT INTO surgery_logs (doctor_id, surgery_date, surgery_type, video_url, video_title, is_viewed, viewed_at)
SELECT 
  d.id,
  (CURRENT_DATE - (gs * 10 || ' days')::interval)::date,
  CASE (gs % 6)
    WHEN 0 THEN 'Cataract - Phaco'
    WHEN 1 THEN 'Glaucoma - Trabeculectomy'
    WHEN 2 THEN 'Retina - Vitrectomy'
    WHEN 3 THEN 'Cornea - DALK'
    WHEN 4 THEN 'Oculoplasty - Ptosis'
    ELSE 'LASIK'
  END,
  'https://videos.hospital.com/surgery/' || d.id || '/video' || gs,
  CASE (gs % 6)
    WHEN 0 THEN 'Phacoemulsification Technique #' || gs
    WHEN 1 THEN 'Trabeculectomy Procedure #' || gs
    WHEN 2 THEN 'Vitrectomy Surgery #' || gs
    WHEN 3 THEN 'DALK Surgery #' || gs
    WHEN 4 THEN 'Ptosis Correction #' || gs
    ELSE 'LASIK Procedure #' || gs
  END,
  (random() < CASE 
    WHEN d.seniority IN ('consultant', 'senior_consultant') THEN 0.68
    WHEN d.seniority = 'fellow' THEN 0.62
    ELSE 0.55
  END),
  CASE 
    WHEN random() < 0.6 THEN CURRENT_TIMESTAMP - (random() * 60 || ' days')::interval
    ELSE NULL
  END
FROM doctors d
CROSS JOIN generate_series(1, 12) gs
ON CONFLICT DO NOTHING;
