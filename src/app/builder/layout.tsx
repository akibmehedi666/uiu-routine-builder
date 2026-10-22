import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Builder',
  description:
    'Interactive conflict-free class routine builder and section optimizer for United International University (UIU) Fall 2026.',
};

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
