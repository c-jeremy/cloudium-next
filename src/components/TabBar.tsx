'use client';

import React from 'react';
import { useI18n } from '@/context/I18nContext';
import { FolderOpen, Star, ArrowUpRight, ArrowDownLeft, Settings, ArrowDownUp } from 'lucide-react';
import { useTransfer } from '@/context/TransferContext';
import styles from './TabBar.module.css';

export type TabType = 'files' | 'favorites' | 'transfers' | 'settings';

interface TabBarProps {
    activeTab: TabType;
    onChange: (tab: TabType) => void;
}

export function TabBar({ activeTab, onChange }: TabBarProps) {
    const { t } = useI18n();
    const { uploads, downloads } = useTransfer();

    const activeTransfers = uploads.filter(t => t.status === 'inProgress' || t.status === 'waiting').length +
        downloads.filter(t => t.status === 'inProgress' || t.status === 'waiting').length;

    return (
        <div className={styles.tabbar}>
            <button
                className={`${styles.tab} ${activeTab === 'files' ? styles.active : ''}`}
                onClick={() => onChange('files')}
            >
                <FolderOpen size={24} />
                <span>{t('files')}</span>
            </button>

            <button
                className={`${styles.tab} ${activeTab === 'favorites' ? styles.active : ''}`}
                onClick={() => onChange('favorites')}
            >
                <Star size={24} />
                <span>{t('favorites')}</span>
            </button>

            <button
                className={`${styles.tab} ${activeTab === 'transfers' ? styles.active : ''}`}
                onClick={() => onChange('transfers')}
            >
                <div className={styles.iconContainer}>
                    <ArrowDownUp size={24} />
                    {activeTransfers > 0 && <span className={styles.badge}>{activeTransfers}</span>}
                </div>
                <span>{t('transfers')}</span>
            </button>

            <button
                className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
                onClick={() => onChange('settings')}
            >
                <Settings size={24} />
                <span>{t('settings')}</span>
            </button>
        </div>
    );
}
