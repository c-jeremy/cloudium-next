'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import md5 from 'md5';
import type { CloudDriveData, CloudItem } from '@/types';
import {
    fetchDriveData, syncDriveData, loginCheck, uploadFile, checkUserExists
} from '@/lib/api';
import {
    driveAddItem, driveRemoveItems, driveRenameItem, driveToggleFavorite,
    driveMoveItems, nowISO, generateRandomID, normalizeDriveData
} from '@/lib/utils';

interface SessionContextType {
    isLoggedIn: boolean;
    key0: string;
    username: string;
    driveData: CloudDriveData;
    isLoadingDriveData: boolean;
    login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
    register: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
    logout: () => void;
    fetchLatestDriveData: () => Promise<void>;
    updateAndSync: (mutation: (d: CloudDriveData) => CloudDriveData) => Promise<void>;
}

const SessionContext = createContext<SessionContextType | null>(null);

function emptyDrive(): CloudDriveData {
    return { items: [], lastModified: nowISO(), version: 1 };
}

function makeKey(username: string, password: string): string {
    const json = `{"name":"${username}","pwd":"${password}"}`;
    return md5(json);
}

const STORAGE_KEY0 = 'cloudium_key0';
const STORAGE_USERNAME = 'cloudium_username';
const STORAGE_DRIVE = 'cloudium_drive_data';

export function SessionProvider({ children }: { children: React.ReactNode }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [key0, setKey0] = useState('');
    const [username, setUsername] = useState('');
    const [driveData, setDriveData] = useState<CloudDriveData>(emptyDrive());
    const [isLoadingDriveData, setIsLoadingDriveData] = useState(false);

    // Restore session on mount
    useEffect(() => {
        try {
            const savedKey = localStorage.getItem(STORAGE_KEY0);
            const savedUser = localStorage.getItem(STORAGE_USERNAME);
            const savedDrive = localStorage.getItem(STORAGE_DRIVE);
            if (savedKey && savedUser) {
                setKey0(savedKey);
                setUsername(savedUser);
                setIsLoggedIn(true);
                if (savedDrive) {
                    setDriveData(normalizeDriveData(JSON.parse(savedDrive)));
                }
                // Background refresh
                fetchDriveData(savedKey).then(d => {
                    const norm = normalizeDriveData(d);
                    setDriveData(norm);
                    localStorage.setItem(STORAGE_DRIVE, JSON.stringify(norm));
                }).catch(() => { });
            }
        } catch { }
    }, []);

    const fetchLatestDriveData = useCallback(async () => {
        const k = key0 || localStorage.getItem(STORAGE_KEY0);
        if (!k) return;
        setIsLoadingDriveData(true);
        try {
            const d = await fetchDriveData(k);
            const norm = normalizeDriveData(d);
            setDriveData(norm);
            localStorage.setItem(STORAGE_DRIVE, JSON.stringify(norm));
        } catch { }
        setIsLoadingDriveData(false);
    }, [key0]);

    const saveDriveLocal = (d: CloudDriveData) => {
        localStorage.setItem(STORAGE_DRIVE, JSON.stringify(d));
    };

    const updateAndSync = useCallback(async (mutation: (d: CloudDriveData) => CloudDriveData) => {
        const k = localStorage.getItem(STORAGE_KEY0) ?? key0;
        const updated = mutation(driveData);
        setDriveData(updated);
        saveDriveLocal(updated);
        await syncDriveData(k, updated);
    }, [driveData, key0]);

    const login = useCallback(async (user: string, pass: string): Promise<{ ok: boolean; error?: string }> => {
        const k = makeKey(user, pass);
        const result = await loginCheck(k);
        if (!result.ok) {
            return { ok: false, error: result.reason === 'invalid_credentials' ? 'Incorrect username or password' : 'Server error, please try again' };
        }

        let drive = emptyDrive();
        try {
            const raw = await fetchDriveData(k);
            drive = normalizeDriveData(raw);
        } catch { }

        setKey0(k);
        setUsername(user);
        setDriveData(drive);
        setIsLoggedIn(true);

        localStorage.setItem(STORAGE_KEY0, k);
        localStorage.setItem(STORAGE_USERNAME, user);
        localStorage.setItem(STORAGE_DRIVE, JSON.stringify(drive));

        return { ok: true };
    }, []);

    const register = useCallback(async (user: string, pass: string): Promise<{ ok: boolean; error?: string }> => {
        const k = makeKey(user, pass);
        const exists = await checkUserExists(k);
        if (exists) return { ok: false, error: 'Username already taken, please choose another' };

        const initial = emptyDrive();
        const blob = new Blob([JSON.stringify(initial, null, 2)], { type: 'application/json' });
        const result = await uploadFile(blob, k, 'drive_data.json', 'application/json');
        if (!result.status) return { ok: false, error: result.msg || 'Registration failed' };
        return { ok: true };
    }, []);

    const logout = useCallback(() => {
        setKey0('');
        setUsername('');
        setDriveData(emptyDrive());
        setIsLoggedIn(false);
        localStorage.removeItem(STORAGE_KEY0);
        localStorage.removeItem(STORAGE_USERNAME);
        localStorage.removeItem(STORAGE_DRIVE);
    }, []);

    return (
        <SessionContext.Provider value={{
            isLoggedIn, key0, username, driveData, isLoadingDriveData,
            login, register, logout, fetchLatestDriveData, updateAndSync,
        }}>
            {children}
        </SessionContext.Provider>
    );
}

export function useSession() {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error('useSession must be used within SessionProvider');
    return ctx;
}
