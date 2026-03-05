'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { TransferTask, TransferStatus, CloudItem } from '@/types';
import { generateRandomID, hashFileMD5 } from '@/lib/utils';
import { uploadFile, getFileDownloadURL } from '@/lib/api';

interface TransferContextType {
    uploads: TransferTask[];
    downloads: TransferTask[];
    addUpload: (
        fileName: string,
        fileSize: number,
        file: Blob,
        mimeType: string,
        parentID: string | null,
        onComplete: (success: boolean, fileKey: string) => void
    ) => void;
    addDownload: (item: CloudItem) => void;
    pauseTask: (id: string, isUpload: boolean) => void;
    resumeTask: (id: string, isUpload: boolean) => void;
    cancelTask: (id: string, isUpload: boolean) => void;
    retryTask: (id: string, isUpload: boolean) => void;
    clearCompleted: () => void;
}

const TransferContext = createContext<TransferContextType | null>(null);

// Store for retry info (file data etc.)
const uploadCache: Record<string, {
    file: Blob; fileName: string; fileSize: number;
    mimeType: string; parentID: string | null;
    onComplete: (ok: boolean, fileKey: string) => void;
}> = {};

const downloadCache: Record<string, CloudItem> = {};
const cancelledSet = new Set<string>();

export function TransferProvider({ children }: { children: React.ReactNode }) {
    const [uploads, setUploads] = useState<TransferTask[]>([]);
    const [downloads, setDownloads] = useState<TransferTask[]>([]);

    // ─── Upload helpers ─────────────────────────────────────────────────────────

    function updateUpload(id: string, patch: Partial<TransferTask>) {
        setUploads(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    }

    function updateDownload(id: string, patch: Partial<TransferTask>) {
        setDownloads(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    }

    const startUpload = useCallback(async (taskID: string) => {
        const info = uploadCache[taskID];
        if (!info) return;

        cancelledSet.delete(taskID);
        updateUpload(taskID, { status: 'inProgress' });

        try {
            const useActualMD5 = typeof window !== 'undefined' ? localStorage.getItem('cloudium_useActualMD5') === 'true' : false;
            let fileKey = '';
            if (useActualMD5) {
                fileKey = await hashFileMD5(info.file);
            } else {
                fileKey = generateRandomID(32);
            }

            uploadFile(
                info.file,
                fileKey,
                info.fileName,
                info.mimeType,
                (p) => {
                    if (!cancelledSet.has(taskID)) {
                        updateUpload(taskID, { progress: p });
                    }
                }
            ).then(result => {
                if (cancelledSet.has(taskID)) return;
                if (result.status) {
                    updateUpload(taskID, { status: 'completed', progress: 1 });
                    info.onComplete(true, fileKey);
                } else {
                    updateUpload(taskID, { status: 'failed', error: result.msg });
                    info.onComplete(false, '');
                }
            }).catch(e => {
                if (!cancelledSet.has(taskID)) {
                    updateUpload(taskID, { status: 'failed', error: String(e) });
                    info.onComplete(false, '');
                }
            }).catch(e => {
                if (!cancelledSet.has(taskID)) {
                    updateUpload(taskID, { status: 'failed', error: String(e) });
                    info.onComplete(false, '');
                }
            });
        } catch (hashErr) {
            updateUpload(taskID, { status: 'failed', error: 'Hashing failed' });
            info.onComplete(false, '');
        }
    }, []);

    const addUpload = useCallback((
        fileName: string,
        fileSize: number,
        file: Blob,
        mimeType: string,
        parentID: string | null,
        onComplete: (ok: boolean, fileKey: string) => void
    ) => {
        const taskID = generateRandomID();
        const task: TransferTask = {
            id: taskID, fileName, fileSize, progress: 0,
            status: 'waiting', isUpload: true, createdAt: new Date(),
            isMultipart: false,
        };
        uploadCache[taskID] = { file, fileName, fileSize, mimeType, parentID, onComplete };
        setUploads(prev => [task, ...prev]);
        startUpload(taskID);
    }, [startUpload]);

    // ─── Download helpers ───────────────────────────────────────────────────────

    const startDownload = useCallback((taskID: string) => {
        const item = downloadCache[taskID];
        if (!item || !item.fileKey) return;

        cancelledSet.delete(taskID);
        updateDownload(taskID, { status: 'inProgress' });

        getFileDownloadURL(item.fileKey).then(url => {
            if (cancelledSet.has(taskID)) return;

            const xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.responseType = 'blob';

            xhr.onprogress = (e) => {
                if (e.lengthComputable && !cancelledSet.has(taskID)) {
                    updateDownload(taskID, { progress: e.loaded / e.total });
                }
            };

            xhr.onload = () => {
                if (cancelledSet.has(taskID)) return;
                if (xhr.status >= 200 && xhr.status < 300) {
                    // Trigger browser download
                    const blob = xhr.response as Blob;
                    const blobURL = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobURL;
                    a.download = item.name;
                    a.rel = 'noopener noreferrer';
                    a.target = '_blank';
                    a.click();
                    URL.revokeObjectURL(blobURL);
                    updateDownload(taskID, { status: 'completed', progress: 1 });
                } else {
                    updateDownload(taskID, { status: 'failed', error: `HTTP ${xhr.status}` });
                }
            };

            xhr.onerror = () => {
                if (!cancelledSet.has(taskID)) {
                    updateDownload(taskID, { status: 'failed', error: 'Network error' });
                }
            };

            xhr.send();
        }).catch(e => {
            if (!cancelledSet.has(taskID)) {
                updateDownload(taskID, { status: 'failed', error: String(e) });
            }
        });
    }, []);

    const addDownload = useCallback((item: CloudItem) => {
        if (!item.fileKey) return;
        const taskID = generateRandomID();
        const task: TransferTask = {
            id: taskID, fileName: item.name, fileSize: item.size, progress: 0,
            status: 'waiting', isUpload: false, createdAt: new Date(),
            isMultipart: item.isMultipart,
        };
        downloadCache[taskID] = item;
        setDownloads(prev => [task, ...prev]);
        startDownload(taskID);
    }, [startDownload]);

    // ─── Task controls ──────────────────────────────────────────────────────────

    const pauseTask = useCallback((id: string, isUpload: boolean) => {
        cancelledSet.add(id);
        if (isUpload) updateUpload(id, { status: 'paused' });
        else updateDownload(id, { status: 'paused' });
    }, []);

    const resumeTask = useCallback((id: string, isUpload: boolean) => {
        if (isUpload) {
            updateUpload(id, { status: 'waiting', progress: 0, error: undefined });
            startUpload(id);
        } else {
            updateDownload(id, { status: 'waiting', progress: 0, error: undefined });
            startDownload(id);
        }
    }, [startUpload, startDownload]);

    const cancelTask = useCallback((id: string, isUpload: boolean) => {
        cancelledSet.add(id);
        if (isUpload) updateUpload(id, { status: 'cancelled' });
        else updateDownload(id, { status: 'cancelled' });
    }, []);

    const retryTask = useCallback((id: string, isUpload: boolean) => {
        if (isUpload) {
            updateUpload(id, { status: 'waiting', progress: 0, error: undefined });
            startUpload(id);
        } else {
            updateDownload(id, { status: 'waiting', progress: 0, error: undefined });
            startDownload(id);
        }
    }, [startUpload, startDownload]);

    const clearCompleted = useCallback(() => {
        setUploads(prev => prev.filter(t => t.status !== 'completed' && t.status !== 'cancelled'));
        setDownloads(prev => prev.filter(t => t.status !== 'completed' && t.status !== 'cancelled'));
    }, []);

    return (
        <TransferContext.Provider value={{
            uploads, downloads,
            addUpload, addDownload,
            pauseTask, resumeTask, cancelTask, retryTask,
            clearCompleted,
        }}>
            {children}
        </TransferContext.Provider>
    );
}

export function useTransfer() {
    const ctx = useContext(TransferContext);
    if (!ctx) throw new Error('useTransfer must be used within TransferProvider');
    return ctx;
}
