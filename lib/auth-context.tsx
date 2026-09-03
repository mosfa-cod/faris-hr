'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { RoleName, Company, CompanyMember, CompanyRole } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  role: RoleName | null;
  company: Company | null;
  membership: CompanyMember | null;
  companyRole: CompanyRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, role: RoleName, fullName: string) => Promise<{ error?: string }>;
  signUpWithCompany: (email: string, password: string, fullName: string, companyName: string, mode: 'create' | 'join', joinCode?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<RoleName | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [membership, setMembership] = useState<CompanyMember | null>(null);
  const [companyRole, setCompanyRole] = useState<CompanyRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCompanyContext = useCallback(async (uid: string) => {
    try {
      const result = await Promise.race([
        supabase
          .from('company_members')
          .select('*, company:companies(*)')
          .eq('user_id', uid)
          .eq('status', 'active')
          .order('created_at')
          .limit(1)
          .maybeSingle(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]) as any;
      const mem = result?.data;
      if (mem) {
        setMembership(mem as CompanyMember);
        setCompany((mem as any)?.company ?? null);
        setCompanyRole((mem as CompanyMember)?.role ?? null);
      } else {
        setMembership(null);
        setCompany(null);
        setCompanyRole(null);
      }
    } catch {
      setMembership(null);
      setCompany(null);
      setCompanyRole(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ])
      .then(({ data }: any) => {
        if (!mounted) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        const metaRole = data.session?.user?.user_metadata?.role as RoleName | undefined;
        setRole(metaRole ?? null);
        if (data.session?.user) {
          loadCompanyContext(data.session.user.id).finally(() => {
            if (mounted) setLoading(false);
          });
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      (async () => {
        if (!mounted) return;
        setSession(sess);
        setUser(sess?.user ?? null);
        const metaRole = sess?.user?.user_metadata?.role as RoleName | undefined;
        setRole(metaRole ?? null);
        if (sess?.user) {
          await loadCompanyContext(sess.user.id);
        } else {
          setMembership(null);
          setCompany(null);
          setCompanyRole(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadCompanyContext]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, signUpRole: RoleName, fullName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: signUpRole, full_name: fullName } },
      });
      if (error) return { error: error.message };
      if (data.user) {
        const code = 'EMP-' + Math.floor(1000 + Math.random() * 9000);
        const { data: co } = await supabase.from('companies').select('id').order('created_at').limit(1).maybeSingle();
        const companyId = co?.id ?? null;

        if (companyId) {
          await supabase.from('company_members').insert({
            company_id: companyId,
            user_id: data.user.id,
            role: signUpRole === 'system_admin' ? 'owner' : 'employee',
            status: 'active',
          });
        }

        await supabase.from('employees').insert({
          user_id: data.user.id,
          employee_code: code,
          full_name: fullName,
          email,
          hire_date: new Date().toISOString().slice(0, 10),
          status: 'active',
          company_id: companyId,
        });
      }
      return {};
    },
    []
  );

  const signUpWithCompany = useCallback(
    async (email: string, password: string, fullName: string, companyName: string, mode: 'create' | 'join', joinCode?: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) return { error: error.message };
      if (!data.user) return { error: 'فشل إنشاء الحساب' };

      if (mode === 'create') {
        const { data: co, error: coErr } = await supabase.from('companies').insert({
          name: companyName,
          name_ar: companyName,
          plan: 'free',
          status: 'active',
        }).select().single();
        if (coErr) return { error: coErr.message };

        await supabase.from('company_members').insert({
          company_id: co.id,
          user_id: data.user.id,
          role: 'owner',
          status: 'active',
        });

        const code = 'EMP-' + Math.floor(1000 + Math.random() * 9000);
        await supabase.from('employees').insert({
          user_id: data.user.id,
          employee_code: code,
          full_name: fullName,
          email,
          hire_date: new Date().toISOString().slice(0, 10),
          status: 'active',
          company_id: co.id,
        });
      } else {
        // join: find company by name (joinCode used as company name for simplicity)
        const { data: co } = await supabase.from('companies').select('id').eq('name', joinCode ?? companyName).maybeSingle();
        if (!co) return { error: 'لم يتم العثور على شركة بهذا الاسم' };

        await supabase.from('company_members').insert({
          company_id: co.id,
          user_id: data.user.id,
          role: 'employee',
          status: 'active',
        });

        const code = 'EMP-' + Math.floor(1000 + Math.random() * 9000);
        await supabase.from('employees').insert({
          user_id: data.user.id,
          employee_code: code,
          full_name: fullName,
          email,
          hire_date: new Date().toISOString().slice(0, 10),
          status: 'active',
          company_id: co.id,
        });
      }
      return {};
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    setCompany(null);
    setMembership(null);
    setCompanyRole(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, role, company, membership, companyRole, loading, signIn, signUp, signUpWithCompany, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
