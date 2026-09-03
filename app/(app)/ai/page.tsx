'use client';

import { useState } from 'react';
import { Sparkles, Send, Loader2, FileText, UserCog, Mail, FileSignature, MessageSquare } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/permissions';

const TOOLS = [
  { key: 'job_description', label: 'كتابة الوصف الوظيفي', icon: FileText, placeholder: 'اكتب المسمى الوظيفي ومتطلباته...' },
  { key: 'review_summary', label: 'تلخيص تقييم موظف', icon: UserCog, placeholder: 'الصق تفاصيل تقييم الموظف...' },
  { key: 'interview_questions', label: 'اقتراح أسئلة المقابلات', icon: MessageSquare, placeholder: 'اكتب المسمى الوظيفي والمهارات المطلوبة...' },
  { key: 'cv_analysis', label: 'تحليل السيرة الذاتية', icon: FileText, placeholder: 'الصق محتوى السيرة الذاتية...' },
  { key: 'contract_draft', label: 'إنشاء عقد عمل', icon: FileSignature, placeholder: 'اكتب تفاصيل العقد: الطرفان، الراتب، المدة...' },
  { key: 'admin_letter', label: 'كتابة خطاب إداري', icon: Mail, placeholder: 'اكتب نوع الخطاب والموضوع...' },
] as const;

export default function AiPage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [tool, setTool] = useState<typeof TOOLS[number]['key']>('job_description');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  if (!hasPermission(role ?? undefined, 'ai.use')) {
    return <div className="py-12 text-center text-muted-foreground">لا تملك صلاحية الوصول لهذه الصفحة</div>;
  }

  async function generate() {
    if (!prompt.trim()) { toast({ title: 'أدخل النص', variant: 'destructive' }); return; }
    setLoading(true);
    setResult('');
    // Simulated AI response (OpenAI integration requires a secret key configured as an edge function)
    const toolLabel = TOOLS.find((t) => t.key === tool)?.label ?? '';
    await new Promise((r) => setTimeout(r, 1200));
    setResult(
      `--- ${toolLabel} ---\n\n` +
      `بناءً على طلبك: "${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''}"\n\n` +
      `هذا نموذج أولي للمحتوى المطلوب. لتفعيل التكامل الكامل مع OpenAI، يجب إضافة مفتاح API في إعدادات المشروع ونشر دالة Edge Function تقوم بتمرير الطلب إلى OpenAI بأمان.\n\n` +
      `يمكنك تعديل هذا النص واستخدامه كمسودة أولية.`
    );
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="المساعد الذكي" description="أدوات مدعومة بالذكاء الاصطناعي للموارد البشرية" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => { setTool(t.key); setResult(''); }}
              className={`flex items-center gap-3 rounded-lg border p-4 text-right transition-colors ${tool === t.key ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tool === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-5 w-5 text-primary" /> {TOOLS.find((t) => t.key === tool)?.label}</CardTitle>
          <CardDescription>أدخل التفاصيل المطلوبة وسيقوم المساعد بتوليد المحتوى</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea rows={5} placeholder={TOOLS.find((t) => t.key === tool)?.placeholder} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <Button onClick={generate} disabled={loading}>
            {loading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري التوليد...</> : <><Send className="ml-2 h-4 w-4" /> توليد</>}
          </Button>
          {result && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="mb-2 flex items-center justify-between">
                <Badge variant="default">النتيجة</Badge>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(result); toast({ title: 'تم النسخ' }); }}>نسخ</Button>
              </div>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">{result}</pre>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            ملاحظة: لتفعيل التكامل الكامل مع OpenAI، يجب إضافة مفتاح API في إعدادات Supabase ونشر دالة Edge Function لتمرير الطلبات بأمان.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
