'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { getAiConfig, saveAiConfig, testAiConfig, type AiConfig } from '@/lib/api/ai-config';

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

  if (isLoading) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <p className="text-gray-400">Đang tải…</p>
      </main>
    );
  }

  const info = PROVIDER_INFO[provider];

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition">←</Link>
          <h1 className="text-2xl font-bold text-gray-900">Cài đặt AI</h1>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="space-y-5">
          {/* Provider selector */}
          <div className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Chọn AI Provider</h2>
            <div className="grid grid-cols-3 gap-3">
              {(['gemini', 'openai', 'ollama'] as const).map((p) => (
                <label
                  key={p}
                  className={`cursor-pointer rounded-lg border-2 p-3 text-center transition ${
                    provider === p
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Controller
                    name="provider"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="radio"
                        className="sr-only"
                        value={p}
                        checked={field.value === p}
                        onChange={() => field.onChange(p)}
                      />
                    )}
                  />
                  <div className="text-xl mb-1">
                    {p === 'gemini' ? '✦' : p === 'openai' ? '⬡' : '🦙'}
                  </div>
                  <div className="text-xs font-medium text-gray-700">{PROVIDER_INFO[p].label}</div>
                </label>
              ))}
            </div>

            {/* Provider description */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">{info.description}</p>
              <a
                href={info.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline mt-1 inline-block"
              >
                {info.docsLabel} ↗
              </a>
            </div>
          </div>

          {/* Provider-specific fields */}
          <div className="bg-white border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Cấu hình</h2>

            {provider === 'gemini' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gemini API Key
                </label>
                <input
                  {...register('geminiApiKey')}
                  type="password"
                  placeholder="AIza…"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Để trống để dùng GEMINI_API_KEY từ server .env
                </p>
              </div>
            )}

            {provider === 'openai' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OpenAI API Key
                </label>
                <input
                  {...register('openaiApiKey')}
                  type="password"
                  placeholder="sk-…"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Để trống để dùng OPENAI_API_KEY từ server .env
                </p>
              </div>
            )}

            {provider === 'ollama' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ollama Base URL
                  </label>
                  <input
                    {...register('ollamaBaseUrl')}
                    placeholder="http://localhost:11434"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    {...register('ollamaModel')}
                    placeholder="llama3.2"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Một số model tốt: llama3.2, mistral, qwen2.5, gemma2
                  </p>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                  <strong>Lưu ý:</strong> Cần cài Ollama và pull model trước:{' '}
                  <code className="font-mono bg-yellow-100 px-1 rounded">ollama pull llama3.2</code>
                </div>
              </>
            )}
          </div>

          {/* Test result */}
          {testResult && (
            <div
              className={`p-4 rounded-lg border text-sm ${
                testResult.success
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {testResult.success ? (
                <p>
                  <span className="font-medium">✓ Kết nối thành công</span> — Model trả về:{' '}
                  <span className="font-mono">{testResult.response}</span>
                </p>
              ) : (
                <p>
                  <span className="font-medium">✗ Lỗi:</span> {testResult.error}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onTest}
              disabled={isTesting}
              className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {isTesting ? 'Đang test…' : 'Test kết nối'}
            </button>
            <button
              type="submit"
              disabled={formState.isSubmitting}
              className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {formState.isSubmitting ? 'Đang lưu…' : 'Lưu cấu hình'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
