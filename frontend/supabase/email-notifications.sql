-- Sähköposti-ilmoitukset kun hakemuksen status muuttuu
-- Aja tämä Supabase SQL Editorissa

-- 1. Luo webhook-trigger funktio
CREATE OR REPLACE FUNCTION notify_application_status_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  -- Tarkista onko status muuttunut
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Luo payload webhook:lle
  payload := json_build_object(
    'type', 'UPDATE',
    'table', 'applications',
    'record', json_build_object(
      'id', NEW.id,
      'status', NEW.status,
      'contact_email', NEW.contact_email,
      'company_name', NEW.company_name,
      'reference_number', COALESCE(NEW.reference_number, 'JR-' || to_char(NEW.created_at, 'YYYY') || '-' || LPAD(NEW.id::text, 4, '0'))
    ),
    'old_record', json_build_object(
      'status', OLD.status
    )
  );

  -- Kutsu Edge Function (vaihtoehto: käytä pg_net extensiota)
  -- Tämä tallennetaan notification-tauluun ja Edge Function lähettää sähköpostin
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    reference_id,
    reference_type
  )
  SELECT 
    p.id,
    CASE NEW.status
      WHEN 'PROCESSING' THEN 'Hakemuksesi on käsittelyssä'
      WHEN 'OFFER_SENT' THEN 'Uusi tarjous saatavilla!'
      WHEN 'OFFER_ACCEPTED' THEN 'Tarjous hyväksytty'
      WHEN 'CONTRACT_SENT' THEN 'Sopimus allekirjoitettavana'
      WHEN 'SIGNED' THEN 'Sopimus allekirjoitettu'
      ELSE 'Hakemuksen tila päivitetty'
    END,
    CASE NEW.status
      WHEN 'PROCESSING' THEN 'Hakemuksesi on otettu käsittelyyn.'
      WHEN 'OFFER_SENT' THEN 'Olet saanut rahoitustarjouksen. Kirjaudu sisään nähdäksesi tarjouksen.'
      WHEN 'OFFER_ACCEPTED' THEN 'Tarjouksesi on hyväksytty. Sopimusprosessi käynnistyy pian.'
      WHEN 'CONTRACT_SENT' THEN 'Sopimus on valmis allekirjoitettavaksi.'
      WHEN 'SIGNED' THEN 'Onnittelut! Sopimus on allekirjoitettu.'
      ELSE 'Hakemuksesi tila on päivittynyt.'
    END,
    'APPLICATION_UPDATE',
    NEW.id,
    'APPLICATION'
  FROM profiles p
  WHERE p.email = NEW.contact_email;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Luo trigger
DROP TRIGGER IF EXISTS on_application_status_change ON applications;
CREATE TRIGGER on_application_status_change
  AFTER UPDATE OF status ON applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_application_status_change();

-- 3. Lisää reference_number sarake jos puuttuu
ALTER TABLE applications ADD COLUMN IF NOT EXISTS reference_number TEXT;

-- 4. Luo funktio joka generoi reference_number automaattisesti
CREATE OR REPLACE FUNCTION generate_reference_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.reference_number := 'JR-' || to_char(NOW(), 'YYYY') || '-' || LPAD((
    SELECT COUNT(*) + 1 FROM applications WHERE created_at >= date_trunc('year', NOW())
  )::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger reference_number generointiin
DROP TRIGGER IF EXISTS set_reference_number ON applications;
CREATE TRIGGER set_reference_number
  BEFORE INSERT ON applications
  FOR EACH ROW
  WHEN (NEW.reference_number IS NULL)
  EXECUTE FUNCTION generate_reference_number();

-- Valmis!
SELECT 'Email notifications configured!' as status;


