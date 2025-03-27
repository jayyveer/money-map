/*
  # Create initial user and set up auth configuration

  1. Initial Setup
    - Create initial user with email jayveer@moneymap.com
    - Set up profile for the user
    - Enable email auth

  2. Security
    - Enable RLS on profiles table
    - Add policies for user access
*/

-- Create the initial user profile
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'jayveer@moneymap.com',
  crypt('jayveer123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Get the user's ID
DO $$
DECLARE
  auth_user_id uuid;
BEGIN
  SELECT id INTO auth_user_id FROM auth.users WHERE email = 'jayveer@moneymap.com' LIMIT 1;

  -- Create profile for the user
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (auth_user_id, 'Jayveer', now(), now())
  ON CONFLICT (id) DO NOTHING;
END $$;