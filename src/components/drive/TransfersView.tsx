'use client';

import React from 'react';
import { useTransfer } from '@/context/TransferContext';
import { useI18n } from '@/context/I18nContext';
import { formatBytes } from '@/lib/utils';
import type { TransferTask } from '@/types';
import { ArrowUp, ArrowDown, Pause, Play, RefreshCw, X, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import styles from './Transfers.module.css';

function TaskRow({ task, onPause, onResume, onCancel, onRetry, isUpload }: {
    task: TransferTask;
    onPause: () => void;
    onResume: () => void;
    onCancel: () => void;
    onRetry: () => void;
    isUpload: boolean;
}) {
    const { t } = useI18n();

    const isCompleted = task.status === 'completed';
    const isFailed = task.status === 'failed';
    const isPaused = task.status === 'paused';
    const isWaiting = task.status === 'waiting';

    const progressPercent = Math.max(0, Math.min(100, task.progress * 100));

    let statusText = '';
    if (isCompleted) statusText = t('completed');
    else if (isFailed) statusText = t('failed');
    else if (isPaused) statusText = t('paused');
    else if (isWaiting) statusText = t('waiting');
    else statusText = isUpload ? t('uploading') : t('downloading');

    if (task.multipartInfo) statusText += ` - ${task.multipartInfo}`;

    return (
        <div className={styles.taskRow}>
            <div className={styles.taskHeader}>
                <div className={styles.taskInfo}>
                    <div className={styles.icon}>
                        {isUpload ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
                    </div>
                    <div className={styles.taskText}>
                        <div className={styles.fileName}>{task.fileName}</div>
                        <div className={styles.fileMeta}>
                            {formatBytes(task.fileSize)} • {statusText}
                        </div>
                    </div>
                </div>

                <div className={styles.taskActions}>
                    {!isCompleted && !isFailed && !isPaused && (
                        <button className={styles.actionButton} onClick={onPause} title={t('pause')}>
                            <Pause size={16} />
                        </button>
                    )}

                    {isPaused && (
                        <button className={styles.actionButton} onClick={onResume} title={t('resume')}>
                            <Play size={16} />
                        </button>
                    )}

                    {isFailed && (
                        <button className={styles.actionButton} onClick={onRetry} title={t('retry')}>
                            <RefreshCw size={16} />
                        </button>
                    )}

                    <button className={`${styles.actionButton} ${styles.danger}`} onClick={onCancel} title={isCompleted || isFailed ? t('delete') : t('cancel')}>
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                    <div
                        className={`${styles.progressFill} ${isFailed ? styles.error : isPaused ? styles.paused : isCompleted ? styles.success : ''}`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <div className={styles.progressText}>
                    {Math.round(progressPercent)}%
                </div>
            </div>

            {isFailed && task.error && (
                <div className={styles.errorMessage}>{task.error}</div>
            )}
        </div>
    );
}

export default function TransfersView() {
    const { uploads, downloads, pauseTask, resumeTask, cancelTask, retryTask, clearCompleted } = useTransfer();
    const { t } = useI18n();

    const hasTasks = uploads.length > 0 || downloads.length > 0;

    return (
        <div className={`${styles.container} fade-in`}>
            <div className={styles.header}>
                <h1>{t('transfers')}</h1>
                {hasTasks && (
                    <button className={styles.clearButton} onClick={clearCompleted}>
                        <Trash2 size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                        {t('clearCompleted')}
                    </button>
                )}
            </div>

            {!hasTasks ? (
                <div className={styles.emptyState}>
                    <ArrowUp className={styles.emptyIcon} size={48} />
                    <div className={styles.emptyText}>{t('emptyTransfers')}</div>
                </div>
            ) : (
                <>
                    {uploads.length > 0 && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>
                                <ArrowUp size={18} /> Uploads
                            </div>
                            <div className={styles.list}>
                                {uploads.map(task => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        isUpload={true}
                                        onPause={() => pauseTask(task.id, true)}
                                        onResume={() => resumeTask(task.id, true)}
                                        onCancel={() => cancelTask(task.id, true)}
                                        onRetry={() => retryTask(task.id, true)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {downloads.length > 0 && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>
                                <ArrowDown size={18} /> Downloads
                            </div>
                            <div className={styles.list}>
                                {downloads.map(task => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        isUpload={false}
                                        onPause={() => pauseTask(task.id, false)}
                                        onResume={() => resumeTask(task.id, false)}
                                        onCancel={() => cancelTask(task.id, false)}
                                        onRetry={() => retryTask(task.id, false)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
