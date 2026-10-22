import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SiteNav } from '../components/SiteNav';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFFBF7',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://uiu-routine-builder.vercel.app'),
  title: {
    default: 'Routine Builder | UIU',
    template: '%s | UIU Routine Builder',
  },
  description:
    'Automated clash-free routine generator and section optimizer for United International University (UIU), Dhaka. Dept. of CSE & Data Science.',
  keywords: [
    'UIU',
    'Routine Builder',
    'Class Schedule',
    'United International University',
    'CSE',
    'BSDS',
    'Fall 2026',
    'UCAM',
  ],
  icons: {
    icon: [
      { url: '/icon.svg?v=2', type: 'image/svg+xml' },
      { url: '/favicon.ico?v=2', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-icon.png?v=2', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} min-h-[100dvh] bg-page text-text-primary antialiased selection:bg-orange-500 selection:text-white flex flex-col`}>
        <SiteNav />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
