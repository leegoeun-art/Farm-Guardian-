import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

const CROPS = ['배추', '무', '고추', '토마토', '오이', '상추', '시금치', '감자', '양파', '마늘'];
const MAX_ZONES = 5;

function StepIndicator({ current, total }) {
  return (
    <div className="step-indicator">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`step-dot${i < current ? ' done' : ''}${i === current - 1 ? ' active' : ''}`} />
      ))}
    </div>
  );
}

export default function NewFieldPage() {
  const { dispatch } = useApp();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 3;

  /* Step 1: 주소 */
  const [address, setAddress] = useState('');
  const [addressConfirmed, setAddressConfirmed] = useState(false);

  /* Step 2: 밭 정보 */
  const [fieldName, setFieldName] = useState('');
  const [crop, setCrop] = useState('배추');

  /* Step 3: 구역 */
  const [zoneCount, setZoneCount] = useState(1);
  const [plantedDates, setPlantedDates] = useState(['', '', '', '', '']);

  function setPlanted(i, val) {
    const arr = [...plantedDates];
    arr[i] = val;
    setPlantedDates(arr);
  }

  function submitField() {
    const name = fieldName.trim() || `${address.split(' ').slice(-1)[0] || '새'} 밭`;
    const zones = Array.from({ length: zoneCount }, (_, i) => {
      const id = String.fromCharCode(65 + i);
      return { id, name: `${id}구역`, crop, planted: plantedDates[i] ?? '', logs: [] };
    });
    dispatch({
      type: 'ADD_FIELD',
      payload: { name, address, crop, zones },
    });
    navigate('/map');
  }

  /* 단계별 유효성 */
  const canNext1 = address.trim().length > 0;
  const canNext2 = crop.length > 0;
  const canSubmit = zoneCount >= 1;

  const BN_ICONS = {
    map: <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17L8 7l5 5 4-7"/><circle cx="8" cy="7" r="1.2" fill="currentColor" stroke="none"/><circle cx="13" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>,
  };

  return (
    <div className="page new-field-page">
      <header className="topbar">
        <button className="tb-back" onClick={() => step > 1 ? setStep(s => s - 1) : navigate(-1)}>←</button>
        <h1 className="tb-title">새 밭 등록</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="nf-progress">
        <StepIndicator current={step} total={TOTAL_STEPS} />
        <span className="nf-step-label">
          {step === 1 ? '위치 확인' : step === 2 ? '밭 정보' : '구역 설정'}
        </span>
      </div>

      <div className="nf-content">

        {/* ── Step 1: 주소 입력 ── */}
        {step === 1 && (
          <div className="nf-step">
            <div className="nf-step-title">
              <span className="nf-step-no">①</span>
              <h2>밭 위치를 입력해 주세요</h2>
            </div>
            <p className="nf-step-desc">주소 또는 지번을 입력하면 팜맵에서 필지를 조회합니다.</p>

            {/* 주소 검색 */}
            <div className="srch" style={{ marginBottom: 12 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="예) 강원도 평창군 대관령면..."
                value={address}
                onChange={(e) => { setAddress(e.target.value); setAddressConfirmed(false); }}
              />
              {address && (
                <button className="srch-clear" onClick={() => { setAddress(''); setAddressConfirmed(false); }}>✕</button>
              )}
            </div>

            {/* 팜맵 결과 모의 UI */}
            {address.length > 3 && (
              <div className="nf-map-mock">
                <div className="nf-map-label">팜맵 조회 결과 (예시)</div>
                <div className="nf-map-parcel">
                  <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 160 }}>
                    <rect width="280" height="160" fill="var(--sunken)" rx="8"/>
                    {/* 배경 격자 */}
                    <path d="M0 40h280M0 80h280M0 120h280M70 0v160M140 0v160M210 0v160" stroke="var(--line)" strokeWidth="0.5"/>
                    {/* 선택 필지 */}
                    <polygon points="90,35 190,30 200,90 180,130 80,125 70,70" fill="var(--accent)" fillOpacity="0.3" stroke="var(--accent)" strokeWidth="2"/>
                    {/* 이웃 필지들 */}
                    <polygon points="30,30 90,35 70,70 30,75" fill="var(--line)" stroke="var(--line)" strokeWidth="1"/>
                    <polygon points="190,30 240,25 250,85 200,90" fill="var(--line)" stroke="var(--line)" strokeWidth="1"/>
                    <polygon points="80,125 180,130 170,150 85,148" fill="var(--line)" stroke="var(--line)" strokeWidth="1"/>
                    {/* 중심 핀 */}
                    <circle cx="135" cy="80" r="6" fill="var(--accent)"/>
                    <path d="M135 74 C135 70 130 66 128 64 C126 62 126 58 128 56 C130 54 140 54 142 56 C144 58 144 62 142 64 C140 66 135 70 135 74Z" fill="var(--accent)" fillOpacity="0.8"/>
                    {/* 면적 텍스트 */}
                    <text x="135" y="108" textAnchor="middle" fill="var(--accent)" fontSize="11" fontFamily="system-ui">약 1,240㎡</text>
                  </svg>
                </div>
                <button
                  className={`nf-confirm-btn${addressConfirmed ? ' confirmed' : ''}`}
                  onClick={() => setAddressConfirmed(true)}
                >
                  {addressConfirmed ? '✓ 이 필지로 확정됨' : '이 필지로 등록'}
                </button>
              </div>
            )}

            <button
              className="btn primary"
              style={{ marginTop: 'auto' }}
              disabled={!canNext1}
              onClick={() => setStep(2)}
            >
              다음 →
            </button>
          </div>
        )}

        {/* ── Step 2: 밭 정보 ── */}
        {step === 2 && (
          <div className="nf-step">
            <div className="nf-step-title">
              <span className="nf-step-no">②</span>
              <h2>밭 정보를 입력해 주세요</h2>
            </div>

            <div className="form-group">
              <label className="fg-label" htmlFor="nf-name">밭 이름 (선택)</label>
              <input
                id="nf-name"
                type="text"
                className="fg-input"
                placeholder="예) 윗밭, 하우스 1동..."
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="fg-label">작물</label>
              <div className="crop-grid">
                {CROPS.map((c) => (
                  <button
                    key={c}
                    className={`crop-chip${crop === c ? ' on' : ''}`}
                    onClick={() => setCrop(c)}
                    type="button"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="nf-summary-card">
              <span className="nf-sum-label">선택 위치</span>
              <span className="nf-sum-val">{address || '—'}</span>
            </div>

            <button
              className="btn primary"
              style={{ marginTop: 'auto' }}
              disabled={!canNext2}
              onClick={() => setStep(3)}
            >
              다음 →
            </button>
          </div>
        )}

        {/* ── Step 3: 구역 설정 ── */}
        {step === 3 && (
          <div className="nf-step">
            <div className="nf-step-title">
              <span className="nf-step-no">③</span>
              <h2>구역을 설정해 주세요</h2>
            </div>
            <p className="nf-step-desc">밭을 몇 구역으로 나눠 관리하나요? 구역마다 심은 날을 따로 기록할 수 있습니다.</p>

            {/* 구역 수 */}
            <div className="form-group">
              <label className="fg-label">구역 수</label>
              <div className="zone-count-row">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    className={`zone-count-btn${zoneCount === n ? ' on' : ''}`}
                    onClick={() => setZoneCount(n)}
                    type="button"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* 구역별 심은 날 */}
            <div className="form-group">
              <label className="fg-label">구역별 심은 날 (선택)</label>
              <div className="zone-dates">
                {Array.from({ length: zoneCount }, (_, i) => (
                  <div key={i} className="zone-date-row">
                    <span className="zdr-label">{String.fromCharCode(65 + i)}구역</span>
                    <input
                      type="date"
                      className="fg-input"
                      value={plantedDates[i] ?? ''}
                      onChange={(e) => setPlanted(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 최종 요약 */}
            <div className="nf-final-summary">
              <div className="nfs-row"><span>밭 이름</span><b>{fieldName || `${address.split(' ').slice(-1)[0] || '새'} 밭`}</b></div>
              <div className="nfs-row"><span>작물</span><b>{crop}</b></div>
              <div className="nfs-row"><span>구역 수</span><b>{zoneCount}개</b></div>
            </div>

            <button
              className="btn primary"
              style={{ marginTop: 'auto' }}
              disabled={!canSubmit}
              onClick={submitField}
            >
              밭 등록 완료
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
