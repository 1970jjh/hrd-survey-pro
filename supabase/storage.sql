-- HRD Survey Pro - Storage Buckets Setup
-- Version: 1.0
-- Run this in Supabase SQL Editor after creating the project

-- =============================================
-- Create Storage Buckets
-- =============================================

-- QR 코드 이미지 버킷 (공개)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'qr-codes',
    'qr-codes',
    true,
    1048576, -- 1MB
    ARRAY['image/png', 'image/svg+xml']
);

-- PDF 리포트 버킷 (비공개)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'reports',
    'reports',
    false,
    10485760, -- 10MB
    ARRAY['application/pdf']
);

-- =============================================
-- Storage Policies
-- =============================================

-- QR 코드 버킷 정책
CREATE POLICY "Authenticated users can upload QR codes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'qr-codes');

CREATE POLICY "Anyone can view QR codes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'qr-codes');

CREATE POLICY "Authenticated users can delete own QR codes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'qr-codes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- PDF 리포트 버킷 정책
CREATE POLICY "Authenticated users can upload reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own reports"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);
