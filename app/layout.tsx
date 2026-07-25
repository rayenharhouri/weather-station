import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Providers } from '@/providers/Providers';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'WeatherHub · ENIT Campus',
  description: 'Real-time environmental monitoring for the École Nationale d\'Ingénieurs de Tunis',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <Providers>
          <QueryProvider>
            <TooltipProvider>
              <AuthProvider>{children}</AuthProvider>
            </TooltipProvider>
          </QueryProvider>
        </Providers>
      </body>
    </html>
  );
}
