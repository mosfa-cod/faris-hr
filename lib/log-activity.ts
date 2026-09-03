import { supabase } from '@/lib/supabase/client';

/**
 * يسجّل عملية في سجل العمليات (activity_logs) — يُستخدم بعد أي إجراء مهم
 * (إضافة/حذف موظف، اعتماد راتب، الموافقة على إجازة...) لبناء سجل تدقيق حقيقي.
 * لا يوقف تنفيذ الكود لو فشل التسجيل نفسه (best-effort)، حتى لا يعطّل العملية الأساسية.
 */
export async function logActivity(params: {
  companyId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  if (!params.companyId) return;
  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from('activity_logs').insert({
      company_id: params.companyId,
      user_id: auth?.user?.id,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId,
      details: params.details ?? {},
    });
  } catch {
    // تسجيل السجل نفسه لا يجب أن يوقف العملية الأساسية عند فشله
  }
}