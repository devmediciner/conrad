-- Sync email updates from public.user_roles to auth.users
CREATE OR REPLACE FUNCTION public.handle_sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE auth.users
    SET email = NEW.email,
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email', NEW.email)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync email on update
CREATE OR REPLACE TRIGGER on_user_role_email_update
  AFTER UPDATE OF email ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sync_user_email();

-- Cascade deletes from public.user_roles to auth.users and other dependent tables
CREATE OR REPLACE FUNCTION public.handle_sync_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Set cases submitted_by to NULL so we don't violate foreign key constraint
  UPDATE public.cases
  SET submitted_by = NULL
  WHERE submitted_by = OLD.user_id;

  -- Delete from profiles to satisfy foreign key constraint
  DELETE FROM public.profiles WHERE id = OLD.user_id;

  -- Now delete from auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.user_id) THEN
    DELETE FROM auth.users WHERE id = OLD.user_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to delete auth user when role is deleted
CREATE OR REPLACE TRIGGER on_user_role_delete
  AFTER DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sync_user_delete();
