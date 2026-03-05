// ─────────────────────────────────────
// Cloud Item & Drive Data
// ─────────────────────────────────────

export interface CloudItem {
  id: string;
  name: string;
  isFolder: boolean;
  mimeType: string;
  size: number; // bytes
  parentID: string | null;
  createdAt: string; // ISO 8601
  modifiedAt: string;
  isFavorite: boolean;
  sortIndex: number;
  fileKey: string | null;
  isMultipart: boolean;
}

export interface CloudDriveData {
  items: CloudItem[];
  lastModified: string;
  version: number;
}

// ─────────────────────────────────────
// Preview
// ─────────────────────────────────────

export type PreviewType = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'office' | 'unknown';

// ─────────────────────────────────────
// Sorting & View
// ─────────────────────────────────────

export type SortOption =
  | 'nameAsc'
  | 'nameDesc'
  | 'dateNewest'
  | 'dateOldest'
  | 'sizeSmallest'
  | 'sizeLargest'
  | 'typeAsc';

export const SORT_LABELS: Record<SortOption, string> = {
  nameAsc: 'Name A→Z',
  nameDesc: 'Name Z→A',
  dateNewest: 'Newest First',
  dateOldest: 'Oldest First',
  sizeSmallest: 'Smallest First',
  sizeLargest: 'Largest First',
  typeAsc: 'Type',
};

export type ViewMode = 'list' | 'grid';

// ─────────────────────────────────────
// Transfers
// ─────────────────────────────────────

export type TransferStatus =
  | 'waiting'
  | 'inProgress'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled';

export interface TransferTask {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number; // 0.0 – 1.0
  status: TransferStatus;
  isUpload: boolean;
  error?: string;
  createdAt: Date;
  isMultipart: boolean;
  multipartInfo?: string;
}

// ─────────────────────────────────────
// Link Codec
// ─────────────────────────────────────

export interface CloudiumLink {
  fileKey: string;
  fileSize: number;
}

// ─────────────────────────────────────
// API Responses
// ─────────────────────────────────────

export interface PolicyResponse {
  host: string;
  object_key: string;
  access_key_id: string;
  policy: string;
  signature: string;
  expire: string;
  callback: string;
}

export interface UploadResult {
  status: boolean;
  msg: string;
  fileKey?: string;
}
