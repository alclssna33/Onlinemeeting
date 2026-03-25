'use client';

import { PH, S, PH_COLOR, PH_BG } from '@/lib/opening-guide-data';
import { useOpeningProgress } from './useOpeningProgress';

export default function GuideChecklist() {
  const { done, loading, toggle } = useOpeningProgress();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        진행 상황 불러오는 중…
      </div>
    );
  }

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h2 className="text-base font-bold text-gray-800">개원 체크리스트</h2>
        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          🖨 인쇄 / PDF 저장
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-5">
        총 {S.length}단계 중 <span className="font-bold text-green-600">{done.size}단계</span> 완료
      </p>

      <div className="space-y-4">
        {PH.map(ph => {
          const phaseDone = ph.s.filter(i => done.has(i)).length;
          return (
            <div key={ph.id}>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2"
                style={{ background: PH_BG[ph.id] }}
              >
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: PH_COLOR[ph.id] }}>
                  {ph.b}
                </span>
                <span className="text-sm font-bold" style={{ color: PH_COLOR[ph.id] }}>{ph.l}</span>
                <span className="ml-auto text-xs text-gray-400">{phaseDone}/{ph.s.length}</span>
              </div>
              <div className="space-y-1">
                {ph.s.map(si => {
                  const s = S[si];
                  const ck = done.has(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all ${ck ? 'bg-green-50 border-green-200' : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${ck ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                        {ck && <span className="text-white text-[9px] font-bold">✓</span>}
                      </div>
                      <span className="text-xs text-gray-400 w-6 flex-shrink-0 font-semibold">{s.n}.</span>
                      <span className={`text-sm flex-1 leading-snug ${ck ? 'line-through text-gray-400' : ''}`}>{s.t}</span>
                      <span className="text-xs font-semibold flex-shrink-0 whitespace-nowrap" style={{ color: '#1a6faf' }}>{s.d}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
