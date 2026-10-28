import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, getField } from '../context/AppContext.jsx';
import { fmtDate } from '../data/verdictEngine.js';
import { DRUGS } from '../data/seed.js';

function drugName(u) {
  const d = DRUGS.find((dd) => dd.id === u);
  return d ? d.b : `약제 #${u}`;
}

export default function RecordsPage() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [filterZone, setFilterZone] = useState('');
  const [confirmVoid, setConfirmVoid] = useState(null);

  const field = getField(state.fields, state.fieldId);

  const allLogs = [];
  if (field) {
    field.zones.forEach((z) => {
      z.logs.forEach((l) => {
        allLogs.push({ ...l, zoneName: z.name, zoneId: z.id });
      });
    });
  }
  allLogs.sort((a, b) => b.d.localeCompare(a.d));

  const filtered = filterZone
    ? allLogs.filter((l) => l.zoneId === filterZone)
    : allLogs;

  function voidLog(log) {
    dispatch({ type: 'VOID_SPRAY_LOG', payload: log.id });
    setConfirmVoid(null);
  }

  const liveLogs = filtered.filter((l) => !l.void);
  const voidedLogs = filtered.filter((l) => l.void);

  return (
    <div className="page records-page">
      <header className="topbar">
        <button className="tb-back" onClick={() => navigate(-1)}>←</button>
        <h1 className="tb-title">살포 이력</h1>
        <div style={{ width: 40 }} />
      </header>

      {/* 구역 필터 */}
      {field?.zones.length > 1 && (
        <div className="zone-filter">
          <button
            className={`pchip${!filterZone ? ' on' : ''}`}
            onClick={() => setFilterZone('')}
          >
            전체
          </button>
          {field.zones.map((z) => (
            <button
              key={z.id}
              className={`pchip${filterZone === z.id ? ' on' : ''}`}
              onClick={() => setFilterZone(z.id)}
            >
              {z.name}
            </button>
          ))}
        </div>
      )}

      {/* 요약 */}
      <div className="records-summary">
        <div className="rs-stat">
          <span className="rs-num">{liveLogs.length}</span>
          <span className="rs-lbl">살포 횟수</span>
        </div>
        <div className="rs-divider" />
        <div className="rs-stat">
          <span className="rs-num">{field?.zones.length ?? 0}</span>
          <span className="rs-lbl">관리 구역</span>
        </div>
        <div className="rs-divider" />
        <div className="rs-stat">
          <span className="rs-num">
            {liveLogs[0]?.d ? fmtDate(liveLogs[0].d) : '—'}
          </span>
          <span className="rs-lbl">최근 살포</span>
        </div>
      </div>

      {/* 이력 목록 */}
      <div className="records-list">
        {filtered.length === 0 ? (
          <div className="empty">
            <span>살포 기록이 없습니다</span>
            <button className="btn" onClick={() => navigate('/pest')} style={{ marginTop: 12 }}>
              농약 찾고 기록하기
            </button>
          </div>
        ) : (
          <>
            {liveLogs.length > 0 && (
              <div className="rec-section">
                <span className="rec-section-title">살포 기록</span>
                {liveLogs.map((l) => (
                  <div key={l.id} className="logr">
                    <div className="lr-left">
                      <span className="lr-date">{fmtDate(l.d)}</span>
                      <span className="lr-zone">{l.zoneName}</span>
                    </div>
                    <div className="lr-mid">
                      <span className="lr-drug">{drugName(l.u)}</span>
                    </div>
                    <button
                      className="xbtn sm"
                      onClick={() => setConfirmVoid(l)}
                      aria-label="기록 취소"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {voidedLogs.length > 0 && (
              <div className="rec-section voided">
                <span className="rec-section-title">취소된 기록</span>
                {voidedLogs.map((l) => (
                  <div key={l.id} className="logr void">
                    <div className="lr-left">
                      <span className="lr-date">{fmtDate(l.d)}</span>
                      <span className="lr-zone">{l.zoneName}</span>
                    </div>
                    <div className="lr-mid">
                      <span className="lr-drug">{drugName(l.u)}</span>
                    </div>
                    <span className="lr-voided">취소됨</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 취소 확인 */}
      {confirmVoid && (
        <div className="modal-overlay" onClick={() => setConfirmVoid(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>기록을 취소하시겠어요?</h3>
            <p>
              {fmtDate(confirmVoid.d)} · {confirmVoid.zoneName}<br />
              <b>{drugName(confirmVoid.u)}</b>
            </p>
            <p style={{ color: 'var(--ink-2)', fontSize: 13 }}>
              취소하면 이 날의 살포가 횟수에서 빠집니다.
            </p>
            <div className="modal-actions">
              <button className="btn bad" onClick={() => voidLog(confirmVoid)}>기록 취소</button>
              <button className="btn" onClick={() => setConfirmVoid(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 하단 내비 */}
      <nav className="bottom-nav">
        <button className="bn-item" onClick={() => navigate('/map')}>
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
        <button className="bn-item active">
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
