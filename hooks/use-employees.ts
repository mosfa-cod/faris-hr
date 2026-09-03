 'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { Employee, Department, Position, Branch } from '@/lib/types';
import { MOCK_EMPLOYEES, MOCK_DEPARTMENTS } from '@/lib/mock-data';

export function useEmployees() {
  const { company, loading: authLoading } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  const load = useCallback(async () => {
    // Wait for auth/company resolution to finish before deciding mock vs real,
    // to avoid a race where this runs before `company` has loaded.
    if (authLoading) return;
    if (!company) {
      setEmployees(MOCK_EMPLOYEES);
      setDepartments(MOCK_DEPARTMENTS);
      setPositions([]);
      setBranches([]);
      setUsingMock(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [empRes, depRes, posRes, brRes] = await Promise.all([
        supabase.from('employees').select('*, department:departments!employees_department_id_fkey(*), position:positions(*), branch:branches(*), manager:employees!manager_id(*)').eq('company_id', company.id).order('created_at', { ascending: false }),
        supabase.from('departments').select('*').eq('company_id', company.id).order('name'),
        supabase.from('positions').select('*').eq('company_id', company.id).order('title'),
        supabase.from('branches').select('*').eq('company_id', company.id).order('name'),
      ]);
      setEmployees((empRes.data ?? []) as Employee[]);
      setDepartments((depRes.data ?? []) as Department[]);
      setPositions((posRes.data ?? []) as Position[]);
      setBranches((brRes.data ?? []) as Branch[]);
      setUsingMock(false);
    } catch {
      setEmployees(MOCK_EMPLOYEES);
      setDepartments(MOCK_DEPARTMENTS);
      setUsingMock(true);
    }
    setLoading(false);
  }, [company, authLoading]);

  useEffect(() => { load(); }, [load]);

  const addEmployeeLocal = useCallback((emp: Employee) => {
    setEmployees((prev) => [emp, ...prev]);
  }, []);

  const deleteEmployeeLocal = useCallback((id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateEmployeeLocal = useCallback((id: string, patch: Partial<Employee>) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  return { employees, departments, positions, branches, loading, reload: load, usingMock, addEmployeeLocal, deleteEmployeeLocal, updateEmployeeLocal };
}