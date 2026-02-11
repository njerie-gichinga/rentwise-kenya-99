
-- Allow landlords to view profiles of tenants assigned to their properties
CREATE POLICY "Landlords can view tenant profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.properties p ON u.property_id = p.id
    WHERE u.tenant_id = profiles.user_id
    AND p.landlord_id = auth.uid()
  )
);
