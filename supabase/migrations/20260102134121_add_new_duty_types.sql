-- Add new duty types to the duty_type enum
-- These include additional OT specialties, Daycare, Physician, and Block Room

-- Add new values to the duty_type enum
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Neuro OT';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'ORBIT OT';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Pediatrics OT';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'IOL OT';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Daycare';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Physician';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Block Room';

-- Note: These new duty types enable:
-- OT specialty filters: Cataract OT, Cornea OT, Retina OT, Glaucoma OT, Neuro OT, ORBIT OT, Pediatrics OT, IOL OT
-- Standalone duty types: Daycare, Physician, Block Room
