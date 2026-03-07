
-- Add image_url column to maintenance_requests
ALTER TABLE public.maintenance_requests ADD COLUMN image_url text NULL;

-- Create storage bucket for maintenance images
INSERT INTO storage.buckets (id, name, public) VALUES ('maintenance-images', 'maintenance-images', true);

-- Allow authenticated users to upload to maintenance-images bucket
CREATE POLICY "Authenticated users can upload maintenance images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'maintenance-images');

-- Allow public read access
CREATE POLICY "Public can view maintenance images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'maintenance-images');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own maintenance images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'maintenance-images' AND (storage.foldername(name))[1] = auth.uid()::text);
