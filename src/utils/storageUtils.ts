/**
 * Storage utility functions for handling private bucket files
 */

import { supabase } from '@/integrations/supabase/client';

type BucketName = 'pod-files' | 'order-documents';

/**
 * Get a signed URL for a file in a private bucket
 * @param bucket - The storage bucket name
 * @param filePath - The file path within the bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns The signed URL or null if error
 */
export async function getSignedUrl(
  bucket: BucketName,
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    // Check if the path is already a full URL (legacy data)
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return data?.signedUrl || null;
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }
}

/**
 * Get signed URLs for multiple files
 * @param bucket - The storage bucket name
 * @param filePaths - Array of file paths
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Array of signed URLs (null values filtered out)
 */
export async function getSignedUrls(
  bucket: BucketName,
  filePaths: string[],
  expiresIn: number = 3600
): Promise<string[]> {
  const urls = await Promise.all(
    filePaths.map(path => getSignedUrl(bucket, path, expiresIn))
  );
  return urls.filter((url): url is string => url !== null);
}

/**
 * Download a file from a private bucket
 * @param bucket - The storage bucket name
 * @param filePath - The file path within the bucket
 * @returns Blob of the file or null if error
 */
export async function downloadFile(
  bucket: BucketName,
  filePath: string
): Promise<Blob | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error downloading file:', error);
    return null;
  }
}

/**
 * Delete a file from a bucket
 * @param bucket - The storage bucket name
 * @param filePath - The file path within the bucket
 * @returns true if successful, false otherwise
 */
export async function deleteFile(
  bucket: BucketName,
  filePath: string
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * List files in a bucket folder
 * @param bucket - The storage bucket name
 * @param folderPath - The folder path within the bucket
 * @returns Array of file objects or empty array if error
 */
export async function listFiles(
  bucket: BucketName,
  folderPath: string
): Promise<{ name: string; id: string; updated_at: string; created_at: string; metadata: Record<string, unknown> }[]> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folderPath);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
}
