import type { CloudItem, CloudDriveData, PreviewType, SortOption } from '@/types';
import SparkMD5 from 'spark-md5';

// ─── ID generation ────────────────────────────────────────────────────────────

export function generateRandomID(length: number = 24): string {
    const chars = 'abcdef0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function hashFileMD5(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = (e) => {
            if (e.target?.result instanceof ArrayBuffer) {
                const md5 = new SparkMD5.ArrayBuffer();
                md5.append(e.target.result);
                resolve(md5.end());
            } else {
                reject(new Error('Failed to read file as ArrayBuffer'));
            }
        };
        reader.onerror = (e) => reject(e);
    });
}

// ─── Size formatting ──────────────────────────────────────────────────────────

export function normalizeDriveData(data: any): CloudDriveData {
    if (!data || !Array.isArray(data.items)) return data;
    return {
        ...data,
        items: data.items.map((item: any) => ({
            ...item,
            parentID: item.parentID === undefined ? null : item.parentID,
            fileKey: item.fileKey === undefined ? null : item.fileKey,
            isMultipart: item.isMultipart === undefined ? false : item.isMultipart
        }))
    };
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ─── Date formatting ──────────────────────────────────────────────────────────

export function formatDate(isoString: string): string {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function nowISO(): string {
    return new Date().toISOString();
}

// ─── File type utilities ──────────────────────────────────────────────────────

export function getExtension(name: string): string {
    const parts = name.split('.');
    if (parts.length < 2) return '';
    return parts[parts.length - 1].toLowerCase();
}

export function getPreviewType(item: CloudItem): PreviewType {
    if (item.isMultipart || item.isFolder) return 'unknown';
    const ext = getExtension(item.name);
    if (['jpg', 'jpeg', 'png', 'gif', 'heic', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].includes(ext)) return 'audio';
    if (ext === 'pdf') return 'pdf';
    if (['txt', 'md', 'rtf', 'swift', 'js', 'ts', 'py', 'java', 'html', 'css', 'json', 'xml'].includes(ext)) return 'text';
    if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) return 'office';
    return 'unknown';
}

export function isPreviewable(item: CloudItem): boolean {
    if (item.isMultipart) return false;
    return getPreviewType(item) !== 'unknown';
}

export function hasThumbnail(item: CloudItem): boolean {
    if (item.isFolder || item.isMultipart || !item.fileKey) return false;
    return ['jpg', 'jpeg', 'png', 'gif', 'heic', 'webp', 'bmp'].includes(getExtension(item.name));
}

export function getFileIcon(item: CloudItem): string {
    if (item.isFolder) return 'folder';
    const ext = item.isMultipart
        ? getExtension(item.name)
        : getExtension(item.name);
    return iconForExt(ext);
}

function iconForExt(ext: string): string {
    if (['jpg', 'jpeg', 'png', 'gif', 'heic', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].includes(ext)) return 'music';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'doc';
    if (['ppt', 'pptx'].includes(ext)) return 'ppt';
    if (['xls', 'xlsx'].includes(ext)) return 'xls';
    if (['txt', 'md', 'rtf'].includes(ext)) return 'text';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
    if (['swift', 'js', 'ts', 'py', 'java', 'html', 'css', 'json', 'xml'].includes(ext)) return 'code';
    return 'file';
}

export function getFileColor(item: CloudItem): string {
    if (item.isFolder) return '#667eea';
    const ext = getExtension(item.name);
    if (['jpg', 'jpeg', 'png', 'gif', 'heic', 'webp', 'bmp', 'svg'].includes(ext)) return '#f59e0b';
    if (['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm'].includes(ext)) return '#ef4444';
    if (['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].includes(ext)) return '#ec4899';
    if (ext === 'pdf') return '#ef4444';
    if (['doc', 'docx'].includes(ext)) return '#3b82f6';
    if (['ppt', 'pptx'].includes(ext)) return '#f59e0b';
    if (['xls', 'xlsx'].includes(ext)) return '#22c55e';
    if (['txt', 'md', 'rtf'].includes(ext)) return '#6b7280';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '#92400e';
    return '#6b7280';
}

// ─── CloudDriveData pure mutations ───────────────────────────────────────────

export function driveAddItem(data: CloudDriveData, item: CloudItem): CloudDriveData {
    return { ...data, items: [...data.items, item], lastModified: nowISO() };
}

export function driveRemoveItem(data: CloudDriveData, id: string): CloudDriveData {
    const idsToRemove = new Set<string>([id]);
    // collect descendants
    const queue = [id];
    while (queue.length > 0) {
        const curr = queue.shift()!;
        for (const item of data.items) {
            if (item.parentID === curr) {
                idsToRemove.add(item.id);
                if (item.isFolder) queue.push(item.id);
            }
        }
    }
    return { ...data, items: data.items.filter(i => !idsToRemove.has(i.id)), lastModified: nowISO() };
}

export function driveRemoveItems(data: CloudDriveData, ids: string[]): CloudDriveData {
    let d = data;
    for (const id of ids) d = driveRemoveItem(d, id);
    return d;
}

export function driveRenameItem(data: CloudDriveData, id: string, newName: string): CloudDriveData {
    return {
        ...data,
        items: data.items.map(i => i.id === id ? { ...i, name: newName, modifiedAt: nowISO() } : i),
        lastModified: nowISO(),
    };
}

export function driveToggleFavorite(data: CloudDriveData, id: string): CloudDriveData {
    return {
        ...data,
        items: data.items.map(i => i.id === id ? { ...i, isFavorite: !i.isFavorite } : i),
        lastModified: nowISO(),
    };
}

export function driveMoveItems(data: CloudDriveData, ids: string[], toParentID: string | null): CloudDriveData {
    return {
        ...data,
        items: data.items.map(i => ids.includes(i.id) ? { ...i, parentID: toParentID, modifiedAt: nowISO() } : i),
        lastModified: nowISO(),
    };
}

export function driveItemsInFolder(data: CloudDriveData, parentID: string | null): CloudItem[] {
    return data.items.filter(i => i.parentID === parentID);
}

export function driveFolders(data: CloudDriveData): CloudItem[] {
    return data.items.filter(i => i.isFolder);
}

export function driveFoldersInFolder(data: CloudDriveData, parentID: string | null): CloudItem[] {
    return data.items.filter(i => i.isFolder && i.parentID === parentID);
}

export function driveIsDescendant(data: CloudDriveData, folderID: string, ancestorID: string): boolean {
    let current: string | null = folderID;
    while (current !== null) {
        if (current === ancestorID) return true;
        current = data.items.find(i => i.id === current)?.parentID ?? null;
    }
    return false;
}

export function driveTotalUsed(data: CloudDriveData): number {
    return data.items.filter(i => !i.isFolder).reduce((s, i) => s + i.size, 0);
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

export function sortItems(items: CloudItem[], option: SortOption): CloudItem[] {
    const folders = items.filter(i => i.isFolder);
    const files = items.filter(i => !i.isFolder);

    function sortArr(arr: CloudItem[]): CloudItem[] {
        switch (option) {
            case 'nameAsc': return [...arr].sort((a, b) => a.name.localeCompare(b.name));
            case 'nameDesc': return [...arr].sort((a, b) => b.name.localeCompare(a.name));
            case 'dateNewest': return [...arr].sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
            case 'dateOldest': return [...arr].sort((a, b) => new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime());
            case 'sizeSmallest': return [...arr].sort((a, b) => a.size - b.size);
            case 'sizeLargest': return [...arr].sort((a, b) => b.size - a.size);
            case 'typeAsc': return [...arr].sort((a, b) => getExtension(a.name).localeCompare(getExtension(b.name)));
            default: return arr;
        }
    }

    return [...sortArr(folders), ...sortArr(files)];
}

// ─── New item factories ───────────────────────────────────────────────────────

export function newFolder(name: string, parentID: string | null): CloudItem {
    const now = nowISO();
    return {
        id: generateRandomID(),
        name,
        isFolder: true,
        mimeType: '',
        size: 0,
        parentID,
        createdAt: now,
        modifiedAt: now,
        isFavorite: false,
        sortIndex: 0,
        fileKey: null,
        isMultipart: false,
    };
}

export function newFile(
    name: string,
    mimeType: string,
    size: number,
    parentID: string | null,
    fileKey: string,
    isMultipart = false
): CloudItem {
    const now = nowISO();
    return {
        id: generateRandomID(),
        name,
        isFolder: false,
        mimeType,
        size,
        parentID,
        createdAt: now,
        modifiedAt: now,
        isFavorite: false,
        sortIndex: 0,
        fileKey,
        isMultipart,
    };
}
