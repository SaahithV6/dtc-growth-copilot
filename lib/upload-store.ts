import { randomUUID } from "node:crypto";

export interface StoredUpload {
  dataUrl: string;
  contentType: string;
  createdAt: number;
}

const uploadStore = new Map<string, StoredUpload>();
const TTL_MS = 1000 * 60 * 60;

function cleanupExpiredUploads() {
  const now = Date.now();
  for (const [id, item] of uploadStore.entries()) {
    if (now - item.createdAt > TTL_MS) {
      uploadStore.delete(id);
    }
  }
}

export function saveUpload(dataUrl: string, contentType: string): string {
  cleanupExpiredUploads();
  const id = randomUUID();
  uploadStore.set(id, {
    dataUrl,
    contentType,
    createdAt: Date.now(),
  });
  return id;
}

export function getUpload(id: string): StoredUpload | undefined {
  cleanupExpiredUploads();
  return uploadStore.get(id);
}
