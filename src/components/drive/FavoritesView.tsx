'use client';

import React, { useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { useI18n } from '@/context/I18nContext';
import { driveToggleFavorite } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { useTransfer } from '@/context/TransferContext';
import FileRow from './FileRow';
import { Star } from 'lucide-react';
import styles from './Favorites.module.css';

export default function FavoritesView() {
    const { driveData, updateAndSync } = useSession();
    const { addDownload } = useTransfer();
    const { t } = useI18n();
    const { showSuccess } = useToast();

    const [contextMenuTarget, setContextMenuTarget] = useState<string | null>(null);

    const favoriteItems = driveData.items.filter(i => i.isFavorite);

    const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await updateAndSync(d => driveToggleFavorite(d, id));
        showSuccess(t('unfavorite') + ' success');
        setContextMenuTarget(null);
    };

    const handleDownload = (item: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!item.isFolder) {
            addDownload(item);
            showSuccess('Added to downloads');
        }
        setContextMenuTarget(null);
    };

    return (
        <div className={`${styles.container} fade-in`}>
            <h1 className={styles.header}>{t('favorites')}</h1>

            {favoriteItems.length === 0 ? (
                <div className={styles.emptyState}>
                    <Star size={48} className={styles.emptyIcon} />
                    <div className={styles.emptyText}>{t('noFavorites')}</div>
                    <div className={styles.emptyDesc}>{t('noFavoritesDesc')}</div>
                </div>
            ) : (
                <div className={styles.list}>
                    {favoriteItems.map(item => (
                        <div key={item.id} style={{ position: 'relative' }}>
                            <FileRow
                                item={item}
                                onClick={() => {
                                    if (!item.isFolder) addDownload(item);
                                }}
                                onContextMenu={(e) => {
                                    setContextMenuTarget(contextMenuTarget === item.id ? null : item.id);
                                }}
                            />

                            {contextMenuTarget === item.id && (
                                <div
                                    style={{
                                        position: 'absolute', right: '40px', top: '40px',
                                        background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                                        borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        zIndex: 10, padding: '4px', minWidth: '150px'
                                    }}
                                >
                                    {!item.isFolder && (
                                        <button
                                            style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '4px', fontSize: '14px', color: 'var(--text-main)', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                            onClick={(e) => handleDownload(item, e)}
                                        >
                                            {t('download')}
                                        </button>
                                    )}
                                    <button
                                        style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '4px', fontSize: '14px', color: 'var(--warning)', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                        onClick={(e) => handleToggleFavorite(item.id, e)}
                                    >
                                        {t('unfavorite')}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
