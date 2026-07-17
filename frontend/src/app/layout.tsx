import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'TaxLens — Merchant TaxOps',
  description: 'TaxLens — Nền tảng đối soát và quản lý thuế cho merchant',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" />
      </head>
      <body className="font-body text-text-primary antialiased bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
