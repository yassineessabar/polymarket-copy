import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Web3Provider from '../providers/Web3Provider';
import AuthProvider from '../providers/AuthProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'PolyX - Copy Trade Polymarket',
  description:
    'Copy trade top Polymarket traders with intelligent risk management, position sizing, and real-time portfolio tracking.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Web3Provider>
          <AuthProvider>{children}</AuthProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
