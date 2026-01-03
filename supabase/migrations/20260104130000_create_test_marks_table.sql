-- Create test_marks table for tracking fellow and PG test performance
CREATE TABLE IF NOT EXISTS test_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_date DATE NOT NULL,
  marks_obtained DECIMAL(5,2) NOT NULL CHECK (marks_obtained >= 0),
  total_marks DECIMAL(5,2) NOT NULL CHECK (total_marks > 0),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_marks CHECK (marks_obtained <= total_marks)
);

-- Create index for faster queries
CREATE INDEX idx_test_marks_doctor_id ON test_marks(doctor_id);
CREATE INDEX idx_test_marks_month_year ON test_marks(month, year);
CREATE INDEX idx_test_marks_created_by ON test_marks(created_by);

-- Enable RLS
ALTER TABLE test_marks ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins can manage all test marks"
  ON test_marks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Fellows and PG can view their own test marks
CREATE POLICY "Doctors can view their own test marks"
  ON test_marks
  FOR SELECT
  TO authenticated
  USING (
    doctor_id IN (
      SELECT id FROM doctors
      WHERE user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_test_marks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_test_marks_updated_at_trigger
  BEFORE UPDATE ON test_marks
  FOR EACH ROW
  EXECUTE FUNCTION update_test_marks_updated_at();

-- Add comment
COMMENT ON TABLE test_marks IS 'Stores test marks for fellows and PG doctors';
