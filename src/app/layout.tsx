import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'UIU Routine Builder | Fall 2026 Class Schedule Solver',
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
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2224%22 fill=%22%23F26B21%22/><text y=%2268%22 font-size=%2260%22 font-family=%22system-ui,sans-serif%22 font-weight=%22bold%22 fill=%22white%22 text-anchor=%22middle%22 x=%2250%22>U</text></svg>',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} min-h-screen bg-page text-text-primary antialiased selection:bg-orange-500 selection:text-white`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
