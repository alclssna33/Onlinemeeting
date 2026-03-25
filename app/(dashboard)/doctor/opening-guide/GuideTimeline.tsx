'use client';

import { useState, useEffect, useRef } from 'react';
import { PH, S, DOCS, PH_COLOR, PH_BG } from '@/lib/opening-guide-data';
import { useOpeningProgress } from './useOpeningProgress';

interface ModalProps {
  stepId: number | null;
  done: Set<number>;
  onClose: () => void;
  onToggle: (id: number) => void;
}

function StepModal({ stepId, done, onClose, onToggle }: ModalProps) {
  const [activeTab, setActiveTab] = useState('ov');

  useEffect(() => { setActiveTab('ov'); }, [stepId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (stepId === null) return null;
  const s = S[stepId];
  const isDone = done.has(stepId);
  const docTabs = s.det.filter(d => d.dk);
  const nonDocDets = s.det.filter(d => !d.dk);
  const curTab = docTabs.find(d => d.dk === activeTab);
  const curUrl = curTab?.url ?? (docTabs[0]?.url ?? null);

  const tpIcon = (tp?: string) => tp === 'nv' ? '📝' : '📄';
  const tpLabel = (tp?: string) => tp === 'nv' ? '네이버' : '링크';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,20,40,.65)', backdropFilter: 'blur(5px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div style={{ background: 'linear-gradient(135deg,#0d4d7a,#1a6faf)' }} className="text-white px-6 pt-5 pb-0 flex-shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors"
            style={{ background: 'rgba(255,255,255,.18)' }}
          >
            ✕
          </button>
          <div className="text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-1" style={{ background: 'rgba(255,255,255,.2)' }}>
            {s.d}
          </div>
          <div className="text-base font-bold leading-snug pr-8 mb-3">
            Step {s.n}. {s.t}
          </div>
          {/* Modal Tabs */}
          <div className="flex overflow-x-auto scrollbar-hide -mx-6 px-6 border-t border-white/10">
            <button
              className={`py-2 px-4 text-xs font-semibold border-b-2 transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'ov' ? 'text-white border-white font-bold' : 'text-white/60 border-transparent hover:text-white/85'}`}
              onClick={() => setActiveTab('ov')}
            >
              개요
            </button>
            {docTabs.map(d => (
              <button
                key={d.dk}
                className={`py-2 px-4 text-xs font-semibold border-b-2 transition-all whitespace-nowrap flex-shrink-0 ${activeTab === d.dk ? 'text-white border-white font-bold' : 'text-white/60 border-transparent hover:text-white/85'}`}
                onClick={() => setActiveTab(d.dk!)}
              >
                {d.tx.length > 9 ? d.tx.substring(0, 9) + '…' : d.tx}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'ov' && (
            <div className="p-6">
              <SectionTitle>핵심 포인트</SectionTitle>
              <div
                className="text-sm leading-7 text-amber-800 mb-5 pl-3 py-3 pr-4 rounded-r-lg border-l-4"
                style={{ background: '#fffbeb', borderColor: '#f59e0b' }}
                dangerouslySetInnerHTML={{ __html: s.tip }}
              />
              {nonDocDets.length > 0 && (
                <>
                  <SectionTitle>체크리스트</SectionTitle>
                  <div className="flex flex-col gap-1.5 mb-5">
                    {nonDocDets.map((d, i) => (
                      <a key={i} href={d.url ?? '#'} target="_blank" rel="noopener" className="link-item">
                        <div className="link-icon bg-green-100">{tpIcon(d.tp)}</div>
                        <span className="flex-1 text-sm">{d.tx}</span>
                        <span className="link-badge">{tpLabel(d.tp)}</span>
                      </a>
                    ))}
                  </div>
                </>
              )}
              {s.tls.length > 0 && (
                <>
                  <SectionTitle>도구 / 시스템</SectionTitle>
                  <div className="flex flex-col gap-1.5 mb-5">
                    {s.tls.map((t, i) => (
                      <a key={i} href={t.url ?? '#'} target="_blank" rel="noopener" className="link-item">
                        <div className="link-icon bg-purple-100">🔧</div>
                        <span className="flex-1 text-sm">{t.tx}</span>
                        <span className="link-badge">도구</span>
                      </a>
                    ))}
                  </div>
                </>
              )}
              {s.gb.length > 0 && (
                <>
                  <SectionTitle>개비공 서비스</SectionTitle>
                  <div className="flex flex-col gap-1.5 mb-5">
                    {s.gb.map((g, i) =>
                      g.url ? (
                        <a key={i} href={g.url} target="_blank" rel="noopener" className="link-item">
                          <div className="link-icon bg-pink-100">🏥</div>
                          <span className="flex-1 text-sm">{g.tx}</span>
                          <span className="link-badge">개비공</span>
                        </a>
                      ) : (
                        <div key={i} className="link-item opacity-50 pointer-events-none">
                          <div className="link-icon bg-pink-100">🏥</div>
                          <span className="flex-1 text-sm">{g.tx}</span>
                          <span className="link-badge">로그인 필요</span>
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
              {docTabs.length > 0 && (
                <>
                  <SectionTitle>상세 가이드 문서</SectionTitle>
                  <div className="flex flex-col gap-1.5">
                    {docTabs.map(d => (
                      <button key={d.dk} onClick={() => setActiveTab(d.dk!)} className="link-item text-left">
                        <div className="link-icon bg-blue-100">📄</div>
                        <span className="flex-1 text-sm">{d.tx}</span>
                        <span className="link-badge">읽기 →</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {docTabs.map(d => activeTab === d.dk && (
            <div key={d.dk} className="p-6">
              <div
                className="guide-doc text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: DOCS[d.dk!]?.html ?? '<p>문서를 불러올 수 없습니다.</p>' }}
              />
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex gap-2 bg-white flex-shrink-0">
          <button
            onClick={() => onToggle(stepId)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${isDone ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-green-600 text-white hover:bg-green-700'}`}
          >
            {isDone ? '완료 취소' : '완료 체크 ✓'}
          </button>
          {curUrl && (
            <a
              href={curUrl}
              target="_blank"
              rel="noopener"
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors whitespace-nowrap"
            >
              원문 열기 ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2 after:flex-1 after:h-px after:bg-gray-200">
      {children}
    </div>
  );
}

export default function GuideTimeline() {
  const { done, loading, toggle } = useOpeningProgress();
  const [openStep, setOpenStep] = useState<number | null>(null);
  const [activePhase, setActivePhase] = useState(PH[0].id);
  const phaseRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToPhase = (id: string) => {
    phaseRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActivePhase(id);
  };

  const progress = Math.round(done.size / S.length * 100);

  return (
    <div>
      {/* Phase filter tabs */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100 px-4 py-2 flex gap-1 overflow-x-auto scrollbar-hide">
        {PH.map(ph => (
          <button
            key={ph.id}
            onClick={() => scrollToPhase(ph.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activePhase === ph.id ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
            style={activePhase === ph.id ? { background: PH_COLOR[ph.id] } : {}}
          >
            {ph.b}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-400 whitespace-nowrap">
          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="font-semibold text-gray-600">{done.size} / {S.length}</span>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
          진행 상황 불러오는 중…
        </div>
      )}

      {/* Timeline */}
      {!loading && (
        <div className="px-4 py-5 max-w-2xl mx-auto space-y-8">
          {PH.map(ph => (
            <div
              key={ph.id}
              id={`ph-${ph.id}`}
              ref={el => { phaseRefs.current[ph.id] = el; }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="px-3 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: PH_BG[ph.id], color: PH_COLOR[ph.id] }}
                >
                  {ph.b}
                </span>
                <span className="text-sm font-bold text-gray-700">{ph.l}</span>
                <span className="ml-auto text-xs text-gray-400">{ph.s.length}단계</span>
              </div>

              <div className="relative pl-6">
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gray-200 rounded" />
                {ph.s.map(si => {
                  const s = S[si];
                  const isDone = done.has(s.id);
                  const hasDocs = s.det.some(d => d.dk || d.url);
                  const hasTools = s.tls.length > 0;
                  const hasGb = s.gb.length > 0;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setOpenStep(s.id)}
                      className={`relative bg-white rounded-xl border-[1.5px] px-4 py-3 mb-2 cursor-pointer transition-all flex items-start gap-3 group hover:-translate-y-px ${isDone ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-400 hover:shadow-md'}`}
                    >
                      <div
                        className={`absolute -left-3.5 top-4 w-3 h-3 rounded-full border-2 border-white transition-all ${isDone ? 'bg-green-500 shadow-[0_0_0_2px_#bbf7d0]' : 'bg-gray-400 shadow-[0_0_0_2px_#e5e7eb] group-hover:bg-blue-500'}`}
                      />
                      <button
                        onClick={e => { e.stopPropagation(); toggle(s.id); }}
                        className={`w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${isDone ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'}`}
                      >
                        {isDone && <span className="text-white text-[9px] font-bold">✓</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#e8f3fc', color: '#1a6faf' }}>{s.d}</span>
                          <span className="text-xs text-gray-400">Step {s.n}</span>
                        </div>
                        <div className={`text-sm font-semibold leading-snug ${isDone ? 'line-through text-gray-400' : ''}`}>{s.t}</div>
                        {(hasDocs || hasTools || hasGb) && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {hasDocs && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">가이드</span>}
                            {hasTools && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">도구</span>}
                            {hasGb && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700">개비공</span>}
                          </div>
                        )}
                      </div>
                      <span className="text-gray-300 text-base mt-0.5 flex-shrink-0 transition-all group-hover:text-blue-400 group-hover:translate-x-0.5">›</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <StepModal
        stepId={openStep}
        done={done}
        onClose={() => setOpenStep(null)}
        onToggle={toggle}
      />
    </div>
  );
}
