-- Create doctor_daily_stats table for tracking daily progress
CREATE TABLE IF NOT EXISTS public.doctor_daily_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    duty_type TEXT,
    patients_seen INTEGER DEFAULT 0,
    surgeries_performed INTEGER DEFAULT 0,
    hours_worked DECIMAL(4,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(doctor_id, date, duty_type)
);

-- Create academic_targets table for setting annual targets
CREATE TABLE IF NOT EXISTS public.academic_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    conferences_target INTEGER DEFAULT 20,
    classes_target INTEGER DEFAULT 40,
    cds_target INTEGER DEFAULT 8,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(doctor_id, year)
);

-- Add email column to doctors if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doctors' AND column_name = 'email') THEN
        ALTER TABLE public.doctors ADD COLUMN email TEXT;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.doctor_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for doctor_daily_stats
CREATE POLICY "Doctors can view their own daily stats" ON public.doctor_daily_stats
    FOR SELECT USING (
        doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Doctors can insert their own daily stats" ON public.doctor_daily_stats
    FOR INSERT WITH CHECK (
        doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Doctors can update their own daily stats" ON public.doctor_daily_stats
    FOR UPDATE USING (
        doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- RLS Policies for academic_targets
CREATE POLICY "Doctors can view their own academic targets" ON public.academic_targets
    FOR SELECT USING (
        doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin can manage academic targets" ON public.academic_targets
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_doctor_daily_stats_doctor_date ON public.doctor_daily_stats(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_doctor_daily_stats_date ON public.doctor_daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_academic_targets_doctor_year ON public.academic_targets(doctor_id, year);

-- Insert sample data for existing doctors
INSERT INTO public.academic_targets (doctor_id, year, conferences_target, classes_target, cds_target)
SELECT id, 2026, 20, 40, 8 FROM public.doctors
ON CONFLICT (doctor_id, year) DO NOTHING;

-- Insert sample daily stats for existing doctors (last 90 days)
DO $$
DECLARE
    doc RECORD;
    d DATE;
    duty_types TEXT[] := ARRAY['op', 'ot', 'night', 'ward', 'camp'];
    rand_duty TEXT;
BEGIN
    FOR doc IN SELECT id FROM public.doctors LOOP
        FOR i IN 0..89 LOOP
            d := CURRENT_DATE - i;
            -- Skip some days randomly
            IF random() > 0.3 THEN
                rand_duty := duty_types[floor(random() * 5 + 1)::int];
                INSERT INTO public.doctor_daily_stats (doctor_id, date, duty_type, patients_seen, surgeries_performed, hours_worked)
                VALUES (
                    doc.id,
                    d,
                    rand_duty,
                    CASE WHEN rand_duty = 'op' THEN floor(random() * 30 + 15)::int
                         WHEN rand_duty = 'ot' THEN floor(random() * 5 + 1)::int
                         ELSE floor(random() * 10 + 5)::int END,
                    CASE WHEN rand_duty = 'ot' THEN floor(random() * 4 + 1)::int ELSE 0 END,
                    floor(random() * 4 + 4)::decimal
                )
                ON CONFLICT (doctor_id, date, duty_type) DO NOTHING;
            END IF;
        END LOOP;
    END LOOP;
END $$;
