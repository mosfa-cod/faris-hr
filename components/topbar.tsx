'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Menu, MoonStar, Search, Sun, LogOut, User as UserIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS, COMPANY_ROLE_LABELS } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';
import type { Notification } from '@/lib/types';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme, setTheme } = useTheme();
  const { user, role, company, companyRole, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setNotifs((data ?? []) as Notification[]);
    })();
  }, [pathname]);

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/50 bg-card/70 px-4 backdrop-blur-xl">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative hidden flex-1 max-w-md sm:block">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث سريع..."
          className="pr-9"
          onChange={(e) => {
            const q = e.target.value.trim();
            if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
          }}
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="تبديل الوضع الليلي"
            title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="الإشعارات">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              الإشعارات
              {unread > 0 && <Badge variant="destructive">{unread} جديد</Badge>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifs.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">لا توجد إشعارات</div>
            )}
            {notifs.map((n) => (
              <Link href={n.link ?? '/notifications'} key={n.id}>
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
                  <span className="text-sm font-medium">{n.title}</span>
                  {n.body && <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>}
                </DropdownMenuItem>
              </Link>
            ))}
            <DropdownMenuSeparator />
            <Link href="/notifications">
              <DropdownMenuItem className="justify-center text-sm text-primary">
                عرض الكل
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {user?.email?.[0]?.toUpperCase() ?? <UserIcon className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start sm:flex">
                <span className="text-xs font-medium leading-tight">{user?.email}</span>
                <span className="text-[10px] text-muted-foreground">
                  {company ? `${company.name_ar ?? company.name} · ` : ''}
                  {companyRole ? COMPANY_ROLE_LABELS[companyRole] : role ? ROLE_LABELS[role] : ''}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>حسابي</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <UserIcon className="ml-2 h-4 w-4" /> الملف الشخصي
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="ml-2 h-4 w-4" /> تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
