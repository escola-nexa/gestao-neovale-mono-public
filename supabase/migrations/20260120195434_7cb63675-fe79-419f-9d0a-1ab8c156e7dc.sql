-- Add CLOSED status to calendar_status enum
ALTER TYPE calendar_status ADD VALUE IF NOT EXISTS 'CLOSED';

-- Create a trigger function to ensure only one active calendar per organization
CREATE OR REPLACE FUNCTION enforce_single_active_calendar()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a calendar to ACTIVE, deactivate all other calendars for the same org
  IF NEW.status = 'ACTIVE' THEN
    UPDATE academic_calendars 
    SET status = 'INACTIVE'
    WHERE organization_id = NEW.organization_id 
      AND id != NEW.id 
      AND status = 'ACTIVE';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for single active calendar
DROP TRIGGER IF EXISTS trigger_enforce_single_active_calendar ON academic_calendars;
CREATE TRIGGER trigger_enforce_single_active_calendar
  BEFORE INSERT OR UPDATE ON academic_calendars
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_active_calendar();

-- Create a function to validate new calendar creation
-- New calendars can only be created if there's no ACTIVE calendar (must be CLOSED first)
CREATE OR REPLACE FUNCTION validate_new_calendar_creation()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  -- Only check on INSERT (new calendar creation)
  IF TG_OP = 'INSERT' THEN
    -- Check if there's an active calendar that's not closed
    SELECT COUNT(*) INTO active_count
    FROM academic_calendars
    WHERE organization_id = NEW.organization_id
      AND status = 'ACTIVE';
    
    -- If there's an active calendar and the new one is being created as INACTIVE (draft)
    -- that's fine. But we should warn if trying to create as ACTIVE
    IF active_count > 0 AND NEW.status = 'ACTIVE' THEN
      RAISE EXCEPTION 'Já existe um calendário ativo. Encerre-o antes de ativar um novo.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new calendar validation
DROP TRIGGER IF EXISTS trigger_validate_new_calendar ON academic_calendars;
CREATE TRIGGER trigger_validate_new_calendar
  BEFORE INSERT ON academic_calendars
  FOR EACH ROW
  EXECUTE FUNCTION validate_new_calendar_creation();

-- Create a function to prevent reopening a CLOSED calendar
CREATE OR REPLACE FUNCTION prevent_reopen_closed_calendar()
RETURNS TRIGGER AS $$
BEGIN
  -- If trying to change from CLOSED to another status, prevent it
  IF OLD.status = 'CLOSED' AND NEW.status != 'CLOSED' THEN
    RAISE EXCEPTION 'Não é possível reabrir um calendário encerrado.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to prevent reopening closed calendars
DROP TRIGGER IF EXISTS trigger_prevent_reopen_closed ON academic_calendars;
CREATE TRIGGER trigger_prevent_reopen_closed
  BEFORE UPDATE ON academic_calendars
  FOR EACH ROW
  EXECUTE FUNCTION prevent_reopen_closed_calendar();