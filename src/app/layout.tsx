import type { Metadata } from 'next';
import './globals.css';

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#060913] text-slate-100 antialiased selection:bg-orange-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
