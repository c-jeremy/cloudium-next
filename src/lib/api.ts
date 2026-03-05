import type { CloudDriveData, UploadResult } from '@/types';

const BASE = '';

// ─── Token ────────────────────────────────────────────────────────────────────

export async function getToken(): Promise<string> {
    const res = await fetch(`${BASE}/api/token`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Token fetch failed');
    return data.token;
}

// ─── File URL ─────────────────────────────────────────────────────────────────

export async function getFileDownloadURL(fileKey: string): Promise<string> {
    const res = await fetch(`${BASE}/api/file-url?fileKey=${encodeURIComponent(fileKey)}&download=true`);
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error ?? 'No URL returned');
    return data.url;
}

export async function getStreamURL(fileKey: string): Promise<string> {
    const res = await fetch(`${BASE}/api/file-url?fileKey=${encodeURIComponent(fileKey)}&download=false`);
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error ?? 'No stream URL');
    return data.url;
}

// ─── Check user exists ────────────────────────────────────────────────────────

export async function checkUserExists(hash: string): Promise<boolean> {
    const res = await fetch(`${BASE}/api/file-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Check failed');
    return data.exists;
}

// ─── Drive data ───────────────────────────────────────────────────────────────

export async function fetchDriveData(key0: string): Promise<CloudDriveData> {
    const res = await fetch(`${BASE}/api/drive?key0=${encodeURIComponent(key0)}`);
    if (!res.ok) throw new Error(`Drive fetch failed: ${res.status}`);
    return res.json();
}

export async function syncDriveData(key0: string, driveData: CloudDriveData): Promise<void> {
    const res = await fetch(`${BASE}/api/drive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key0, driveData }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Sync failed');
    }
}

export async function loginCheck(key0: string): Promise<{ ok: boolean; reason?: string }> {
    const res = await fetch(`${BASE}/api/drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login-check', key0 }),
    });
    return res.json();
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadFile(
    file: Blob,
    fileKey: string,
    fileName: string,
    mimeType: string,
    onProgress?: (p: number) => void
): Promise<UploadResult> {
    return new Promise((resolve) => {
        const form = new FormData();
        form.append('file', file, fileName);
        form.append('fileKey', fileKey);
        form.append('fileName', fileName);
        form.append('mimeType', mimeType);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress(e.loaded / e.total);
            }
        };

        xhr.onload = () => {
            try {
                const data = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
                    resolve({ status: true, msg: '', fileKey });
                } else {
                    resolve({ status: false, msg: data.error ?? 'Upload failed' });
                }
            } catch {
                resolve({ status: false, msg: 'Upload response parse failed' });
            }
        };

        xhr.onerror = () => resolve({ status: false, msg: 'Network error' });
        xhr.send(form);
    });
}

// ─── Fetch file content ───────────────────────────────────────────────────────

export async function fetchFileContent(fileKey: string): Promise<string> {
    const url = await getFileDownloadURL(fileKey);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Content fetch failed');
    return res.text();
}
