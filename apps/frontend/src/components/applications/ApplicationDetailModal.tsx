'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import {
  getApplicationDetail,
  parseJd,
  translateJd,
  matchCv,
  generateCoverLetter,
  updateApplication,
  updateApplicationNotes,
  analyzeCompany,
} from '@/lib/api/applications';
import { getResumes } from '@/lib/api/resumes';
import type { ApplicationDetail, CoverLetter, JobMatch, ParsedJd, Resume } from '@/lib/types';

interface Props {
  applicationId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export function ApplicationDetailModal({ applicationId, onClose, onUpdate }: Props) {
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [jdLanguage, setJdLanguage] = useState<'en' | 'vi'>('en');
  const [translatedJd, setTranslatedJd] = useState<{ keyRequirements: string[]; responsibilities: string[]; benefits: string[] } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<JobMatch | null>(null);
  const [matchResumeId, setMatchResumeId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverLetterResumeId, setCoverLetterResumeId] = useState('');
  const [language, setLanguage] = useState<'en' | 'vi'>('en');
  const [editedLetter, setEditedLetter] = useState('');
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ jobTitle: '', companyName: '', sourceUrl: '', jobDescription: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isAnalyzingCompany, setIsAnalyzingCompany] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([getApplicationDetail(applicationId), getResumes()]).then(
      ([detail, resumeList]) => {
        setApp(detail);
        setResumes(resumeList);
        setNotes(detail.notes ?? '');
        setEditForm({
          jobTitle: detail.jobTitle,
          companyName: detail.company.name,
          sourceUrl: detail.sourceUrl ?? '',
          jobDescription: detail.jobDescription,
        });
        const defaultResume =
          detail.resume ?? resumeList.find((r) => r.isDefault) ?? resumeList[0];
        if (defaultResume) {
          setMatchResumeId(defaultResume.id);
          setCoverLetterResumeId(defaultResume.id);
        }
        const latestLetter = detail.coverLetters?.[0];
        if (latestLetter) setEditedLetter(latestLetter.content);
        if (detail.jobMatch) setMatchResult(detail.jobMatch as JobMatch);
      },
    );
  }, [applicationId]);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  async function handleParseJd() {
    if (!app) return;
    setIsParsing(true);
    try {
      const parsed = await parseJd(app.id);
      setApp((prev) => prev && { ...prev, parsedJd: parsed as ParsedJd });
      setTranslatedJd(null);
      setJdLanguage('en');
      toast.success('Requirements parsed');
    } catch {
      toast.error('Failed to parse JD');
    } finally {
      setIsParsing(false);
    }
  }

  async function handleJdLanguageToggle(lang: 'en' | 'vi') {
    setJdLanguage(lang);
    if (lang === 'vi' && !translatedJd && app?.parsedJd) {
      setIsTranslating(true);
      try {
        const translated = await translateJd(app.id);
        setTranslatedJd(translated);
      } catch {
        toast.error('Không thể dịch JD');
        setJdLanguage('en');
      } finally {
        setIsTranslating(false);
      }
    }
  }

  async function handleMatchCv() {
    if (!app || !matchResumeId) return;
    setIsMatching(true);
    try {
      const result = await matchCv(app.id, matchResumeId);
      setMatchResult(result);
      setApp((prev) => prev && { ...prev, jobMatch: result });
      toast.success('Đã phân tích mức độ phù hợp');
    } catch {
      toast.error('Không thể phân tích — thử lại sau');
    } finally {
      setIsMatching(false);
    }
  }

  async function handleGenerateLetter() {
    if (!app || !coverLetterResumeId) return;
    setIsGenerating(true);
    try {
      const letter = await generateCoverLetter(app.id, {
        resumeId: coverLetterResumeId,
        language,
      });
      setEditedLetter(letter.content);
      setApp((prev) =>
        prev && { ...prev, coverLetters: [letter as CoverLetter, ...prev.coverLetters] },
      );
      toast.success('Cover letter generated');
    } catch {
      toast.error('Failed to generate cover letter');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleAnalyzeCompany() {
    if (!app) return;
    setIsAnalyzingCompany(true);
    try {
      const company = await analyzeCompany(app.id);
      setApp((prev) => prev && { ...prev, company });
      toast.success('Đã phân tích công ty');
    } catch {
      toast.error('Không thể phân tích công ty');
    } finally {
      setIsAnalyzingCompany(false);
    }
  }

  function handleStartEdit() {
    if (!app) return;
    setEditForm({
      jobTitle: app.jobTitle,
      companyName: app.company.name,
      sourceUrl: app.sourceUrl ?? '',
      jobDescription: app.jobDescription,
    });
    setIsEditing(true);
  }

  async function handleSaveEdit() {
    if (!app) return;
    setIsSavingEdit(true);
    try {
      await updateApplication(app.id, {
        jobTitle: editForm.jobTitle.trim() || undefined,
        companyName: editForm.companyName.trim() || undefined,
        jobDescription: editForm.jobDescription.trim() || undefined,
        sourceUrl: editForm.sourceUrl.trim() || null,
      });
      setApp((prev) => prev && {
        ...prev,
        jobTitle: editForm.jobTitle.trim() || prev.jobTitle,
        company: { ...prev.company, name: editForm.companyName.trim() || prev.company.name },
        sourceUrl: editForm.sourceUrl.trim() || null,
        jobDescription: editForm.jobDescription.trim() || prev.jobDescription,
      });
      setIsEditing(false);
      onUpdate?.();
      toast.success('Đã cập nhật');
    } catch {
      toast.error('Không thể cập nhật');
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleSaveNotes() {
    if (!app) return;
    setIsSavingNotes(true);
    try {
      await updateApplicationNotes(app.id, notes);
      setApp((prev) => prev && { ...prev, notes });
      toast.success('Đã lưu ghi chú');
    } catch {
      toast.error('Không thể lưu ghi chú');
    } finally {
      setIsSavingNotes(false);
    }
  }

  function copyLetter() {
    navigator.clipboard.writeText(editedLetter);
    toast.success('Copied to clipboard');
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="glass-light rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          {app ? (
            <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
              {app.company.domain && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://logo.clearbit.com/${app.company.domain}`}
                  alt={app.company.name}
                  className="w-10 h-10 rounded-lg object-contain flex-shrink-0 border border-gray-100 bg-white p-0.5"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-900">{app.jobTitle}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm text-gray-500">{app.company.name}</p>
                  {app.sourceUrl && (
                    <a href={app.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate max-w-[180px]">
                      {app.sourceUrl}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-10 w-48 bg-gray-100 rounded animate-pulse flex-1 mr-4" />
          )}
          <div className="flex items-center gap-2 flex-shrink-0">
            {app && !isEditing && (
              <button
                onClick={handleStartEdit}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
              >
                Chỉnh sửa
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-6">
          {!app ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Edit form */}
              {isEditing && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">Chỉnh sửa thông tin</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Vị trí</label>
                      <input
                        type="text"
                        value={editForm.jobTitle}
                        onChange={(e) => setEditForm((f) => ({ ...f, jobTitle: e.target.value }))}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Công ty</label>
                      <input
                        type="text"
                        value={editForm.companyName}
                        onChange={(e) => setEditForm((f) => ({ ...f, companyName: e.target.value }))}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Link JD</label>
                    <input
                      type="url"
                      value={editForm.sourceUrl}
                      onChange={(e) => setEditForm((f) => ({ ...f, sourceUrl: e.target.value }))}
                      placeholder="https://..."
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Mô tả công việc</label>
                    <textarea
                      value={editForm.jobDescription}
                      onChange={(e) => setEditForm((f) => ({ ...f, jobDescription: e.target.value }))}
                      rows={5}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {isSavingEdit ? 'Đang lưu…' : 'Lưu'}
                    </button>
                  </div>
                </div>
              )}

              {/* JD text */}
              {!isEditing && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Job Description</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-6">
                  {app.jobDescription}
                </p>
              </div>
              )}

              {/* Company Analysis */}
              {!isEditing && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Phân tích công ty</h3>
                  <button
                    onClick={handleAnalyzeCompany}
                    disabled={isAnalyzingCompany}
                    className="text-xs px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition"
                  >
                    {isAnalyzingCompany ? 'Đang phân tích…' : app?.company.analysis ? 'Phân tích lại' : 'Phân tích'}
                  </button>
                </div>

                {app?.company.analysis ? (() => {
                  const a = app.company.analysis!;
                  return (
                    <div className="space-y-3 text-sm">
                      {/* Meta */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-700">
                        {a.industry && <span><span className="font-medium text-gray-500">Ngành:</span> {a.industry}</span>}
                        {a.stage && (
                          <span>
                            <span className="font-medium text-gray-500">Giai đoạn:</span>{' '}
                            <span className={`font-medium ${a.stage === 'Startup' ? 'text-orange-600' : a.stage === 'Scale-up' ? 'text-blue-600' : 'text-gray-700'}`}>{a.stage}</span>
                          </span>
                        )}
                      </div>

                      {a.overview && (
                        <p className="text-gray-700 leading-relaxed">{a.overview}</p>
                      )}

                      {a.techStack.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-600 mb-1">Tech stack</p>
                          <div className="flex flex-wrap gap-1.5">
                            {a.techStack.map((t) => (
                              <span key={t} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {a.culture.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-600 mb-1">Văn hóa</p>
                          <div className="flex flex-wrap gap-1.5">
                            {a.culture.map((c) => (
                              <span key={c} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">{c}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {a.whyJoin.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-600 mb-1">Lý do nên apply</p>
                          <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                            {a.whyJoin.map((w, i) => <li key={i}>{w}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <p className="text-sm text-gray-400 italic">Chưa phân tích — nhấn &quot;Phân tích&quot; để AI tìm hiểu về công ty từ JD.</p>
                )}
              </div>
              )}

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Ghi chú</h3>
                  <button
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="text-xs px-3 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition"
                  >
                    {isSavingNotes ? 'Đang lưu…' : 'Lưu ghi chú'}
                  </button>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Thêm ghi chú cho application này… (deadline, contact, interview notes, v.v.)"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-gray-300"
                />
              </div>

              {/* Parsed Requirements */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Parsed Requirements</h3>
                  <div className="flex items-center gap-2">
                    {app.parsedJd && (
                      <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs">
                        {(['en', 'vi'] as const).map((lang) => (
                          <button
                            key={lang}
                            onClick={() => handleJdLanguageToggle(lang)}
                            disabled={isTranslating}
                            className={clsx(
                              'px-3 py-1 transition',
                              jdLanguage === lang
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:bg-gray-50',
                            )}
                          >
                            {isTranslating && lang === 'vi' ? '…' : lang.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={handleParseJd}
                      disabled={isParsing}
                      className="text-xs px-3 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition"
                    >
                      {isParsing ? 'Parsing…' : app.parsedJd ? 'Re-parse' : 'Parse JD'}
                    </button>
                  </div>
                </div>

                {app.parsedJd ? (() => {
                  const vi = jdLanguage === 'vi' && translatedJd;
                  const keyReqs = vi ? translatedJd.keyRequirements : app.parsedJd.keyRequirements;
                  const resps = vi ? translatedJd.responsibilities : (app.parsedJd.responsibilities ?? []);
                  const bens = vi ? translatedJd.benefits : (app.parsedJd.benefits ?? []);
                  return (
                    <div className="space-y-3 text-sm">
                      {/* Meta row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-700">
                        {app.parsedJd.seniorityLevel && (
                          <span><span className="font-medium text-gray-500">Seniority:</span> {app.parsedJd.seniorityLevel}</span>
                        )}
                        {app.parsedJd.yearsOfExperience && (
                          <span><span className="font-medium text-gray-500">Experience:</span> {app.parsedJd.yearsOfExperience}</span>
                        )}
                        {app.parsedJd.workMode && (
                          <span><span className="font-medium text-gray-500">Mode:</span> {app.parsedJd.workMode}</span>
                        )}
                        {app.parsedJd.location && (
                          <span><span className="font-medium text-gray-500">Location:</span> {app.parsedJd.location}</span>
                        )}
                        {app.parsedJd.salary && (
                          <span><span className="font-medium text-gray-500">Salary:</span> {app.parsedJd.salary}</span>
                        )}
                      </div>

                      {/* Skills — always in original language (technical terms) */}
                      {(app.parsedJd.requiredSkills.length > 0 || app.parsedJd.niceToHaveSkills.length > 0) && (
                        <div className="flex flex-wrap gap-1.5">
                          {app.parsedJd.requiredSkills.map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs">{s}</span>
                          ))}
                          {app.parsedJd.niceToHaveSkills.map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{s}</span>
                          ))}
                        </div>
                      )}

                      {/* Key requirements */}
                      {keyReqs.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-600 mb-1">{jdLanguage === 'vi' ? 'Yêu cầu chính:' : 'Key requirements:'}</p>
                          <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                            {keyReqs.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      )}

                      {/* Responsibilities */}
                      {resps.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-600 mb-1">{jdLanguage === 'vi' ? 'Trách nhiệm:' : 'Responsibilities:'}</p>
                          <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                            {resps.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      )}

                      {/* Benefits */}
                      {bens.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-600 mb-1">{jdLanguage === 'vi' ? 'Phúc lợi:' : 'Benefits:'}</p>
                          <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                            {bens.map((b, i) => <li key={i}>{b}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <p className="text-sm text-gray-400 italic">
                    Not parsed yet — click &quot;Parse JD&quot; to extract requirements.
                  </p>
                )}
              </div>

              {/* CV — JD Match */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Độ phù hợp CV</h3>

                {resumes.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Chưa có CV — upload CV trước.</p>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <select
                        value={matchResumeId}
                        onChange={(e) => setMatchResumeId(e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {resumes.map((r) => (
                          <option key={r.id} value={r.id}>{r.label}{r.isDefault ? ' (default)' : ''}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleMatchCv}
                        disabled={isMatching || !matchResumeId}
                        className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition whitespace-nowrap"
                      >
                        {isMatching ? 'Đang phân tích…' : matchResult ? 'Phân tích lại' : 'Phân tích'}
                      </button>
                    </div>

                    {matchResult && (() => {
                      const s = matchResult.score;
                      const color = s >= 70 ? 'text-green-600' : s >= 50 ? 'text-yellow-600' : 'text-red-500';
                      const bg = s >= 70 ? 'bg-green-50 border-green-200' : s >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
                      const bar = s >= 70 ? 'bg-green-500' : s >= 50 ? 'bg-yellow-400' : 'bg-red-400';
                      return (
                        <div className={`rounded-xl border p-4 space-y-3 text-sm ${bg}`}>
                          {/* Score */}
                          <div className="flex items-center gap-3">
                            <span className={`text-3xl font-bold ${color}`}>{s}%</span>
                            <div className="flex-1">
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${s}%` }} />
                              </div>
                            </div>
                          </div>

                          {matchResult.summary && (
                            <p className="text-gray-700 leading-relaxed">{matchResult.summary}</p>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            {matchResult.matchedSkills.length > 0 && (
                              <div>
                                <p className="font-medium text-gray-600 mb-1">Kỹ năng phù hợp</p>
                                <div className="flex flex-wrap gap-1">
                                  {matchResult.matchedSkills.map((s) => (
                                    <span key={s} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {matchResult.missingSkills.length > 0 && (
                              <div>
                                <p className="font-medium text-gray-600 mb-1">Còn thiếu</p>
                                <div className="flex flex-wrap gap-1">
                                  {matchResult.missingSkills.map((s) => (
                                    <span key={s} className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-xs">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {matchResult.strengths.length > 0 && (
                            <div>
                              <p className="font-medium text-gray-600 mb-1">Điểm mạnh</p>
                              <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                                {matchResult.strengths.map((s, i) => <li key={i}>{s}</li>)}
                              </ul>
                            </div>
                          )}

                          {matchResult.gaps.length > 0 && (
                            <div>
                              <p className="font-medium text-gray-600 mb-1">Điểm cần cải thiện</p>
                              <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                                {matchResult.gaps.map((g, i) => <li key={i}>{g}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* Cover Letter */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Cover Letter</h3>

                <div className="flex items-center gap-3 mb-3">
                  {resumes.length > 0 ? (
                    <select
                      value={coverLetterResumeId}
                      onChange={(e) => setCoverLetterResumeId(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {resumes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                          {r.isDefault ? ' (default)' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-gray-400 flex-1">
                      No resume uploaded — upload one first.
                    </p>
                  )}

                  <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs">
                    {(['en', 'vi'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className={clsx(
                          'px-3 py-1.5 transition',
                          language === lang
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-50',
                        )}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleGenerateLetter}
                    disabled={isGenerating || !coverLetterResumeId}
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition whitespace-nowrap"
                  >
                    {isGenerating ? 'Generating…' : editedLetter ? 'Regenerate' : 'Generate'}
                  </button>
                </div>

                {editedLetter && (
                  <div>
                    <textarea
                      value={editedLetter}
                      onChange={(e) => setEditedLetter(e.target.value)}
                      rows={10}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={copyLetter}
                        className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                      >
                        Copy to clipboard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
