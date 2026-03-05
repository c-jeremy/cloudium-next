'use client';

import React from 'react';
import type { CloudItem } from '@/types';
import { formatBytes, formatDate, getFileIcon, getFileColor } from '@/lib/utils';
import { useI18n } from '@/context/I18nContext';
import { Folder, FileImage, FileVideo, FileAudio, FileText, File, Star, MoreVertical, Archive, Code, Check } from 'lucide-react';
import styles from './FileRow.module.css';

interface FileRowProps {
    item: CloudItem;
    onClick: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    isSelectionMode?: boolean;
    isSelected?: boolean;
}

export default function FileRow({ item, onClick, onContextMenu, isSelectionMode = false, isSelected = false }: FileRowProps) {
    const { t } = useI18n();

    const getIconElement = (type: string, color: string) => {
        switch (type) {
            case 'folder': return <Folder size={20} color={color} fill={color} fillOpacity={0.2} />;
            case 'image': return <FileImage size={20} color={color} />;
            case 'video': return <FileVideo size={20} color={color} />;
            case 'music': return <FileAudio size={20} color={color} />;
            case 'text': return <FileText size={20} color={color} />;
            case 'code': return <Code size={20} color={color} />;
            case 'archive': return <Archive size={20} color={color} />;
            default: return <File size={20} color={color} />;
        }
    };

    const iconType = getFileIcon(item);
    const iconColor = getFileColor(item);

    // Create a light background version of the color
    const bgColor = `${iconColor}20`; // Append 20 for hex alpha transparency

    return (
        <div
            className={`${styles.fileRow} ${isSelected ? styles.selected : ''}`}
            onClick={onClick}
            onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(e);
            }}
        >
            {isSelectionMode && (
                <div className={`${styles.checkbox} ${isSelected ? styles.checked : ''}`}>
                    {isSelected && <Check size={12} strokeWidth={3} />}
                </div>
            )}

            <div className={styles.iconContainer} style={{ backgroundColor: bgColor }}>
                {getIconElement(iconType, iconColor)}
            </div>

            <div className={styles.info}>
                <div className={styles.nameContainer}>
                    <span className={styles.name}>{item.name}</span>
                    {item.isFavorite && <Star size={14} className={styles.favoriteActive} fill="currentColor" />}
                </div>
                <div className={styles.details}>
                    <span>{formatDate(item.modifiedAt)}</span>
                    {!item.isFolder && (
                        <>
                            <span>•</span>
                            <span>{formatBytes(item.size)}</span>
                        </>
                    )}
                </div>
            </div>

            <div className={styles.actions} onClick={(e) => {
                e.stopPropagation();
                onContextMenu(e);
            }}>
                <button className={styles.actionButton}>
                    <MoreVertical size={18} />
                </button>
            </div>
        </div>
    );
}
