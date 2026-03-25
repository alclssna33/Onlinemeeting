'use client';

import { PH, S, DDAYS, DSPAN, DCOLS, PH_COLOR, PH_BG } from '@/lib/opening-guide-data';

export default function GuideGantt() {
  return (
    <div className="px-4 py-6 overflow-x-auto">
      <div className="min-w-[640px]">
        <h2 className="text-base font-bold text-gray-800 mb-1">준비 일정표</h2>
        <p className="text-xs text-gray-400 mb-6">D-120(개원 4개월 전)부터 D-day까지 단계별 준비 일정 · 색상은 단계 구간을 의미합니다.</p>

        {/* Column headers */}
        <div className="flex mb-1">
          <div className="w-44 flex-shrink-0" />
          <div className="flex-1 relative h-4">
            {DCOLS.map(c => {
              const pos = ((DSPAN - (DDAYS[c] ?? 0)) / DSPAN * 100).toFixed(2);
              return (
                <div
                  key={c}
                  className="absolute text-[10px] text-gray-400 whitespace-nowrap border-l border-dashed border-gray-200 pl-0.5"
                  style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
                >
                  {c}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rows by phase */}
        {PH.map(ph => (
          <div key={ph.id}>
            <div
              className="text-[11px] font-bold tracking-wide uppercase py-1 mb-1 mt-4 border-b border-gray-200"
              style={{ color: PH_COLOR[ph.id], paddingLeft: '176px' }}
            >
              {ph.l}
            </div>
            {ph.s.map(si => {
              const s = S[si];
              const startDay = DDAYS[s.d] ?? 0;
              const left = ((DSPAN - startDay) / DSPAN * 100).toFixed(2);
              const width = Math.max((startDay / DSPAN * 100), 2).toFixed(2);
              return (
                <div key={s.id} className="flex items-center mb-1 min-h-[28px]">
                  <div className="w-44 flex-shrink-0 pr-2 text-right text-[11px] text-gray-500 leading-tight overflow-hidden" title={`Step ${s.n}. ${s.t}`}>
                    <span className="font-bold text-[10px] mr-1" style={{ color: PH_COLOR[ph.id] }}>{s.n}.</span>
                    {s.t}
                  </div>
                  <div className="flex-1 relative h-5 bg-gray-100 rounded overflow-visible">
                    {/* Grid lines */}
                    {DCOLS.map(c => {
                      const gp = ((DSPAN - (DDAYS[c] ?? 0)) / DSPAN * 100).toFixed(2);
                      return <div key={c} className="absolute top-0 bottom-0 w-px bg-black/5" style={{ left: `${gp}%` }} />;
                    })}
                    {/* Bar */}
                    <div
                      className="absolute h-full rounded flex items-center px-1.5 opacity-80"
                      style={{ left: `${left}%`, width: `${width}%`, background: PH_COLOR[ph.id] }}
                    >
                      <span className="text-[10px] font-bold text-white whitespace-nowrap">{s.n}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
