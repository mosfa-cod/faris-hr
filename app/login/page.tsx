'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Building2, Loader2, Plus, LogIn } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

type Mode = 'login' | 'create' | 'join';

export default function LoginPage() {
  const { signIn, signUpWithCompany } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);

    if (mode === 'login') {
      const { error: err } = await signIn(email, password);
      if (err) setError(err);
      else router.replace('/');
    } else if (mode === 'create') {
      const { error: err } = await signUpWithCompany(email, password, fullName, companyName, 'create');
      if (err) setError(err);
      else router.replace('/');
    } else {
      const { error: err } = await signUpWithCompany(email, password, fullName, companyName, 'join', joinCode || companyName);
      if (err) setError(err);
      else router.replace('/');
    }
    setBusy(false);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      {/* Ambient glow background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 h-72 w-72 rounded-full bg-success/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-scale-in">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow-primary">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-gradient-primary">نظام فارس دحروج لإدارة الموارد البشرية</h1>
            <p className="text-sm text-muted-foreground">Faris HR — نظام SaaS متعدد الشركات</p>
          </div>
        </div>

        <Card className="shadow-soft-lg border-border/60">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              {mode === 'login' ? 'تسجيل الدخول' : mode === 'create' ? 'إنشاء شركة جديدة' : 'الانضمام لشركة قائمة'}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'أدخل بياناتك للوصول إلى لوحة التحكم'
                : mode === 'create'
                ? 'أنشئ حسابك وشركتك الجديدة — ستكون المالك والمدير'
                : 'أدخل اسم الشركة أو رمز الانضمام للانضمام كموظف'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {mode !== 'login' && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">الاسم الكامل</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="الاسم الكامل" required />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">البريد الإلكتروني</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">كلمة المرور</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
              </div>
              {mode === 'create' && (
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-sm font-medium">اسم الشركة</Label>
                  <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="اسم شركتك" required />
                </div>
              )}
              {mode === 'join' && (
                <div className="space-y-2">
                  <Label htmlFor="joincode" className="text-sm font-medium">اسم الشركة أو رمز الانضمام</Label>
                  <Input id="joincode" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="اسم الشركة" required />
                </div>
              )}
              {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-fade-in">{error}</div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                {mode === 'login' ? 'دخول' : mode === 'create' ? 'إنشاء الشركة' : 'الانضمام'}
              </Button>
              <div className="flex w-full flex-col gap-2">
                {mode !== 'login' && (
                  <Button type="button" variant="link" className="w-full text-sm" onClick={() => { setMode('login'); setError(''); }}>
                    لديك حساب؟ تسجيل الدخول
                  </Button>
                )}
                {mode === 'login' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" className="w-full text-sm" onClick={() => { setMode('create'); setError(''); }}>
                      <Plus className="ml-2 h-4 w-4" /> شركة جديدة
                    </Button>
                    <Button type="button" variant="outline" className="w-full text-sm" onClick={() => { setMode('join'); setError(''); }}>
                      <LogIn className="ml-2 h-4 w-4" /> انضمام
                    </Button>
                  </div>
                )}
                {mode === 'create' && (
                  <Button type="button" variant="link" className="w-full text-sm" onClick={() => { setMode('join'); setError(''); }}>
                    الانضمام لشركة قائمة بدلاً من ذلك
                  </Button>
                )}
                {mode === 'join' && (
                  <Button type="button" variant="link" className="w-full text-sm" onClick={() => { setMode('create'); setError(''); }}>
                    إنشاء شركة جديدة بدلاً من ذلك
                  </Button>
                )}
              </div>
            </CardFooter>
          </form>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">العودة للرئيسية</Link>
        </p>
      </div>
    </div>
  );
}
