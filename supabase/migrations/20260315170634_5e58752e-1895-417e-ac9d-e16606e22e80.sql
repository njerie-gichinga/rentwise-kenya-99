
CREATE OR REPLACE FUNCTION public.delete_landlord_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  -- Delete maintenance requests for landlord's units
  DELETE FROM public.maintenance_requests
  WHERE unit_id IN (
    SELECT u.id FROM public.units u
    JOIN public.properties p ON u.property_id = p.id
    WHERE p.landlord_id = _uid
  );

  -- Delete payments for landlord's units
  DELETE FROM public.payments
  WHERE unit_id IN (
    SELECT u.id FROM public.units u
    JOIN public.properties p ON u.property_id = p.id
    WHERE p.landlord_id = _uid
  );

  -- Delete tenant invitations
  DELETE FROM public.tenant_invitations WHERE landlord_id = _uid;

  -- Delete notifications
  DELETE FROM public.notifications WHERE user_id = _uid;

  -- Delete units for landlord's properties
  DELETE FROM public.units
  WHERE property_id IN (
    SELECT id FROM public.properties WHERE landlord_id = _uid
  );

  -- Delete properties
  DELETE FROM public.properties WHERE landlord_id = _uid;

  -- Delete profile
  DELETE FROM public.profiles WHERE user_id = _uid;

  -- Delete user roles
  DELETE FROM public.user_roles WHERE user_id = _uid;

  -- Delete auth user (this will end the session)
  DELETE FROM auth.users WHERE id = _uid;
END;
$$;
