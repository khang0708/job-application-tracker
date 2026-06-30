'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { getAiConfig, saveAiConfig, testAiConfig, type AiConfig } from '@/lib/api/ai-config';
import { DashboardShell } from '@/components/layout/DashboardShell';

const schema = z.object({
  provider: z.enum(['gemini', 'openai', 'ollama']),
  geminiApiKey: z.string().optional().nullable(),
  openaiApiKey: z.string().optional().nullable(),
  ollamaBaseUrl: z.string().optional().nullable(),
  ollamaModel: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

const PROVIDER_INFO = {
  gemini: {
    label: 'Google Gemini',
    description: 'Gemini 2.0 Flash — nhanh, rẻ, phù hợp cho JD parsing và cover letter',
    docsUrl: 'https://aistudio.google.com/apikey',
    docsLabel: 'Lấy API key tại Google AI Studio',
  },
  openai: {
    label: 'OpenAI',
    description: 'GPT-4o Mini — chất lượng cao, phù hợp cho cover letter tiếng Anh',
    docsUrl: 'https://platform.openai.com/api-keys',
    docsLabel: 'Lấy API key tại OpenAI Platform',
  },
  ollama: {
    label: 'Ollama (Local)',
    description: 'Chạy model AI trên máy local — miễn phí, bảo mật tuyệt đối, không cần internet',
    docsUrl: 'https://ollama.com',
    docsLabel: 'Tải Ollama về máy',
  },
} as const;

type TestResult = { success: boolean; provider: string; response?: string; error?: string } | null;

export default function SettingsPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);

  const { register, handleSubmit, watch, setValue, control, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      provider: 'gemini',
      geminiApiKey: '',
      openaiApiKey: '',
      ollamaBaseUrl: 'http://localhost:11434',
      ollamaModel: 'llama3.2',
    },
  });

  const provider = watch('provider');

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    getAiConfig().then((config) => {
      if (config) {
        setValue('provider', config.provider);
        setValue('geminiApiKey', config.geminiApiKey ?? '');
        setValue('openaiApiKey', config.openaiApiKey ?? '');
        setValue('ollamaBaseUrl', config.ollamaBaseUrl ?? 'http://localhost:11434');
        setValue('ollamaModel', config.ollamaModel ?? 'llama3.2');
      }
    }).finally(() => setIsLoading(false));
  }, [token, router, setValue]);

  async function onSave(data: FormValues) {
    try {
      await saveAiConfig({
        provider: data.provider,
        geminiApiKey: data.geminiApiKey || null,
        openaiApiKey: data.openaiApiKey || null,
        ollamaBaseUrl: data.ollamaBaseUrl || 'http://localhost:11434',
        ollamaModel: data.ollamaModel || 'llama3.2',
      });
      toast.success('Đã lưu cấu hình AI');
      setTestResult(null);
    } catch {
      toast.error('Không thể lưu cấu hình');
    }
  }

  async function onTest() {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testAiConfig();
      setTestResult(result);
      if (result.success) toast.success(`Kết nối thành công với ${PROVIDER_INFO[result.provider as keyof typeof PROVIDER_INFO]?.label ?? result.provider}`);
      else toast.error(`Kết nối thất bại: ${result.error}`);
    } catch (err: any) {
      setTestResult({ success: false, provider, error: err?.response?.data?.message ?? 'Lỗi kết nối' });
      toast.error('Không thể test kết nối');
    } finally {
      setIsTesting(false);
    }
  }

  const info = PROVIDER_INFO[provider];
  const inputCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white/60';

  if (isLoading) return <DashboardShell><div className="p-8 text-gray-400 text-sm">Đang tải…</div></DashboardShell>;

  return (
    <DashboardShell>
      <div className="p-8 max-w-xl">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900">Cài đặt AI</h1>
          <p className="text-sm text-gray-500 mt-1">Chọn provider và cấu hình API key</p>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          {/* Provider selector */}
          <div className="glass-light rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Provider</h2>
            <div className="grid grid-cols-3 gap-2">
              {(['gemini', 'openai', 'ollama'] as const).map((p) => (
                <label
                  key={p}
                  className={`cursor-pointer rounded-xl border-2 p-3 text-center transition ${
                    provider === p ? 'border-blue-500 bg-blue-50/80' : 'border-white/70 hover:border-gray-200 bg-white/40'
                  }`}
                >
                  <Controller name="provider" control={control} render={({ field }) => (
                    <input type="radio" className="sr-only" value={p} checked={field.value === p} onChange={() => field.onChange(p)} />
                  )} />
                  <div className="text-lg mb-1">{p === 'gemini' ? '✦' : p === 'openai' ? '⬡' : '🦙'}</div>
                  <div className="text-xs font-medium text-gray-700">{PROVIDER_INFO[p].label}</div>
                </label>
              ))}
            </div>
            <div className="mt-3 p-3 bg-white/40 rounded-xl">
              <p className="text-xs text-gray-500">{info.description}</p>
              <a href={info.docsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                {info.docsLabel} ↗
              </a>
            </div>
          </div>

          {/* Fields */}
          <div className="glass-light rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Cấu hình</h2>
            {provider === 'gemini' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Gemini API Key</label>
                <input {...register('geminiApiKey')} type="password" placeholder="AIza…" className={inputCls} />
                <p className="text-xs text-gray-400 mt-1">Để trống để dùng GEMINI_API_KEY từ server .env</p>
              </div>
            )}
            {provider === 'openai' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">OpenAI API Key</label>
                <input {...register('openaiApiKey')} type="password" placeholder="sk-…" className={inputCls} />
                <p className="text-xs text-gray-400 mt-1">Để trống để dùng OPENAI_API_KEY từ server .env</p>
              </div>
            )}
            {provider === 'ollama' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ollama Base URL</label>
                  <input {...register('ollamaBaseUrl')} placeholder="http://localhost:11434" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Model</label>
                  <input {...register('ollamaModel')} placeholder="llama3.2" className={inputCls} />
                  <p className="text-xs text-gray-400 mt-1">Gợi ý: llama3.2, mistral, qwen2.5, gemma2</p>
                </div>
                <div className="p-3 bg-amber-50/80 border border-amber-100 rounded-xl text-xs text-amber-700">
                  Cần cài Ollama và pull model: <code className="font-mono bg-amber-100 px-1 rounded">ollama pull llama3.2</code>
                </div>
              </>
            )}
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`px-4 py-3 rounded-xl border text-sm ${testResult.success ? 'bg-green-50/80 border-green-100 text-green-700' : 'bg-red-50/80 border-red-100 text-red-700'}`}>
              {testResult.success
                ? <span><span className="font-medium">✓ Thành công</span> — <span className="font-mono">{testResult.response}</span></span>
                : <span><span className="font-medium">✗ Lỗi:</span> {testResult.error}</span>}
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={onTest} disabled={isTesting}
              className="px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-white/60 disabled:opacity-50 transition">
              {isTesting ? 'Đang test…' : 'Test kết nối'}
            </button>
            <button type="submit" disabled={formState.isSubmitting}
              className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
              {formState.isSubmitting ? 'Đang lưu…' : 'Lưu cấu hình'}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
