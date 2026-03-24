
-- Create ai-generated storage bucket for AI image generation
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ai-generated', 'ai-generated', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to ai-generated bucket
CREATE POLICY "Authenticated users can upload ai images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ai-generated');

-- Allow public read access
CREATE POLICY "Public read access for ai images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'ai-generated');
