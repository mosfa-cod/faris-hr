import './globals.css';
import type { Metadata } from 'next';
import { Cairo, Tajawal } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from '@/components/ui/toaster';

const cairo = Cairo({ subsets: ['arabic', 'latin'], display: 'swap', variable: '--font-cairo' });
const tajawal = Tajawal({ subsets: ['arabic', 'latin'], display: 'swap', variable: '--font-tajawal', weight: ['400', '500', '700'] });

export const metadata: Metadata = {
  title: 'نظام فارس دحروج لإدارة الموارد البشرية - Faris HR',
  description: 'نظام متكامل لإدارة شؤون الموظفين - الحضور، الإجازات، الرواتب، العقود، التقييم',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${cairo.variable} ${tajawal.variable}`}>
      <body className="font-tajawal antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
