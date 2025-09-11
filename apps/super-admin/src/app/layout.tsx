import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/ui/sidebar';
import { Header } from '@/components/ui/header';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BizBox Super Admin Dashboard',
  description: 'Master control panel for BizBox platform administration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Get user data from session/auth
  const user = {
    name: 'Super Admin',
    email: 'admin@bizbox.app',
    avatar: undefined,
  };

  return (
    <html lang="en">
      <body className={cn(inter.className, 'antialiased')}>
        <div className="grid min-h-screen w-full md:grid-cols-[auto_1fr]">
          <Sidebar />
          <div className="flex flex-col">
            <Header user={user} />
            <main className="admin-main">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}