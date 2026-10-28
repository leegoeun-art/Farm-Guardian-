import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, getField } from '../context/AppContext.jsx';
import { fmtDate } from '../data/verdictEngine.js';
import { DRUGS, TODAY } from '../data/seed.js';

function drugName(u) {
  const d = DRUGS.find((dd) => dd.id === u);
  return d ? d.b : `약제 #${u}`;
}

export default function RecordsPage() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [filterZone, setFilterZone] = useState('');
  const [confirmVoid, setConfirmVoid] = useState(null);
  const [addingLog, setAddingLog] = useState(false);
  const [newLogDate, setNewLogDate] = useState(TODAY);
  const [newLogZoneId, setNewLogZoneId] = useState('');
  const [newLogDrugId, setNewLogDrugId] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const field = getField(state.fields, state.fieldId);

  const defaultZoneId = field?.zones[0]?.id ?? '';
  const defaultDrugId = DRUGS[0]?.id ?? '';

  function openAddLog() {
    setNewLogDate(TODAY);
    setNewLogZoneId(filterZone || defaultZoneId);
    setNewLogDrugId(String(defaultDrugId));
    setAddingLog(true);
  }

  function submitLog() {
    const zid = newLogZoneId || defaultZoneId;
    const did = parseInt(newLogDrugId || defaultDrugId);
    if (!newLogDate || !zid) return;
    dispatch({
      type: 'ADD_SPRAY_LOG',
      payload: { fieldId: state.fieldId, zoneId: zid, date: newLogDate, drugId: did },
    });
    setAddingLog(false);
    showToast('살포 기록이 저장되었습니다.');
  }

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2800);
  }

  function voidLog(log) {
    dispatch({ type: 'VOID_SPRAY_LOG', payload: log.id });
    setConfirmVoid(null);
    showToast('기록이 취소되었습니다.');
  }

  const allLogs = [];
  if (field) {
    field.zones.forEach((z) => {
      z.logs.forEach((l) => {
        allLogs.push({ ...l, zoneName: z.name, zoneId: z.id });
      });
    });
  }
  allLogs.sort((a, b) => b.d.localeCompare(a.d));

  const filtered = filterZone ? allLogs.filter((l) => l.zoneId === filterZone) : allLogs;
  const liveLogs = filtered.filter((l) => !l.void);
  const voidedLogs = filtered.filter((l) => l.void);

  const BN_ICONS = {
    map: (
      <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17L8 7l5 5 4-7"/>
        <circle cx="8" cy="7" r="1.2" fill="currentColor" stroke="none"/>
        <circle cx="13" cy="12" r="1.2" fill="currentColor" stroke="none"/>
      </svg>
    ),
    pest: (
      <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4 C11 4 6 8 6 13 C6 16.3 8.2 19 11 19 C13.8 19 16 16.3 16 13 C16 8 11 4 11 4Z"/>
        <path d="M11 9 L11 19"/><path d="M9 13 C9 13 10 11.5 11 12.5"/>
      </svg>
    ),
    verdict: (
      <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 3 L4 6V11C4 15.4 7 18.8 11 20C15 18.8 18 15.4 18 11V6L11 3Z"/>
        <path d="M8 11l2 2 4-4"/>
      </svg>
    ),
    records: (
      <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="4" width="12" height="15" rx="2"/>
        <path d="M8 8h6M8 11h6M8 14h4"/>
        <path d="M9 4V3a2 2 0 0 1 4 0v1"/>
      </svg>
    ),
  };

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
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ marginBottom: 8, opacity: .4 }}>
              <rect x="8" y="6" width="24" height="30" rx="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M14 15h12M14 20h12M14 25h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontWeight: 600, fontSize: 14 }}>살포 기록이 없습니다</span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
              아래 + 버튼으로 기록을 추가하거나<br />
              해충을 선택하고 약을 찾아보세요
            </span>
            <button className="btn" onClick={() => navigate('/pest')} style={{ marginTop: 12, maxWidth: 200 }}>
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

      {/* 기록 추가 FAB */}
      <button className="fab" onClick={openAddLog} aria-label="살포 기록 추가">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M10 4v12M4 10h12"/>
        </svg>
      </button>

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

      {/* 살포 기록 추가 모달 */}
      {addingLog && (
        <div className="modal-overlay" onClick={() => setAddingLog(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="bs-handle" style={{ margin: '0 auto 12px' }} />
            <h3>살포 기록 추가</h3>

            {/* 구역 선택 */}
            {field?.zones.length > 1 && (
              <div className="form-group">
                <label className="fg-label">구역</label>
                <div className="pchips" style={{ flexWrap: 'wrap' }}>
                  {field.zones.map((z) => (
                    <button
                      key={z.id}
                      className={`pchip${newLogZoneId === z.id ? ' on' : ''}`}
                      onClick={() => setNewLogZoneId(z.id)}
                      type="button"
                    >
                      {z.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 날짜 */}
            <div className="form-group">
              <label className="fg-label" htmlFor="log-date">살포 날짜</label>
              <input
                id="log-date"
                type="date"
                className="fg-input"
                value={newLogDate}
                onChange={(e) => setNewLogDate(e.target.value)}
                max={TODAY}
              />
            </div>

            {/* 약제 선택 */}
            <div className="form-group">
              <label className="fg-label" htmlFor="log-drug">약제</label>
              <select
                id="log-drug"
                className="fg-input"
                value={newLogDrugId}
                onChange={(e) => setNewLogDrugId(e.target.value)}
              >
                {DRUGS.map((d) => (
                  <option key={d.id} value={d.id}>{d.b} — {d.p}</option>
                ))}
              </select>
            </div>

            <div className="modal-actions" style={{ marginTop: 4 }}>
              <button className="btn primary" onClick={submitLog}>저장</button>
              <button className="btn" onClick={() => setAddingLog(false)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toastMsg && <div className="toast show">{toastMsg}</div>}

      {/* 하단 내비 */}
      <nav className="bottom-nav">
        <button className="bn-item" onClick={() => navigate('/map')}>{BN_ICONS.map}<span>지도</span></button>
        <button className="bn-item" onClick={() => navigate('/pest')}>{BN_ICONS.pest}<span>해충</span></button>
        <button className="bn-item" onClick={() => navigate('/verdict')}>{BN_ICONS.verdict}<span>판단</span></button>
        <button className="bn-item active">{BN_ICONS.records}<span>이력</span></button>
      </nav>
    </div>
  );
}
