/*
  # Initial MoneyMap Schema

  1. New Tables
    - `profiles`
      - Stores user profile information
      - Links to auth.users
    - `salary_entries`
      - Tracks salary history
      - Includes base salary and bonuses
    - `epf_contributions`
      - Records EPF contribution history
    - `investments`
      - Tracks investment portfolio
      - Supports both SIP and manual investments
    - `expenses`
      - Records daily expenses
      - Supports categorization and notes

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create salary entries table
CREATE TABLE IF NOT EXISTS salary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  date date NOT NULL,
  base_amount decimal(12,2) NOT NULL,
  bonus_amount decimal(12,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create EPF contributions table
CREATE TABLE IF NOT EXISTS epf_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  date date NOT NULL,
  amount decimal(12,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create investments table
CREATE TABLE IF NOT EXISTS investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('SIP', 'MANUAL')),
  name text NOT NULL,
  amount decimal(12,2) NOT NULL,
  date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  date date NOT NULL,
  amount decimal(12,2) NOT NULL,
  category text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE epf_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can view own salary entries"
  ON salary_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own salary entries"
  ON salary_entries FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own EPF contributions"
  ON epf_contributions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own EPF contributions"
  ON epf_contributions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own investments"
  ON investments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own investments"
  ON investments FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own expenses"
  ON expenses FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create functions
CREATE OR REPLACE FUNCTION get_total_net_worth(p_user_id uuid)
RETURNS decimal
LANGUAGE plpgsql
AS $$
DECLARE
  total_salary decimal;
  total_epf decimal;
  total_investments decimal;
  total_expenses decimal;
BEGIN
  -- Get total salary
  SELECT COALESCE(SUM(base_amount + bonus_amount), 0)
  INTO total_salary
  FROM salary_entries
  WHERE user_id = p_user_id;

  -- Get total EPF
  SELECT COALESCE(SUM(amount), 0)
  INTO total_epf
  FROM epf_contributions
  WHERE user_id = p_user_id;

  -- Get total investments
  SELECT COALESCE(SUM(amount), 0)
  INTO total_investments
  FROM investments
  WHERE user_id = p_user_id;

  -- Get total expenses
  SELECT COALESCE(SUM(amount), 0)
  INTO total_expenses
  FROM expenses
  WHERE user_id = p_user_id;

  RETURN total_salary + total_epf + total_investments - total_expenses;
END;
$$;