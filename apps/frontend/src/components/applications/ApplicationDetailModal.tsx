'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import {
  getApplicationDetail,
  parseJd,
  generateCoverLetter,
} from '@/lib/api/applications';
import { getResumes } from '@/lib/api/resumes';
import type { ApplicationDetail, CoverLetter, ParsedJd, Resume } from '@/lib/types';

interface Props {
  applicationId: string;
  onClose: () => void;
}

export function ApplicationDetailModal({ applicationId, onClose }: Props) {
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [language, setLanguage] = useState<'en' | 'vi'>('en');
  const [editedLetter, setEditedLetter] = useState('');
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([getApplicationDetail(applicationId), getResumes()]).then(
      ([detail, resumeList]) => {
        setApp(detail);
        setResumes(resumeList);
        const defaultResume =
          detail.resume ?? resumeList.find((r) => r.isDefault) ?? resumeList[0];
        if (defaultResume) setSelectedResumeId(defaultResume.id);
        const latestLetter = detail.coverLetters?.[0];
        if (latestLetter) setEditedLetter(latestLetter.content);
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
      toast.success('Requirements parsed');
    } catch {
      toast.error('Failed to parse JD');
    } finally {
      setIsParsing(false);
    }
  }

  async function handleGenerateLetter() {
    if (!app || !selectedResumeId) return;
    setIsGenerating(true);
    try {
      const letter = await generateCoverLetter(app.id, {
        resumeId: selectedResumeId,
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

  function copyLetter() {
    navigator.clipboard.writeText(editedLetter);
    toast.success('Copied to clipboard');
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          {app ? (
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{app.jobTitle}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{app.company.name}</p>
            </div>
          ) : (
            <div className="h-10 w-48 bg-gray-100 rounded animate-pulse" />
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4 flex-shrink-0"
          >
            ×
          </button>
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
              {/* JD text */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Job Description</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-6">
                  {app.jobDescription}
                </p>
              </div>

              {/* Parsed Requirements */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Parsed Requirements</h3>
                  <button
                    onClick={handleParseJd}
                    disabled={isParsing}
                    className="text-xs px-3 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition"
                  >
                    {isParsing ? 'Parsing…' : app.parsedJd ? 'Re-parse' : 'Parse JD'}
                  </button>
                </div>

                {app.parsedJd ? (
                  <div className="space-y-3 text-sm">
                    {app.parsedJd.seniorityLevel && (
                      <p>
                        <span className="font-medium text-gray-600">Seniority:</span>{' '}
                        {app.parsedJd.seniorityLevel}
                      </p>
                    )}
                    {app.parsedJd.keyRequirements.length > 0 && (
                      <div>
                        <p className="font-medium text-gray-600 mb-1">Key requirements:</p>
                        <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                          {app.parsedJd.keyRequirements.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {app.parsedJd.requiredSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {app.parsedJd.requiredSkills.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs"
                          >
                            {s}
                          </span>
                        ))}
                        {app.parsedJd.niceToHaveSkills.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    Not parsed yet — click &quot;Parse JD&quot; to extract requirements.
                  </p>
                )}
              </div>

              {/* Cover Letter */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Cover Letter</h3>

                <div className="flex items-center gap-3 mb-3">
                  {resumes.length > 0 ? (
                    <select
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value)}
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
                    disabled={isGenerating || !selectedResumeId}
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
