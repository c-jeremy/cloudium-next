'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/context/SessionContext';
import { useI18n } from '@/context/I18nContext';
import { formatBytes, driveTotalUsed } from '@/lib/utils';
import { LogOut, RefreshCw, Layout, ArrowUpDown, Globe } from 'lucide-react';
import styles from './Settings.module.css';

export default function SettingsView() {
    const { username, driveData, isLoadingDriveData, fetchLatestDriveData, logout } = useSession();
    const { t, lang, setLang } = useI18n();

    const [viewMode, setViewMode] = useState('list');
    const [sortOption, setSortOption] = useState('dateNewest');
    const [useActualMD5, setUseActualMD5] = useState(false);

    useEffect(() => {
        setViewMode(localStorage.getItem('cloudium_viewMode') || 'list');
        setSortOption(localStorage.getItem('cloudium_sortOption') || 'dateNewest');
        setUseActualMD5(localStorage.getItem('cloudium_useActualMD5') === 'true');
    }, []);

    const handleViewModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setViewMode(val);
        localStorage.setItem('cloudium_viewMode', val);
        window.dispatchEvent(new Event('storage'));
    };

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSortOption(val);
        localStorage.setItem('cloudium_sortOption', val);
        window.dispatchEvent(new Event('storage'));
    };

    const handleMD5Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value === 'true';
        setUseActualMD5(val);
        localStorage.setItem('cloudium_useActualMD5', String(val));
    };

    const handleLogout = () => {
        if (window.confirm(t('logoutConfirm'))) {
            logout();
        }
    };

    const usedBytes = driveTotalUsed(driveData);
    const totalBytes = 10 * 1024 * 1024 * 1024; // 10 GB arbitrary
    const usageRatio = Math.min(usedBytes / totalBytes, 1);
    const filesCount = driveData.items.filter(i => !i.isFolder).length;
    const foldersCount = driveData.items.filter(i => i.isFolder).length;

    return (
        <div className={`${styles.container} fade-in`}>
            <h1 className={styles.header}>{t('settings')}</h1>

            <div className={styles.section}>
                <div className={styles.accountRow}>
                    <div className={styles.avatar}>
                        {username.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.accountDetails}>
                        <div className={styles.username}>{username}</div>
                        <div className={styles.accountType}>{t('account')}</div>
                    </div>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionTitle}>{t('storage')}</div>
                <div className={styles.storageHeader}>
                    <span>{t('used')}</span>
                    <span className={styles.storageUsage}>
                        {formatBytes(usedBytes)} / {formatBytes(totalBytes)}
                    </span>
                </div>
                <div className={styles.progressBarTrack}>
                    <div
                        className={styles.progressBarFill}
                        style={{ width: `${usageRatio * 100}%` }}
                    />
                </div>
                <div className={styles.storageStats}>
                    {filesCount} {t('files')} · {foldersCount} {t('folders')}
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionTitle}>{t('display')}</div>

                <div className={styles.listItem}>
                    <div className={styles.listItemText}>
                        <div className={`${styles.iconWrapper} ${styles.blueIcon}`}><Layout size={18} /></div>
                        {t('defaultView')}
                    </div>
                    <select className={styles.selectInput} value={viewMode} onChange={handleViewModeChange}>
                        <option value="list">{t('list')}</option>
                        <option value="grid">{t('grid')}</option>
                    </select>
                </div>

                <div className={styles.listItem} style={{ borderBottom: 'none' }}>
                    <div className={styles.listItemText}>
                        <div className={`${styles.iconWrapper} ${styles.orangeIcon}`}><ArrowUpDown size={18} /></div>
                        {t('defaultSort')}
                    </div>
                    <select className={styles.selectInput} value={sortOption} onChange={handleSortChange}>
                        <option value="nameAsc">{t('name')} A→Z</option>
                        <option value="nameDesc">{t('name')} Z→A</option>
                        <option value="dateNewest">{t('date')} (Newest)</option>
                        <option value="dateOldest">{t('date')} (Oldest)</option>
                        <option value="sizeLargest">{t('size')} (Largest)</option>
                        <option value="sizeSmallest">{t('size')} (Smallest)</option>
                        <option value="typeAsc">{t('type')}</option>
                    </select>
                </div>

                <div className={styles.listItem} style={{ borderBottom: 'none' }}>
                    <div className={styles.listItemText}>
                        <div className={`${styles.iconWrapper} ${styles.blueIcon}`}><RefreshCw size={18} /></div>
                        Upload Hash Method
                    </div>
                    <select className={styles.selectInput} value={String(useActualMD5)} onChange={handleMD5Change}>
                        <option value="true">Actual MD5 (Slower)</option>
                        <option value="false">Random Hash (Fake 32-hex)</option>
                    </select>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.listItem}>
                    <div className={styles.listItemText}>
                        <div className={`${styles.iconWrapper} ${styles.purpleIcon}`}><Globe size={18} /></div>
                        Language
                    </div>
                    <select className={styles.selectInput} value={lang} onChange={(e) => setLang(e.target.value as 'en' | 'zh')}>
                        <option value="en">English</option>
                        <option value="zh">中文</option>
                    </select>
                </div>

                <div className={styles.listItem} style={{ borderBottom: 'none' }}>
                    <div className={styles.listItemText}>
                        <div className={`${styles.iconWrapper} ${styles.blueIcon}`}><RefreshCw size={18} /></div>
                        {t('syncData')}
                    </div>
                    <button
                        className={styles.buttonPrimary}
                        onClick={fetchLatestDriveData}
                        disabled={isLoadingDriveData}
                    >
                        {isLoadingDriveData ? '...' : t('syncData')}
                    </button>
                </div>
            </div>

            <button className={styles.buttonDestructive} onClick={handleLogout}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <LogOut size={20} />
                    {t('logout')}
                </div>
            </button>
        </div>
    );
}
