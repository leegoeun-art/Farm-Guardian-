import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import PestItem from '../components/PestItem.jsx';
import { PESTDB, PARTS } from '../data/pestDb.js';

const GRADE_MAP = { '경보': 'A', '주의': 'B', '설명': 'C' };

function toPest([name, type, sci, partsStr, drugs, , monthsStr, gradeStr]) {
  return {
    name,
    type,
    sci: sci || null,
    parts: partsStr ? partsStr.split(', ') : [],
    drugs: drugs ?? 0,
    photo: null,
    months: monthsStr ? monthsStr.split(', ').map(Number).filter(Boolean) : [],
    grade: GRADE_MAP[gradeStr] ?? null,
  };
}

const PEST_LIST = PESTDB.map(toPest);

export default function PestPage() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    let list = PEST_LIST;
    if (state.pestPart) {
      const vals = state.pestPart.split('|');
      list = list.filter((p) => vals.some((v) => p.parts.includes(v)));
    }
    if (state.pestSearch) {
      const q = state.pestSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sci?.toLowerCase().includes(q) ||
          p.type?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [state.pestSearch, state.pestPart]);

  function selectPest(name) {
    dispatch({ type: 'SELECT_PEST', payload: name });
    navigate('/map');
  }

  return (
    <div className="page pest-page">
      <header className="topbar">
        <button className="tb-back" onClick={() => navigate(-1)} aria-label="뒤로">
          ←
        </button>
        <h1 className="tb-title">해충 선택</h1>
        <button
          className="tb-icon-btn"
          onClick={() => navigate('/vector')}
          aria-label="매개충 안내"
          title="매개충 안내"
          style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--warn)', cursor: 'pointer', fontSize: 18 }}
        >
          ⚠
        </button>
      </header>

      {/* 검색 */}
      <div className="srch-wrap">
        <div className="srch">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="search"
            placeholder="해충 이름 검색…"
            value={state.pestSearch}
            onChange={(e) => dispatch({ type: 'SET_PEST_SEARCH', payload: e.target.value })}
          />
          {state.pestSearch && (
            <button
              className="srch-clear"
              onClick={() => dispatch({ type: 'SET_PEST_SEARCH', payload: '' })}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 부위 필터 */}
      <div className="parts-filter">
        <button
          className={`pchip${!state.pestPart ? ' on' : ''}`}
          onClick={() => dispatch({ type: 'SET_PEST_PART', payload: '' })}
        >
          전체
        </button>
        {PARTS.slice(1).map(([label, val]) => (
          <button
            key={val}
            className={`pchip${state.pestPart === val ? ' on' : ''}`}
            onClick={() => dispatch({ type: 'SET_PEST_PART', payload: val })}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 탭 요약 */}
      <div className="list-summary">
        <span>{filtered.length}종</span>
        {state.selectedPest && (
          <span className="curr-pest">
            선택됨: <b>{state.selectedPest}</b>
            <button
              className="xbtn sm"
              onClick={() => dispatch({ type: 'SELECT_PEST', payload: null })}
            >
              ✕
            </button>
          </span>
        )}
      </div>

      {/* 목록 */}
      <div className="pest-list">
        {filtered.length === 0 ? (
          <div className="empty">
            <span>검색 결과가 없습니다</span>
          </div>
        ) : (
          filtered.map((pest) => (
            <PestItem
              key={pest.name}
              pest={pest}
              onClick={() => selectPest(pest.name)}
            />
          ))
        )}
      </div>

      {/* 하단 내비 */}
      <nav className="bottom-nav">
        <button className="bn-item" onClick={() => navigate('/')}>
          <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17L8 7l5 5 4-7"/>
            <circle cx="8" cy="7" r="1.2" fill="currentColor" stroke="none"/>
            <circle cx="13" cy="12" r="1.2" fill="currentColor" stroke="none"/>
          </svg>
          <span>지도</span>
        </button>
        <button className="bn-item active">
          <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4 C11 4 6 8 6 13 C6 16.3 8.2 19 11 19 C13.8 19 16 16.3 16 13 C16 8 11 4 11 4Z"/>
            <path d="M11 9 L11 19"/>
            <path d="M9 13 C9 13 10 11.5 11 12.5"/>
          </svg>
          <span>해충</span>
        </button>
        <button className="bn-item" onClick={() => navigate('/verdict')}>
          <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 3 L4 6V11C4 15.4 7 18.8 11 20C15 18.8 18 15.4 18 11V6L11 3Z"/>
            <path d="M8 11l2 2 4-4"/>
          </svg>
          <span>판단</span>
        </button>
        <button className="bn-item" onClick={() => navigate('/records')}>
          <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="4" width="12" height="15" rx="2"/>
            <path d="M8 8h6M8 11h6M8 14h4"/>
            <path d="M9 4V3a2 2 0 0 1 4 0v1"/>
          </svg>
          <span>이력</span>
        </button>
      </nav>
    </div>
  );
}
