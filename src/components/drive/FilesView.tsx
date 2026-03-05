'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from '@/context/SessionContext';
import { useTransfer } from '@/context/TransferContext';
import { useI18n } from '@/context/I18nContext';
import { useToast } from '@/components/Toast';
import type { CloudItem, SortOption, ViewMode } from '@/types';
import FileRow from './FileRow';
import {
    driveItemsInFolder, driveFoldersInFolder, sortItems, getFileIcon, getFileColor, formatBytes, formatDate,
    newFolder, driveAddItem, driveRemoveItem, driveRenameItem, driveToggleFavorite, driveMoveItems
} from '@/lib/utils';
import {
    FolderIcon, FileIcon, FileImage, FileVideo, FileAudio, FileText, Code, Archive,
    Search, Plus, Upload, FolderPlus, Download, Edit2, Trash2, Star, Link2, Copy, CopyIcon
} from 'lucide-react';
import { encode, extractFileKey, decode } from '@/lib/linkCodec';
import { getFileDownloadURL } from '@/lib/api';
import styles from './Files.module.css';

export default function FilesView() {
    const { driveData, updateAndSync } = useSession();
    const { addUpload, addDownload } = useTransfer();
    const { t } = useI18n();
    const { showSuccess, showError } = useToast();

    const [currentFolderID, setCurrentFolderID] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    // Settings
    const viewMode = (typeof window !== 'undefined' ? localStorage.getItem('cloudium_viewMode') as ViewMode : 'list') || 'list';
    const sortOption = (typeof window !== 'undefined' ? localStorage.getItem('cloudium_sortOption') as SortOption : 'dateNewest') || 'dateNewest';

    // FAB
    const [fabOpen, setFabOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modals
    const [newFolderOpen, setNewFolderOpen] = useState(false);
    const [folderName, setFolderName] = useState('');

    const [renameOpen, setRenameOpen] = useState(false);
    const [renameItem, setRenameItem] = useState<CloudItem | null>(null);
    const [newName, setNewName] = useState('');

    const [importOpen, setImportOpen] = useState(false);
    const [importLink, setImportLink] = useState('');

    const [moveOpen, setMoveOpen] = useState(false);
    const [moveItem, setMoveItem] = useState<CloudItem | null>(null);
    const [targetFolderID, setTargetFolderID] = useState<string | null>(null);

    // Context Menu
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: CloudItem } | null>(null);

    // Breadcrumbs
    const getBreadcrumbs = () => {
        const crumbs: { id: string | null; name: string }[] = [{ id: null, name: t('files') }];
        let curr = currentFolderID;
        const parts = [];
        while (curr) {
            const folder = driveData.items.find(i => i.id === curr);
            if (folder) {
                parts.unshift({ id: folder.id, name: folder.name });
                curr = folder.parentID;
            } else {
                break;
            }
        }
        return [...crumbs, ...parts];
    };

    // Click outside to close menus
    useEffect(() => {
        const handleClick = () => {
            setFabOpen(false);
            setContextMenu(null);
        };
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // Filter & Sort
    let items = driveItemsInFolder(driveData, currentFolderID);

    if (searchQuery.trim()) {
        items = driveData.items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    items = sortItems(items, sortOption);

    // --- Actions ---

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!folderName.trim()) return;
        const folder = newFolder(folderName.trim(), currentFolderID);
        setNewFolderOpen(false);
        setFolderName('');
        await updateAndSync(d => driveAddItem(d, folder));
        showSuccess('Folder created');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        Array.from(e.target.files).forEach(file => {
            uploadSingleFile(file);
        });
        setFabOpen(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const uploadSingleFile = (file: File) => {
        showSuccess('Upload started');
        addUpload(file.name, file.size, file, file.type, currentFolderID, async (ok, key) => {
            if (ok) {
                const { newFile } = await import('@/lib/utils');
                const item = newFile(file.name, file.type, file.size, currentFolderID, key, false);
                await updateAndSync(d => driveAddItem(d, item));
                showSuccess('Upload complete');
            } else {
                showError('Upload failed');
            }
        });
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            Array.from(e.dataTransfer.files).forEach(file => {
                uploadSingleFile(file);
            });
        }
    };

    const handleDelete = async (item: CloudItem) => {
        if (window.confirm(t('deleteConfirmMessage', { name: item.name }))) {
            await updateAndSync(d => driveRemoveItem(d, item.id));
            showSuccess(t('delete') + ' success');
        }
    };

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!renameItem || !newName.trim()) return;
        const targetId = renameItem.id;
        const targetName = newName.trim();
        setRenameOpen(false);
        setRenameItem(null);
        await updateAndSync(d => driveRenameItem(d, targetId, targetName));
    };

    const handleMove = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!moveItem) return;
        const targetId = moveItem.id;
        const newParentId = targetFolderID;
        setMoveOpen(false);
        setMoveItem(null);
        await updateAndSync(d => driveMoveItems(d, [targetId], newParentId));
        showSuccess('Item moved');
    };

    const handleToggleFavorite = async (item: CloudItem) => {
        await updateAndSync(d => driveToggleFavorite(d, item.id));
    };

    const handleImportLocal = async (e: React.FormEvent) => {
        e.preventDefault();
        const fileKey = extractFileKey(importLink);
        if (!fileKey) {
            showError(t('invalidLink'));
            return;
        }

        try {
            const urlString = await getFileDownloadURL(fileKey);
            const url = new URL(urlString);
            let fileName = 'imported_file';
            let isMultipart = false;

            const disposition = url.searchParams.get('response-content-disposition');
            if (disposition) {
                const utf8Match = disposition.match(/filename\*\s*=\s*(?:utf-8|UTF-8)''([^;&]+)/);
                if (utf8Match) {
                    fileName = decodeURIComponent(utf8Match[1]);
                } else {
                    const quoteMatch = disposition.match(/filename\s*=\s*"([^"]+)"/);
                    if (quoteMatch) {
                        fileName = quoteMatch[1];
                    }
                }
            } else {
                const pathName = url.pathname.split('/').pop();
                if (pathName && pathName !== '/') fileName = decodeURIComponent(pathName);
            }

            if (fileName.endsWith('.multipart')) {
                isMultipart = true;
                fileName = fileName.slice(0, -'.multipart'.length);
            }

            const linkData = decode(importLink);
            const fileSize = linkData?.fileSize || 0;

            const { newFile } = await import('@/lib/utils');
            const item = newFile(fileName, 'application/octet-stream', fileSize, currentFolderID, fileKey, isMultipart);
            setImportOpen(false);
            setImportLink('');
            await updateAndSync(d => driveAddItem(d, item));
            showSuccess('File imported');
        } catch (err: any) {
            showError('Failed to fetch file info: ' + (err.message || 'Error'));
        }
    };

    const handleCopyLink = (item: CloudItem) => {
        if (!item.fileKey) return;
        const link = encode(item.fileKey, item.size);
        navigator.clipboard.writeText(link);
        showSuccess(t('linkCopied'));
    };

    const openContextMenu = (e: React.MouseEvent, item: CloudItem) => {
        e.preventDefault();
        e.stopPropagation();

        // Calculate positioning to avoid overflow
        let x = e.clientX;
        let y = e.clientY;
        const menuWidth = 200;
        const menuHeight = 250;

        if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
        if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;

        setContextMenu({ x, y, item });
    };

    const handleItemClick = (item: CloudItem) => {
        if (item.isFolder) {
            setCurrentFolderID(item.id);
            setSearchQuery('');
        } else {
            // In full app, we would preview. Here we open the file URL or download.
            // Ensure noopener noreferrer is present for downloading/previewing.
            getFileDownloadURL(item.fileKey!).then((url: string) => {
                const a = document.createElement('a');
                a.href = url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.click();
            });
        }
    };

    // --- Rendering ---

    const renderGridItem = (item: CloudItem) => {
        const iconType = getFileIcon(item);
        const color = getFileColor(item);

        const getIcon = () => {
            switch (iconType) {
                case 'folder': return <FolderIcon size={32} color={color} fill={color} fillOpacity={0.2} />;
                case 'image': return <FileImage size={32} color={color} />;
                case 'video': return <FileVideo size={32} color={color} />;
                case 'music': return <FileAudio size={32} color={color} />;
                case 'text': return <FileText size={32} color={color} />;
                case 'code': return <Code size={32} color={color} />;
                case 'archive': return <Archive size={32} color={color} />;
                default: return <FileIcon size={32} color={color} />;
            }
        };

        return (
            <div
                key={item.id}
                className={styles.gridItem}
                onClick={() => handleItemClick(item)}
                onContextMenu={(e) => openContextMenu(e, item)}
            >
                <div className={styles.gridIconContainer} style={{ backgroundColor: `${color}15` }}>
                    {getIcon()}
                </div>
                <div className={styles.gridName} title={item.name}>{item.name}</div>
                <div className={styles.gridMeta}>{item.isFolder ? formatDate(item.modifiedAt) : formatBytes(item.size)}</div>
                {item.isFavorite && <Star size={14} color="var(--warning)" fill="var(--warning)" style={{ position: 'absolute', top: 12, right: 12 }} />}
            </div>
        );
    };

    return (
        <div
            className={`${styles.container} ${isDragging ? styles.dragActive : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className={styles.dragOverlay}>
                    <Upload size={64} color="var(--primary)" />
                    <div className={styles.dragOverlayText}>{t('uploadFile')}</div>
                </div>
            )}
            {/* Top Bar */}
            <div className={styles.topBar}>
                <div className={styles.breadcrumbs}>
                    {getBreadcrumbs().map((crumb, idx, arr) => (
                        <React.Fragment key={crumb.id || 'root'}>
                            <span
                                className={`${styles.breadcrumbItem} ${idx === arr.length - 1 ? styles.breadcrumbActive : ''}`}
                                onClick={() => {
                                    setCurrentFolderID(crumb.id);
                                    setSearchQuery('');
                                }}
                            >
                                {crumb.name}
                            </span>
                            {idx < arr.length - 1 && <span className={styles.separator}>/</span>}
                        </React.Fragment>
                    ))}
                </div>

                <div className={styles.controls}>
                    <div className={styles.searchBar}>
                        <Search size={18} color="var(--text-muted)" />
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            {items.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
                    <FolderIcon size={64} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <div style={{ fontSize: '18px', fontWeight: 500 }}>{searchQuery ? 'No results found' : t('emptyFolder')}</div>
                </div>
            ) : (
                viewMode === 'list' ? (
                    <div className={styles.fileList}>
                        {items.map(item => (
                            <FileRow
                                key={item.id}
                                item={item}
                                onClick={() => handleItemClick(item)}
                                onContextMenu={(e) => openContextMenu(e, item)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className={styles.fileGrid}>
                        {items.map(item => renderGridItem(item))}
                    </div>
                )
            )}

            {/* Hidden File Input for FAB */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                multiple
            />

            {/* FAB */}
            <div className={styles.fab} onClick={(e) => { e.stopPropagation(); setFabOpen(!fabOpen); }}>
                <Plus size={28} style={{ transform: fabOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>

            {fabOpen && (
                <div className={styles.fabMenu}>
                    <div className={styles.fabMenuItem} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                        <span className={styles.fabMenuLabel}>{t('uploadFile')}</span>
                        <div className={styles.fabMenuButton}><Upload size={20} /></div>
                    </div>
                    <div className={styles.fabMenuItem} onClick={(e) => { e.stopPropagation(); setFabOpen(false); setNewFolderOpen(true); }}>
                        <span className={styles.fabMenuLabel}>{t('newFolder')}</span>
                        <div className={styles.fabMenuButton}><FolderPlus size={20} /></div>
                    </div>
                    <div className={styles.fabMenuItem} onClick={(e) => {
                        e.stopPropagation();
                        setFabOpen(false);
                        navigator.clipboard.readText().then(text => setImportLink(text)).catch(() => setImportLink(''));
                        setImportOpen(true);
                    }}>
                        <span className={styles.fabMenuLabel}>{t('importLink')}</span>
                        <div className={styles.fabMenuButton}><Link2 size={20} /></div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {newFolderOpen && (
                <div className={styles.modalOverlay} onClick={() => setNewFolderOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalTitle}>{t('newFolder')}</div>
                        <div className={styles.modalDesc}>Create a new folder in this directory.</div>
                        <form onSubmit={handleCreateFolder}>
                            <input
                                autoFocus
                                className={styles.modalInput}
                                placeholder={t('folderName')}
                                value={folderName}
                                onChange={e => setFolderName(e.target.value)}
                            />
                            <div className={styles.modalActions}>
                                <button type="button" className={`${styles.modalBtn} ${styles.modalBtnCancel}`} onClick={() => setNewFolderOpen(false)}>{t('cancel')}</button>
                                <button type="submit" className={`${styles.modalBtn} ${styles.modalBtnPrimary}`} disabled={!folderName.trim()}>{t('create')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {renameOpen && renameItem && (
                <div className={styles.modalOverlay} onClick={() => setRenameOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalTitle}>{t('rename')}</div>
                        <form onSubmit={handleRename}>
                            <input
                                autoFocus
                                className={styles.modalInput}
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                            />
                            <div className={styles.modalActions}>
                                <button type="button" className={`${styles.modalBtn} ${styles.modalBtnCancel}`} onClick={() => setRenameOpen(false)}>{t('cancel')}</button>
                                <button type="submit" className={`${styles.modalBtn} ${styles.modalBtnPrimary}`} disabled={!newName.trim() || newName === renameItem.name}>{t('rename')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {importOpen && (
                <div className={styles.modalOverlay} onClick={() => setImportOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalTitle}>{t('importLinkTitle')}</div>
                        <form onSubmit={handleImportLocal}>
                            <input
                                autoFocus
                                className={styles.modalInput}
                                placeholder="cloudium://..."
                                value={importLink}
                                onChange={e => setImportLink(e.target.value)}
                            />
                            <div className={styles.modalActions}>
                                <button type="button" className={`${styles.modalBtn} ${styles.modalBtnCancel}`} onClick={() => setImportOpen(false)}>{t('cancel')}</button>
                                <button type="submit" className={`${styles.modalBtn} ${styles.modalBtnPrimary}`} disabled={!importLink.trim()}>Import</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Move Modal */}
            {moveOpen && moveItem && (
                <div className={styles.modalOverlay} onClick={() => setMoveOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalTitle}>{t('move')} "{moveItem.name}"</div>
                        <form onSubmit={handleMove}>
                            <div style={{ marginBottom: 16 }}>{t('selectDestination')}</div>
                            <select
                                className={styles.modalInput}
                                value={targetFolderID || ''}
                                onChange={e => setTargetFolderID(e.target.value === '' ? null : e.target.value)}
                            >
                                <option value="">(Root)</option>
                                {driveData.items
                                    .filter(i => i.isFolder && i.id !== moveItem.id && i.parentID !== moveItem.id)
                                    .map(f => (
                                        <option key={f.id} value={f.id}>
                                            {f.name}
                                        </option>
                                    ))}
                            </select>
                            <div className={styles.modalActions}>
                                <button type="button" className={`${styles.modalBtn} ${styles.modalBtnCancel}`} onClick={() => setMoveOpen(false)}>{t('cancel')}</button>
                                <button type="submit" className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}>{t('move')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Context Menu overlay */}
            {contextMenu && (
                <div
                    className={styles.contextMenu}
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {!contextMenu.item.isFolder && (
                        <div className={styles.contextMenuItem} onClick={() => { addDownload(contextMenu.item); setContextMenu(null); }}>
                            <Download size={16} /> {t('download')}
                        </div>
                    )}

                    <div className={styles.contextMenuItem} onClick={() => {
                        setRenameItem(contextMenu.item);
                        setNewName(contextMenu.item.name);
                        setRenameOpen(true);
                        setContextMenu(null);
                    }}>
                        <Edit2 size={16} /> {t('rename')}
                    </div>

                    <div className={styles.contextMenuItem} onClick={() => {
                        setMoveItem(contextMenu.item);
                        setTargetFolderID(null); // default to root
                        setMoveOpen(true);
                        setContextMenu(null);
                    }}>
                        <FolderIcon size={16} /> {t('move')}
                    </div>

                    <div className={styles.contextMenuItem} onClick={() => { handleToggleFavorite(contextMenu.item); setContextMenu(null); }}>
                        <Star size={16} fill={contextMenu.item.isFavorite ? 'currentColor' : 'none'} color={contextMenu.item.isFavorite ? 'var(--warning)' : 'currentColor'} />
                        {contextMenu.item.isFavorite ? t('unfavorite') : t('favorite')}
                    </div>

                    {!contextMenu.item.isFolder && contextMenu.item.fileKey && (
                        <div className={styles.contextMenuItem} onClick={() => { handleCopyLink(contextMenu.item); setContextMenu(null); }}>
                            <Copy size={16} /> {t('copyLink')}
                        </div>
                    )}

                    <div className={styles.contextMenuDivider} />

                    <div className={`${styles.contextMenuItem} ${styles.dangerText}`} onClick={() => { handleDelete(contextMenu.item); setContextMenu(null); }}>
                        <Trash2 size={16} /> {t('delete')}
                    </div>
                </div>
            )}

        </div>
    );
}
