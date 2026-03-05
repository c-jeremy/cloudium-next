'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { TabBar, TabType } from '@/components/TabBar';
import FilesView from '@/components/drive/FilesView';
import FavoritesView from '@/components/drive/FavoritesView';
import TransfersView from '@/components/drive/TransfersView';
import SettingsView from '@/components/drive/SettingsView';
import styles from './drive.module.css';

export default function DrivePage() {
    const { isLoggedIn, fetchLatestDriveData } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('files');

    useEffect(() => {
        if (!isLoggedIn) {
            router.replace('/auth');
        } else {
            fetchLatestDriveData();
        }
    }, [isLoggedIn, router, fetchLatestDriveData]);

    if (!isLoggedIn) return null;

    return (
        <div className={styles.container}>
            <TabBar activeTab={activeTab} onChange={setActiveTab} />

            <main className={styles.main}>
                {activeTab === 'files' && <FilesView />}
                {activeTab === 'favorites' && <FavoritesView />}
                {activeTab === 'transfers' && <TransfersView />}
                {activeTab === 'settings' && <SettingsView />}
            </main>
        </div>
    );
}
