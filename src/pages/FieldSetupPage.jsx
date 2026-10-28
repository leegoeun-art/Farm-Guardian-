import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, getField } from '../context/AppContext.jsx';

export default function FieldSetupPage() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const field = getField(state.fields, state.fieldId);
  const [editingZone, setEditingZone] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2400);
  }

  function startEdit(zone) {
    setEditingZone(zone.id);
    setEditDate(zone.planted ?? '');
  }

  function saveDate(zoneId) {
    dispatch({ type: 'UPDATE_ZONE_PLANTED', payload: { fieldId: field.id, zoneId, planted: editDate } });
    setEditingZone(null);
    showToast('심은 날이 저장되었습니다.');
  }

  function addZone() {
    if ((field?.zones.length ?? 0) >= 6) return;
    dispatch({ type: 'ADD_ZONE', payload: { fieldId: field.id, planted: '' } });
    showToast('구역이 추가되었습니다.');
  }

  function removeZone(zoneId) {
    dispatch({ type: 'REMOVE_ZONE', payload: { fieldId: field.id, zoneId } });
    setConfirmRemove(null);
    showToast('구역이 삭제되었습니다.');
  }

  const BN_ICONS = {
    map: <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17L8 7l5 5 4-7"/><circle cx="8" cy="7" r="1.2" fill="currentColor" stroke="none"/><circle cx="13" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>,
    pest: <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4 C11 4 6 8 6 13 C6 16.3 8.2 19 11 19 C13.8 19 16 16.3 16 13 C16 8 11 4 11 4Z"/><path d="M11 9 L11 19"/><path d="M9 13 C9 13 10 11.5 11 12.5"/></svg>,
    verdict: <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 3 L4 6V11C4 15.4 7 18.8 11 20C15 18.8 18 15.4 18 11V6L11 3Z"/><path d="M8 11l2 2 4-4"/></svg>,
    records: <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="4" width="12" height="15" rx="2"/><path d="M8 8h6M8 11h6M8 14h4"/><path d="M9 4V3a2 2 0 0 1 4 0v1"/></svg>,
  };

  return (
    <div className="page setup-page">
      <header className="topbar">
        <button className="tb-back" onClick={() => navigate(-1)}>←</button>
        <h1 className="tb-title">밭 · 구역 관리</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="setup-content">

        {/* 밭 전환 (여러 밭 있을 때) */}
        {state.fields.length > 1 && (
          <div className="field-switcher">
            <span className="fs-label">관리 중인 밭</span>
            <div className="fs-list">
              {state.fields.map((f) => (
                <button
                  key={f.id}
                  className={`fs-chip${f.id === state.fieldId ? ' on' : ''}`}
                  onClick={() => dispatch({ type: 'SELECT_FIELD', payload: f.id })}
                  type="button"
                >
                  {f.name}
                  <span className="fs-crop">{f.crop}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 밭 정보 헤더 */}
        {field && (
          <div className="setup-field-header">
            <div className="sfh-top">
              <div>
                <span className="sfh-name">{field.name}</span>
                <span className="sfh-crop">{field.crop}</span>
              </div>
              <span className="sfh-zones">{field.zones.length}개 구역</span>
            </div>
            {field.address && (
              <p className="sfh-address">{field.address}</p>
            )}
          </div>
        )}

        {/* 구역 목록 */}
        <div className="setup-zone-section">
          <div className="szs-header">
            <span className="section-title">구역 관리</span>
          </div>

          <div className="zone-edit-list">
            {field?.zones.map((z) => {
              const liveCount = z.logs.filter((l) => !l.void).length;
              const isEditing = editingZone === z.id;
              const isActive = state.zoneId === z.id;

              return (
                <div
                  key={z.id}
                  className={`zone-edit-card${isActive ? ' active' : ''}`}
                >
                  <div className="zec-top">
                    <div className="zec-left">
                      <div className="zec-badge">{z.id}</div>
                      <div>
                        <span className="zec-name">{z.name}</span>
                        <span className="zec-logs">{liveCount > 0 ? `살포 ${liveCount}건` : '기록 없음'}</span>
                      </div>
                    </div>
                    <div className="zec-actions">
                      {(field?.zones.length ?? 0) > 1 && (
                        <button
                          className="xbtn sm warn"
                          onClick={() => setConfirmRemove(z)}
                          aria-label="구역 삭제"
                        >
                          삭제
                        </button>
                      )}
                      <button
                        className="xbtn sm"
                        onClick={() => isEditing ? setEditingZone(null) : startEdit(z)}
                      >
                        {isEditing ? '취소' : '편집'}
                      </button>
                    </div>
                  </div>

                  {/* 심은 날 표시/편집 */}
                  <div className="zec-planted">
                    <span className="zec-planted-label">심은 날</span>
                    {isEditing ? (
                      <div className="zec-date-edit">
                        <input
                          type="date"
                          className="fg-input"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          style={{ width: 140 }}
                        />
                        <button className="btn primary" style={{ padding: '8px 16px', width: 'auto' }} onClick={() => saveDate(z.id)}>
                          저장
                        </button>
                      </div>
                    ) : (
                      <span className="zec-planted-val">
                        {z.planted || <span style={{ color: 'var(--ink-3)' }}>미입력</span>}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 구역 추가 */}
          {(field?.zones.length ?? 0) < 6 && (
            <button className="zone-add-btn" onClick={addZone}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M8 3v10M3 8h10"/>
              </svg>
              구역 추가
            </button>
          )}
        </div>

        {/* 구분선 */}
        <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />

        {/* 새 밭 등록 */}
        <div className="setup-new-field">
          <p className="snf-hint">다른 밭을 관리하시나요?</p>
          <button className="btn primary" onClick={() => navigate('/new-field')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 6, verticalAlign: 'middle' }}>
              <path d="M8 3v10M3 8h10"/>
            </svg>
            새 밭 등록하기
          </button>
        </div>

        {/* 안내 */}
        <div className="setup-hint">
          <p>밭 이름·작물 변경은 추후 업데이트 예정입니다.</p>
          <p>구역별 심은 날을 정확히 입력하면 수확 전 일수 판정 정확도가 높아집니다.</p>
        </div>

        <button className="btn" onClick={() => navigate('/map')}>
          지도로 돌아가기
        </button>
      </div>

      {/* 구역 삭제 확인 */}
      {confirmRemove && (
        <div className="modal-overlay" onClick={() => setConfirmRemove(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmRemove.name} 삭제</h3>
            <p>이 구역과 살포 이력 {confirmRemove.logs.filter((l) => !l.void).length}건이 모두 삭제됩니다.</p>
            <p style={{ color: 'var(--ink-2)', fontSize: 13 }}>이 작업은 되돌릴 수 없습니다.</p>
            <div className="modal-actions">
              <button className="btn bad" onClick={() => removeZone(confirmRemove.id)}>삭제</button>
              <button className="btn" onClick={() => setConfirmRemove(null)}>취소</button>
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
        <button className="bn-item" onClick={() => navigate('/records')}>{BN_ICONS.records}<span>이력</span></button>
      </nav>
    </div>
  );
}
