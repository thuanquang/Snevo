-- Fix for profile trigger that references non-existent username field in OLD record
-- This script ensures the trigger and function are properly set up

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_profiles_updated_at ON db_nike.profiles;

-- Recreate the function with proper checks
CREATE OR REPLACE FUNCTION db_nike.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Only modify updated_at on UPDATE operations
    -- Don't access OLD record on INSERT
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON db_nike.profiles
    FOR EACH ROW EXECUTE FUNCTION db_nike.update_updated_at_column();

-- Ensure the handle_new_user function handles Google OAuth metadata properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert profile for new user with data from OAuth or email signup
    INSERT INTO db_nike.profiles (user_id, username, full_name, role, avatar_url, email)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            NEW.raw_user_meta_data->>'preferred_username',
            NEW.raw_user_meta_data->>'name',
            SPLIT_PART(NEW.email, '@', 1)
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            SPLIT_PART(NEW.email, '@', 1)
        ),
        COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.email
    )
    ON CONFLICT (user_id) DO UPDATE SET
        username = COALESCE(EXCLUDED.username, db_nike.profiles.username),
        full_name = COALESCE(EXCLUDED.full_name, db_nike.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, db_nike.profiles.avatar_url),
        email = COALESCE(EXCLUDED.email, db_nike.profiles.email),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA db_nike TO authenticated;
GRANT SELECT, INSERT, UPDATE ON db_nike.profiles TO authenticated;

