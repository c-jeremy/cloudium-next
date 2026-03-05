import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { I18nProvider } from '@/context/I18nContext';
import { SessionProvider } from '@/context/SessionContext';
import { TransferProvider } from '@/context/TransferContext';
import { ToastProvider } from '@/components/Toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cloudium Next',
  description: 'Your Secure Cloud Drive',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <I18nProvider>
          <ToastProvider>
            <SessionProvider>
              <TransferProvider>
                {children}
              </TransferProvider>
            </SessionProvider>
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
