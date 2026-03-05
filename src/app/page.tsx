'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';

export default function RootPage() {
  const { isLoggedIn } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Basic redirect based on login status
    const timer = setTimeout(() => {
      if (isLoggedIn) {
        router.replace('/drive');
      } else {
        router.replace('/auth');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isLoggedIn, router]);

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
      <div className="spinner"></div>
      <style jsx>{`
        .spinner {
          width: 40px; height: 40px;
          border: 4px solid var(--primary-transparent);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
