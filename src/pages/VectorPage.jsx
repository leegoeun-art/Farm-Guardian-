import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { PESTDB } from '../data/pestDb.js';

/* 알려진 매개충 목록 (배추 바이러스 전파 해충) */
const VECTOR_NAMES = ['진딧물', '총채벌레', '가루이', '응애'];

/* PESTDB에서 매개충 필터 */
function isVector(name) {
  return VECTOR_NAMES.some((v) => name.includes(v));
}

const VECTORS = PESTDB
  .map(([name, type, sci, parts, drugs, , months, grade, symptom]) => ({
    name, type, sci,
    parts: parts ? parts.split(', ') : [],
    drugs: drugs ?? 0,
    months: months ? months.split(', ').map(Number).filter(Boolean) : [],
    grade,
    symptom,
  }))
  .filter((p) => p.type === '해충' && isVector(p.name));

/* 매개충별 전파 바이러스 */
const VIRUS_MAP = {
  '진딧물': 'TuMV, CMV (배추모자이크바이러스)',
  '총채벌레': 'TSWV, INSV (토마토반점위조바이러스)',
  '가루이': 'TYLCV, BBTV (황화잎말림바이러스)',
  '응애': 'ORSV, BYMV',
};

function getVirus(name) {
  for (const [k, v] of Object.entries(VIRUS_MAP)) {
    if (name.includes(k)) return v;
  }
  return '바이러스 전파 가능';
}

/* 월 칩 */
function MonthDots({ months }) {
  const cur = new Date().getMonth() + 1;
  return (
    <div className="pi-months" style={{ marginTop: 4 }}>
      {[9, 10, 11, 12, 1, 2].map((m) => (
        <span key={m} className={`pm${months.includes(m) ? ' on' : ''}`}>{m}월</span>
      ))}
    </div>
  );
}

export default function VectorPage() {
  const { dispatch } = useApp();
  const navigate = useNavigate();

  function goToPest(name) {
    dispatch({ type: 'SET_PEST_SEARCH', payload: name });
    navigate('/pest');
  }

  const BN_ICONS = {
    map: <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17L8 7l5 5 4-7"/><circle cx="8" cy="7" r="1.2" fill="currentColor" stroke="none"/><circle cx="13" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>,
    pest: <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4 C11 4 6 8 6 13 C6 16.3 8.2 19 11 19 C13.8 19 16 16.3 16 13 C16 8 11 4 11 4Z"/><path d="M11 9 L11 19"/><path d="M9 13 C9 13 10 11.5 11 12.5"/></svg>,
    verdict: <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 3 L4 6V11C4 15.4 7 18.8 11 20C15 18.8 18 15.4 18 11V6L11 3Z"/><path d="M8 11l2 2 4-4"/></svg>,
    records: <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="4" width="12" height="15" rx="2"/><path d="M8 8h6M8 11h6M8 14h4"/><path d="M9 4V3a2 2 0 0 1 4 0v1"/></svg>,
  };

  return (
    <div className="page vector-page">
      <header className="topbar">
        <button className="tb-back" onClick={() => navigate(-1)} aria-label="뒤로">←</button>
        <h1 className="tb-title">매개충 안내</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="vector-content">
        {/* 안내 배너 */}
        <div className="vec-banner">
          <div className="vec-banner-icon">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 2L2 19.5h18L11 2z"/>
              <path d="M11 9v5M11 16.5v.5"/>
            </svg>
          </div>
          <div>
            <b style={{ fontSize: 13, display: 'block', marginBottom: 3 }}>바이러스 매개충 주의</b>
            <span style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              아래 해충은 식물 바이러스를 옮길 수 있어<br />
              발견 즉시 방제가 중요합니다.
            </span>
          </div>
        </div>

        {VECTORS.length === 0 ? (
          <div className="empty">
            <span>등록된 매개충 정보가 없습니다</span>
          </div>
        ) : (
          <div className="vec-list">
            {VECTORS.map((p) => (
              <div key={p.name} className="vec-card">
                <div className="vc-top">
                  <div className="vc-icon">
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                      <ellipse cx="11" cy="10" rx="4" ry="6"/>
                      <path d="M7 6 C5 4 3 4 2 5M15 6 C17 4 19 4 20 5"/>
                      <path d="M7 10 C5 9 3 10 2 11M15 10 C17 9 19 10 20 11"/>
                      <path d="M7 14 C5 15 4 17 3 18M15 14 C17 15 18 17 19 18"/>
                    </svg>
                  </div>
                  <div className="vc-info">
                    <span className="vc-name">{p.name}</span>
                    {p.sci && <span className="vc-sci">{p.sci}</span>}
                  </div>
                  {p.grade === '경보' && <span className="tag alert">경보</span>}
                  {p.grade === '주의' && <span className="tag" style={{ background: 'var(--warn-bg)', color: 'var(--warn)' }}>주의</span>}
                </div>

                {/* 전파 바이러스 */}
                <div className="vc-virus">
                  <span className="vc-virus-label">전파 바이러스</span>
                  <span className="vc-virus-val">{getVirus(p.name)}</span>
                </div>

                {/* 발생 월 */}
                <div className="vc-months">
                  <span className="vc-months-label">발생 월</span>
                  <MonthDots months={p.months} />
                </div>

                {/* 등록약 수 */}
                <div className="vc-footer">
                  <span className="vc-drugs">등록 약제 {p.drugs}종</span>
                  <button
                    className="xbtn sm"
                    style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                    onClick={() => goToPest(p.name)}
                  >
                    관련 농약 찾기 →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 추가 안내 */}
        <div className="vec-note">
          <p>매개충은 직접적 피해뿐만 아니라 바이러스를 전파해 작물 전체를 감염시킬 수 있습니다.
          초기 방제 시 등록된 약제를 사용하고 저항성 관리를 위해 계통을 번갈아 사용하세요.</p>
        </div>
      </div>

      {/* 하단 내비 */}
      <nav className="bottom-nav">
        <button className="bn-item" onClick={() => navigate('/map')}>{BN_ICONS.map}<span>지도</span></button>
        <button className="bn-item" onClick={() => navigate('/pest')}>{BN_ICONS.pest}<span>해충</span></button>
        <button className="bn-item" onClick={() => navigate('/verdict')}>{BN_ICONS.verdict}<span>판단</span></button>
        <button className="bn-item" onClick={() => navigate('/records')}>{BN_ICONS.records}<span>이력</span></button>
      </nav>
    </div>
  );
}
