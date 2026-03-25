'use client';

import { useState } from 'react';
import GuideTimeline from './GuideTimeline';
import GuideGantt from './GuideGantt';
import GuideChecklist from './GuideChecklist';

type Tab = 'guide' | 'gantt' | 'check';

const TABS: { id: Tab; label: string }[] = [
  { id: 'guide', label: '단계별 가이드' },
  { id: 'gantt', label: '준비 일정표' },
  { id: 'check', label: '체크리스트' },
];

export default function OpeningGuidePage() {
  const [tab, setTab] = useState<Tab>('guide');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-[#112b1c] text-white px-4 py-3 sticky top-0 z-20 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-base font-bold mb-2">[일사천리] 병원 개원 프로세스</h1>
          <div className="flex gap-0 border-t border-white/10 -mx-4 px-4">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`py-2 px-4 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${tab === t.id ? 'text-green-400 border-green-400' : 'text-white/50 border-transparent hover:text-white/80'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-2xl mx-auto">
        {tab === 'guide' && <GuideTimeline />}
        {tab === 'gantt' && <GuideGantt />}
        {tab === 'check' && <GuideChecklist />}
      </div>

      {/* Print styles + guide-doc styles */}
      <style>{`
        @media print {
          .sticky { display: none !important; }
          body { background: #fff; }
          @page { size: A4; margin: 15mm; }
        }
        .link-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px; background: #f9fafb;
          border: 1.5px solid #e5e7eb; border-radius: 9px;
          text-decoration: none; color: #1f2937;
          font-size: 0.82rem; font-weight: 500;
          transition: all 0.18s; cursor: pointer; width: 100%; text-align: left;
        }
        .link-item:hover { border-color: #1a6faf; background: #e8f3fc; color: #1a6faf; transform: translateX(3px); }
        .link-icon { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0; }
        .link-badge { font-size: 0.62rem; padding: 2px 7px; border-radius: 99px; background: #e5e7eb; color: #4b5563; flex-shrink: 0; white-space: nowrap; }
        .scrollbar-hide { scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        /* Google Docs HTML styles */
        .guide-doc { color: #1f2937; }
        .guide-doc h1 { font-size: 1.1rem; font-weight: 700; color: #0d4d7a; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 2px solid #e8f3fc; }
        .guide-doc h2 { font-size: 0.98rem; font-weight: 700; margin: 22px 0 10px; padding: 9px 13px; background: #e8f3fc; border-left: 3px solid #1a6faf; border-radius: 0 7px 7px 0; }
        .guide-doc h3 { font-size: 0.91rem; font-weight: 700; color: #1a6faf; margin: 18px 0 8px; padding-left: 10px; border-left: 2px solid #bfdbfe; line-height: 1.4; }
        .guide-doc h4 { font-size: 0.86rem; font-weight: 700; color: #4b5563; margin: 14px 0 6px; }
        .guide-doc p { margin: 0 0 9px; line-height: 1.78; }
        .guide-doc ul, .guide-doc ol { margin: 0 0 12px; padding: 0; list-style: none; }
        .guide-doc ul li { padding: 4px 0 4px 18px; position: relative; line-height: 1.65; }
        .guide-doc ul li::before { content: '•'; position: absolute; left: 5px; color: #1a6faf; font-weight: 700; }
        .guide-doc ol { counter-reset: cnt; }
        .guide-doc ol li { padding: 4px 0 4px 22px; position: relative; counter-increment: cnt; line-height: 1.65; }
        .guide-doc ol li::before { content: counter(cnt)'.'; position: absolute; left: 0; color: #1a6faf; font-weight: 700; font-size: 0.8rem; top: 5px; }
        .guide-doc strong { font-weight: 700; }
        .guide-doc a { color: #1a6faf; text-decoration: none; border-bottom: 1px solid #e8f3fc; }
        .guide-doc a:hover { border-bottom-color: #1a6faf; }
        .guide-doc hr { border: none; border-top: 1px solid #e5e7eb; margin: 18px 0; }
        .guide-doc table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 0.8rem; border-radius: 8px; overflow: hidden; }
        .guide-doc th { background: #e8f3fc; color: #0d4d7a; font-weight: 700; padding: 8px 10px; border: 1px solid #e5e7eb; text-align: left; }
        .guide-doc td { padding: 7px 10px; border: 1px solid #e5e7eb; vertical-align: top; }
        .guide-doc tr:nth-child(even) td { background: #f9fafb; }
      `}</style>
    </div>
  );
}
