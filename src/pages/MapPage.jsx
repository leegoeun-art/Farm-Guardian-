import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, getField, getZone } from '../context/AppContext.jsx';
import FieldMap from '../components/FieldMap.jsx';
import PesticideCard from '../components/PesticideCard.jsx';
import WeatherCard from '../components/WeatherCard.jsx';
import Chip from '../components/Chip.jsx';
import { DRUGS, TODAY } from '../data/seed.js';
import { judge, liveLog } from '../data/verdictEngine.js';

export default function MapPage() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const field = getField(state.fields, state.fieldId);
  const zone = getZone(field, state.zoneId);

  // 해충 선택 후 지도로 돌아왔을 때 바텀시트 자동 오픈
  useEffect(() => {
    if (state.selectedPest && state.zoneId) {
      setSheetOpen(true);
    }
  }, [state.selectedPest]);

  function selectZone(zoneId) {
    dispatch({ type: 'SELECT_ZONE', payload: zoneId });
    setSheetOpen(true);
    setSheetExpanded(false);
  }

  function goToPest() {
    navigate('/pest');
  }

  function viewDrug(drugId) {
    dispatch({ type: 'SELECT_DRUG', payload: drugId });
    navigate('/verdict');
  }

  const candidateDrugs = state.selectedPest
    ? DRUGS.filter((d) => d.pest === state.selectedPest)
    : DRUGS.slice(0, 6);

  const drugsWithVerdict = candidateDrugs.slice(0, 6).map((d) => ({
    drug: d,
    verdict: zone ? (judge(zone, d, TODAY)?.state ?? 'UNKNOWN') : 'UNKNOWN',
  }));

  const logs = zone ? liveLog(zone) : [];

  return (
    <div className="page map-page">
      {/* 상단 바 */}
      <header className="topbar map-topbar">
        <div className="tb-left">
          <span className="tb-logo">FG</span>
          <div className="tb-center">
            <span className="tb-field">{field?.name ?? '밭 선택 안 됨'}</span>
            {zone && <span className="tb-zone">{zone.name}</span>}
          </div>
        </div>
        <div className="tb-right">
          <button
            className="icon-btn"
            onClick={() => dispatch({ type: 'TOGGLE_WEATHER' })}
            aria-label="날씨 보기"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="7.5" r="2.5"/>
              <path d="M9 2v1M9 13v1M14 7.5h-1M5 7.5H4M12.7 4.8l-.7.7M6 11l-.7.7M12.7 10.2l-.7-.7M6 4.5l-.7-.7"/>
              <path d="M5 13.5a2.5 2.5 0 0 1 0-5h.3A4 4 0 0 1 13 10a2.5 2.5 0 0 1-1 4.8"/>
            </svg>
          </button>
          <button
            className="icon-btn"
            onClick={() => navigate('/setup')}
            aria-label="설정"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="9" r="2"/>
              <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4"/>
            </svg>
          </button>
        </div>
      </header>

      {/* 날씨 카드 */}
      <WeatherCard />

      {/* 지도 */}
      <div className="map-wrap">
        <FieldMap
          field={field}
          selectedZone={state.zoneId}
          onZoneSelect={selectZone}
        />
        {!field && (
          <div className="map-empty-overlay">
            <p>밭을 먼저 등록해 주세요</p>
            <button className="btn" onClick={() => navigate('/setup')}>밭 등록하기</button>
          </div>
        )}
      </div>

      {/* 구역 바텀시트 */}
      {sheetOpen && zone && (
        <div className={`bottom-sheet open${sheetExpanded ? ' expanded' : ''}`}>
          <div className="bs-handle" onClick={() => setSheetExpanded((v) => !v)} />
          <div className="bs-inner">
            <div className="bs-header">
              <h2 className="bs-title">{zone.name}</h2>
              <button className="xbtn" onClick={() => setSheetOpen(false)}>✕</button>
            </div>

            {/* 최근 살포 이력 */}
            {logs.length > 0 && (
              <div className="bs-section">
                <span className="bs-label">최근 살포</span>
                <div className="bs-logs">
                  {logs.slice(0, 2).map((l) => {
                    const drug = DRUGS.find((d) => d.id === l.u);
                    return (
                      <div key={l.id} className="logr mini">
                        <span className="lr-date">{l.d}</span>
                        <span className="lr-drug">{drug?.name ?? l.u}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 해충 선택 */}
            <div className="bs-section">
              <span className="bs-label">해충 선택</span>
              <button className="bs-pest-btn" onClick={goToPest}>
                {state.selectedPest
                  ? <><span className="bp-name">{state.selectedPest}</span><span className="bp-change">변경 →</span></>
                  : <><span className="bp-placeholder">방제 대상 해충을 선택하세요</span><span className="bp-arrow">→</span></>
                }
              </button>
            </div>

            {/* 농약 후보 */}
            {state.selectedPest && drugsWithVerdict.length > 0 && (
              <div className="bs-section">
                <span className="bs-label">추천 농약</span>
                <div className="bs-drugs">
                  {drugsWithVerdict.map(({ drug, verdict }) => (
                    <PesticideCard
                      key={drug.id}
                      drug={drug}
                      verdict={verdict}
                      onSelect={viewDrug}
                    />
                  ))}
                </div>
              </div>
            )}

            <button className="btn primary" onClick={() => navigate('/pest')}>
              해충 선택하고 농약 찾기
            </button>
          </div>
        </div>
      )}

      {/* 하단 내비 */}
      <nav className="bottom-nav">
        <button className="bn-item active">
          <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17L8 7l5 5 4-7"/>
            <circle cx="8" cy="7" r="1.2" fill="currentColor" stroke="none"/>
            <circle cx="13" cy="12" r="1.2" fill="currentColor" stroke="none"/>
          </svg>
          <span>지도</span>
        </button>
        <button className="bn-item" onClick={() => navigate('/pest')}>
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
