'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'zh';

interface Translations {
    [key: string]: string;
}

const en: Translations = {
    login: 'Login',
    register: 'Register',
    username: 'Username',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    loginButton: 'Sign In',
    registerButton: 'Create Account',
    loggingIn: 'Signing in...',
    registering: 'Creating account...',
    passwordsDoNotMatch: 'Passwords do not match',
    welcomeTo: 'Welcome to',
    files: 'Files',
    favorites: 'Favorites',
    transfers: 'Transfers',
    settings: 'Settings',
    searchPlaceholder: 'Search files...',
    newFolder: 'New Folder',
    uploadFile: 'Upload File',
    importClipboard: 'Import from Clipboard',
    cancel: 'Cancel',
    create: 'Create',
    folderName: 'Folder Name',
    rename: 'Rename',
    delete: 'Delete',
    download: 'Download',
    preview: 'Preview',
    copyLink: 'Copy Link',
    favorite: 'Favorite',
    unfavorite: 'Unfavorite',
    move: 'Move',
    deleteConfirmTitle: 'Delete Item',
    deleteConfirmMessage: 'Are you sure you want to delete "{name}"? This action cannot be undone.',
    emptyFolder: 'Folder is empty',
    dropUpload: 'Drop files to upload',
    noFavorites: 'No favorites yet',
    noFavoritesDesc: 'Star files to see them here',
    account: 'Account',
    storage: 'Storage',
    used: 'Used',
    display: 'Display',
    defaultView: 'Default View',
    defaultSort: 'Default Sort',
    list: 'List',
    grid: 'Grid',
    syncData: 'Sync Data',
    logout: 'Logout',
    logoutConfirm: 'Are you sure you want to logout? You will need to login again to access your files.',
    linkCopied: 'Link copied to clipboard',
    importValidating: 'Validating link...',
    importSuccess: 'Successfully imported to current folder',
    importError: 'Invalid link or file does not exist',
    importLink: 'Import Link',
    importLinkTitle: 'Import File from Link',
    selectDestination: 'Select Destination:',
    uploading: 'Uploading...',
    downloading: 'Downloading...',
    completed: 'Completed',
    failed: 'Failed',
    paused: 'Paused',
    waiting: 'Waiting',
    clearCompleted: 'Clear Completed',
    retry: 'Retry',
    pause: 'Pause',
    resume: 'Resume',
    size: 'Size',
    date: 'Date',
    name: 'Name',
    type: 'Type',
    emptyTransfers: 'No active transfers',
};

const zh: Translations = {
    login: '登录',
    register: '注册',
    username: '用户名',
    password: '密码',
    confirmPassword: '确认密码',
    loginButton: '登 录',
    registerButton: '创建账号',
    loggingIn: '登录中...',
    registering: '注册中...',
    passwordsDoNotMatch: '两次输入的密码不一致',
    welcomeTo: '欢迎使用',
    files: '文件',
    favorites: '收藏',
    transfers: '传输',
    settings: '设置',
    searchPlaceholder: '搜索文件...',
    newFolder: '新建文件夹',
    uploadFile: '上传文件',
    importClipboard: '从剪贴板导入',
    cancel: '取消',
    create: '创建',
    folderName: '文件夹名称',
    rename: '重命名',
    delete: '删除',
    download: '下载',
    preview: '预览',
    copyLink: '复制链接',
    favorite: '收藏',
    unfavorite: '取消收藏',
    move: '移动',
    deleteConfirmTitle: '删除确认',
    deleteConfirmMessage: '确定要删除 "{name}" 吗？此操作无法撤销。',
    emptyFolder: '文件夹为空',
    dropUpload: '释放鼠标上传文件',
    noFavorites: '暂无收藏',
    noFavoritesDesc: '收藏的文件会显示在这里',
    account: '账号',
    storage: '存储空间',
    used: '已使用',
    display: '显示',
    defaultView: '默认视图',
    defaultSort: '默认排序',
    list: '列表',
    grid: '网格',
    syncData: '同步数据',
    logout: '退出登录',
    logoutConfirm: '确定要退出登录吗？退出后需要重新登录才能访问您的文件。',
    linkCopied: '链接已复制到剪贴板',
    importValidating: '正在验证链接...',
    importSuccess: '已成功导入当前文件夹',
    importError: '无效的链接或文件不存在',
    importLink: '导入链接',
    importLinkTitle: '从链接导入文件',
    selectDestination: '选择目标位置：',
    uploading: '上传中...',
    downloading: '下载中...',
    completed: '已完成',
    failed: '失败',
    paused: '已暂停',
    waiting: '等待中',
    clearCompleted: '清除已完成',
    retry: '重试',
    pause: '暂停',
    resume: '恢复',
    size: '大小',
    date: '日期',
    name: '名称',
    type: '类型',
    emptyTransfers: '暂无传输任务',
};

const dictionaries = { en, zh };

interface I18nContextType {
    lang: Language;
    setLang: (lang: Language) => void;
    t: (key: keyof Translations, params?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_LANG = 'cloudium_lang';

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLangState] = useState<Language>('en');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_LANG);
            if (saved === 'en' || saved === 'zh') {
                setLangState(saved);
            } else {
                const browserLang = navigator.language.toLowerCase();
                if (browserLang.includes('zh')) {
                    setLangState('zh');
                }
            }
        } catch { }
        setMounted(true);
    }, []);

    const setLang = (newLang: Language) => {
        setLangState(newLang);
        try {
            localStorage.setItem(STORAGE_LANG, newLang);
        } catch { }
    };

    const t = (key: keyof Translations, params?: Record<string, string>): string => {
        let str = dictionaries[lang][key as string] || dictionaries['en'][key as string] || key as string;
        if (params) {
            Object.keys(params).forEach(p => {
                str = str.replace(`{${p}}`, params[p]);
            });
        }
        return str;
    };

    if (!mounted) {
        return null; // or a tiny loader
    }

    return (
        <I18nContext.Provider value={{ lang, setLang, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
    return ctx;
}
