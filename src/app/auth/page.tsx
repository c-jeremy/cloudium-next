'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { useI18n } from '@/context/I18nContext';
import { useToast } from '@/components/Toast';
import { User, Lock, Cloud } from 'lucide-react';
import styles from './auth.module.css';

export default function AuthPage() {
    const router = useRouter();
    const { login, register, isLoggedIn } = useSession();
    const { t, lang, setLang } = useI18n();
    const { showSuccess, showError } = useToast();

    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isLoggedIn) {
            router.replace('/drive');
        }
    }, [isLoggedIn, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) return;

        if (!isLogin && password !== confirmPassword) {
            showError(t('passwordsDoNotMatch'));
            return;
        }

        setIsLoading(true);

        if (isLogin) {
            const res = await login(username.trim(), password);
            if (res.ok) {
                // Redirection happens in useEffect
            } else {
                showError(res.error || 'Login failed');
                setIsLoading(false);
            }
        } else {
            const res = await register(username.trim(), password);
            if (res.ok) {
                showSuccess('Account created successfully! Please login.');
                setIsLogin(true);
                setConfirmPassword('');
            } else {
                showError(res.error || 'Registration failed');
            }
            setIsLoading(false);
        }
    };

    const toggleLanguage = () => {
        setLang(lang === 'en' ? 'zh' : 'en');
    };

    return (
        <div className={styles.container}>
            <button className={styles.langToggle} onClick={toggleLanguage}>
                {lang === 'en' ? '中文' : 'English'}
            </button>

            <div className={`${styles.card} fade-in`}>
                <div className={styles.header}>
                    <div className={styles.logoIcon}>
                        <Cloud size={32} />
                    </div>
                    <h1 className={styles.title}>Cloudium</h1>
                    <p className={styles.subtitle}>{t('welcomeTo')} Cloudium</p>
                </div>

                <div className={styles.tabs}>
                    <div
                        className={`${styles.tab} ${isLogin ? styles.active : ''}`}
                        onClick={() => setIsLogin(true)}
                    >
                        {t('login')}
                        {isLogin && <div className={styles.indicator} />}
                    </div>
                    <div
                        className={`${styles.tab} ${!isLogin ? styles.active : ''}`}
                        onClick={() => setIsLogin(false)}
                    >
                        {t('register')}
                        {!isLogin && <div className={styles.indicator} />}
                    </div>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <User size={18} className={styles.icon} />
                        <input
                            type="text"
                            placeholder={t('username')}
                            className={styles.input}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <Lock size={18} className={styles.icon} />
                        <input
                            type="password"
                            placeholder={t('password')}
                            className={styles.input}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    {!isLogin && (
                        <div className={styles.inputGroup}>
                            <Lock size={18} className={styles.icon} />
                            <input
                                type="password"
                                placeholder={t('confirmPassword')}
                                className={styles.input}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className={styles.button}
                        disabled={isLoading || !username || !password || (!isLogin && !confirmPassword)}
                    >
                        {isLoading && <div className={styles.spinner} />}
                        {isLoading
                            ? isLogin ? t('loggingIn') : t('registering')
                            : isLogin ? t('loginButton') : t('registerButton')}
                    </button>
                </form>
            </div>
        </div>
    );
}
