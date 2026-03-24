import { useState, useEffect, useCallback, useRef } from 'react';
import { useDriverDocumentUpload, DocumentType } from '@/hooks/useDriverDocumentUpload';
import { toast } from 'sonner';

const DB_NAME = 'driver_onboarding_offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending_uploads';

export interface PendingUpload {
  id: string;
  file: File;
  docType: DocumentType;
  previewUrl: string;
  queuedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const useOnboardingOffline = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const { uploadDocument } = useDriverDocumentUpload();
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const countReq = store.count();
      countReq.onsuccess = () => setPendingCount(countReq.result);
      db.close();
    } catch {
      // IndexedDB not available
    }
  }, []);

  const queueUpload = useCallback(async (file: File, docType: DocumentType): Promise<string> => {
    const id = `${docType}_${Date.now()}`;
    const previewUrl = URL.createObjectURL(file);
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ id, file, docType, previewUrl, queuedAt: Date.now() } as PendingUpload);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
      await refreshCount();
    } catch (err) {
      console.error('Failed to queue upload:', err);
    }
    return previewUrl;
  }, [refreshCount]);

  const getAllPending = useCallback(async (): Promise<PendingUpload[]> => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      return new Promise((resolve, reject) => {
        req.onsuccess = () => { db.close(); resolve(req.result); };
        req.onerror = () => { db.close(); reject(req.error); };
      });
    } catch {
      return [];
    }
  }, []);

  const removePending = useCallback(async (id: string) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
      await refreshCount();
    } catch {
      // ignore
    }
  }, [refreshCount]);

  const syncPendingUploads = useCallback(async (): Promise<Record<string, { url: string; docType: DocumentType }>> => {
    if (syncingRef.current || !navigator.onLine) return {};
    syncingRef.current = true;
    setIsSyncing(true);

    const results: Record<string, { url: string; docType: DocumentType }> = {};
    const pending = await getAllPending();
    if (pending.length === 0) {
      setIsSyncing(false);
      syncingRef.current = false;
      return results;
    }

    setSyncProgress({ current: 0, total: pending.length });

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      setSyncProgress({ current: i + 1, total: pending.length });
      try {
        const result = await uploadDocument(item.file, item.docType, { triggerAIAnalysis: true });
        if (result.success) {
          results[item.docType] = { url: result.fileUrl || item.previewUrl, docType: item.docType };
          await removePending(item.id);
        }
      } catch (err) {
        console.error('Sync upload failed for', item.docType, err);
      }
    }

    await refreshCount();
    setIsSyncing(false);
    syncingRef.current = false;

    const syncedCount = Object.keys(results).length;
    if (syncedCount > 0) {
      toast.success(`${syncedCount} document${syncedCount > 1 ? 'en' : ''} gesynchroniseerd`);
    }

    return results;
  }, [getAllPending, removePending, uploadDocument, refreshCount]);

  const clearAll = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
      setPendingCount(0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      syncPendingUploads();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncPendingUploads]);

  return {
    pendingCount,
    isSyncing,
    syncProgress,
    queueUpload,
    syncPendingUploads,
    getAllPending,
    clearAll,
  };
};
