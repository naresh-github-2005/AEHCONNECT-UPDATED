-- Add additional fields to classes table for DNB schedule compatibility
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS speaker_name TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS study_material TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS material_urls TEXT[];
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS url_display_texts TEXT[];

-- Insert January 2026 DNB Class Schedule Data
INSERT INTO public.classes (title, class_type, class_date, start_time, end_time, department, topic, speaker_name, moderator_name, study_material, material_urls, url_display_texts)
VALUES
-- Week 1
('Paediatric and Congenital Glaucoma Classification/Nomenclature and Evaluation under Anesthesia', 'lecture', '2026-01-01', '07:00', '08:00', 'Glaucoma', 'Paediatric and Congenital Glaucoma Classification/Nomenclature and Evaluation under Anesthesia', 'Dr Manaswini', 'Dr Krishna', 'AAO BSCC Series, Chapter 11 Pg No - 187-192', 
  ARRAY['https://drive.google.com/file/d/1uBXPP-Ua7vtuf3DJHD9m8RJXiq1tbWdA/view?usp=share_link', 'https://drive.google.com/file/d/1JVPWay5CdoZ-vMmiU7spCInT78N9OCpG/view?usp=share_link'],
  ARRAY['Congenital and Paediatric Glaucoma Classification and Nomenclature.pdf', 'Examination under anesthesia: Preferred Practice.pdf']),

('Idiopathic Inflammatory Orbital Disease', 'lecture', '2026-01-02', '07:00', '08:00', 'Orbit', 'Idiopathic Inflammatory Orbital Disease', 'Dr Jithin', 'Dr Jayagayathri', 'Idiopathic Orbital Inflammation: Review of Literature and New Advances',
  ARRAY['https://drive.google.com/file/d/11ZjO-hjooXKcdYRihI_1hlS0Ji5-OVum/view?usp=share_link'],
  ARRAY['idiopathic_orbital_inflammation__review_of.4.pdf']),

-- Week 2
('Fuch''s Heterochromic Uveitis', 'lecture', '2026-01-06', '07:00', '08:00', 'Uvea', 'Fuch''s Heterochromic Uveitis', 'Dr Gokul', 'Dr Balamurugan', 'A literature review on Fuchs uveitis syndrome: an update',
  ARRAY['https://drive.google.com/file/d/1yIBu7LztUEZpQL9iPGpu0zDf1F47ilNa/view?usp=share_link', 'https://drive.google.com/file/d/1XwHHYfo2UWiYnBHEuE1qs7POwiXnNDH3/view?usp=share_link'],
  ARRAY['streilein1987.pdf', 'A literature review on Fuchs uveitis syndrome: an update.pdf']),

('Case Presentation - Cornea', 'case_presentation', '2026-01-07', '07:00', '08:00', 'Cornea', 'Case Presentation', 'Dr Vanitha', 'Dr Vasanth', NULL, NULL, NULL),

('Case Presentation - Retina', 'case_presentation', '2026-01-08', '07:00', '08:00', 'Retina', 'Case Presentation', 'Dr Rucha', 'Dr Suresh', NULL, NULL, NULL),

('OCT Fundamentals', 'lecture', '2026-01-09', '07:00', '08:00', 'General', 'OCT', 'Dr Annapurna', NULL, NULL, NULL, NULL),

-- Week 3
('Paediatric Cataract - Etiology & Morphology', 'lecture', '2026-01-13', '07:00', '08:00', 'Paediatric', 'Paediatric Cataract - Etiology & Morphology', 'Dr Geeta', 'Dr Sivagami', NULL,
  ARRAY['https://drive.google.com/file/d/1mPNYgGHoTcDSS0FbRMw8Ay3E3iVlc6AS/view?usp=share_link', 'https://drive.google.com/file/d/1lUffldAq1r5Ck6SVn1ZB1izsLBbNnJpA/view?usp=share_link', 'https://www.aao.org/education/disease-review/pediatric-cataracts-overview', 'https://www.ncbi.nlm.nih.gov/books/NBK572080/'],
  ARRAY['Paediatric Cataract - Etiology Stat Pearls.pdf', 'Paediatric Cataract - Morphology AAO.pdf', 'FOR MORPHOLOGY', 'FOR ETIOLOGY']),

('Traumatic Cataract', 'lecture', '2026-01-14', '07:00', '08:00', 'Cataract', 'Traumatic Cataract', 'Dr Kaavya', 'Dr Sudha', 'Traumatic Cataract - Narrative Review',
  ARRAY['https://drive.google.com/file/d/11XSC4Wx9qifBSXQN69ijNdbe69pYtqdJ/view?usp=share_link'],
  ARRAY['Traumatic Cataract: Narrative Review.pdf']),

-- Week 4
('Case Presentation - Glaucoma', 'case_presentation', '2026-01-20', '07:00', '08:00', 'Glaucoma', 'Case Presentation', 'Dr Vanitha', 'Dr Saloni', NULL, NULL, NULL),

('Papilledema', 'lecture', '2026-01-21', '07:00', '08:00', 'Neuro', 'Papilledema', 'Dr Siddhi', 'Dr Balraj', 'Papilledma: A review',
  ARRAY['https://drive.google.com/file/d/1CGNigqRLdcOg2pDpEHDqpPi7Rhyq86pG/view?usp=share_link'],
  ARRAY['Papilledema: A review of etiology, pathophysiology, diagnosis, and management.pdf']),

('Retinal Toxicity of Systemic Drugs', 'lecture', '2026-01-22', '07:00', '08:00', 'Retina', 'Retinal Toxicity of Systemic Drugs', 'Dr Suhas', 'Dr Suresh', 'The Impact of Systemic Medications on Retinal Function',
  ARRAY['https://drive.google.com/file/d/13lVrTQcFpgFJPK5Ydgx58P_Yi-uFXcTg/view?usp=sharing', 'https://drive.google.com/file/d/1QTpRfBTKC-kZPIq45l_M5lMbAJYZUoWT/view?usp=share_link'],
  ARRAY['Update on Retinal Drug Toxicities.pdf', 'The Impact of Systemic Medications on Retinal Function.pdf']),

('OCT Advanced', 'lecture', '2026-01-23', '07:00', '08:00', 'General', 'OCT', 'Dr Annapurna', NULL, NULL, NULL, NULL),

-- Week 5
('Neonatal Conjunctivitis', 'lecture', '2026-01-27', '07:00', '08:00', 'Cornea', 'Neonatal Conjunctivitis', 'Dr Utkarsh, Dr Meena', 'Dr Rashmita', 'Neonatal Conjunctivitis: Review',
  ARRAY['https://drive.google.com/file/d/1At7-k0g8TBMMn9ePtreHEjJ65DOSfwVV/view?usp=share_link'],
  ARRAY['Neonatal Conjunctivitis: Review.pdf']),

('Glaucoma Drainage Devices', 'lecture', '2026-01-28', '07:00', '08:00', 'Glaucoma', 'Glaucoma Drainage Devices', 'Dr Ojus', 'Dr Annamalai', 'Glaucoma Drainage Devices',
  ARRAY['https://eyewiki.org/Glaucoma_Drainage_Devices', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9554953/', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10807850/'],
  ARRAY['Glaucoma Drainage Devices - EyeWiki', 'A Review on Glaucoma Drainage Devices and its Complications - PMC', 'Glaucoma Drainage Device Implantation, Outcomes, and Complications - PMC']),

('Radiation/Solar Retinopathy', 'lecture', '2026-01-29', '07:00', '08:00', 'Retina', 'Radiation/Solar Retinopathy', 'Dr Neha Sapar', 'Dr Devika', 'Solar Retinopathy - A literature Review',
  ARRAY['https://pmc.ncbi.nlm.nih.gov/articles/PMC11309525/'],
  ARRAY['Solar retinopathy: A literature review - PMC']),

('Nocardia Keratitis', 'lecture', '2026-01-30', '07:00', '08:00', 'Cornea', 'Nocardia Keratitis', 'Dr Arpit, Dr Pavithra', 'Dr Kunal', 'Current Diagnostic Tools and Modalities of Nocardia Keratitis',
  ARRAY['https://drive.google.com/file/d/1nKaNFOSOoaSnweu6uDHOR2bpFZKxOUTm/view?usp=share_link'],
  ARRAY['Current diagnostic tools and management modalities of Nocardia keratitis.pdf']);
