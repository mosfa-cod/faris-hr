'use client';

import { useEffect, useState } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { formatDateAr } from '@/lib/format';
import type { Notification } from '@/lib/types';

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
      setNotifs((data ?? []) as Notification[]);
      setLoading(false);
    })();

    // realtime subscription
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifs((n) => [payload.new as Notification, ...n]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifs((n) => n.map((x) => x.id === id ? { ...x, read: true } : x));
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('read', false);
    setNotifs((n) => n.map((x) => ({ ...x, read: true })));
  }

  async function remove(id: string) {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifs((n) => n.filter((x) => x.id !== id));
  }

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="الإشعارات"
        description={`${unread} غير مقروء من ${notifs.length} إشعار`}
        actions={<Button variant="outline" onClick={markAllRead}><Check className="ml-2 h-4 w-4" /> تعليم الكل كمقروء</Button>}
      />

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="py-12 text-center text-muted-foreground">جاري التحميل...</div> : notifs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground"><Bell className="h-8 w-8 opacity-40" /><p className="text-sm">لا توجد إشعارات</p></div>
          ) : (
            <div className="divide-y divide-border">
              {notifs.map((n) => (
                <div key={n.id} className={`flex items-start gap-3 p-4 ${!n.read ? 'bg-primary/5' : ''}`}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{n.title}</span>
                      {!n.read && <Badge variant="default" className="text-[10px]">جديد</Badge>}
                    </div>
                    {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateAr(n.created_at)}</p>
                  </div>
                  <div className="flex gap-1">
                    {!n.read && <Button size="icon" variant="ghost" onClick={() => markRead(n.id)}><Check className="h-4 w-4" /></Button>}
                    <Button size="icon" variant="ghost" onClick={() => remove(n.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
