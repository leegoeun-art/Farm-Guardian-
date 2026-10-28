import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, getField, getZone } from '../context/AppContext.jsx';
import Chip from '../components/Chip.jsx';
import CheckItem from '../components/CheckItem.jsx';
import MoaTag from '../components/MoaTag.jsx';
import PesticideCard from '../components/PesticideCard.jsx';
import { DRUGS, TODAY } from '../data/seed.js';
import { judge, calcAlts, calcDist, fmtDate, VERDICT_LABEL } from '../data/verdictEngine.js';

export default function VerdictPage() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [logging, setLogging] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const field = getField(state.fields, state.fieldId);
  const zone = getZone(field, state.zoneId);
  const drug = DRUGS.find((d) => d.id === state.selectedDrugId);

  const result = useMemo(() => {
    if (!zone || !drug) return null;
    return judge(zone, drug, TODAY);
  }, [zone, drug, state.logSeq]);

  const alts = useMemo(() => {
    if (!zone || !drug || !result) return [];
    return calcAlts(zone, result);
  }, [zone, drug, result]);

  const distData = useMemo(() => {
    if (!zone) return null;
    return calcDist(zone);
  }, [zone, state.logSeq]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2800);
  }

  function addLog() {
    if (!zone || !drug) return;
    dispatch({
      type: 'ADD_SPRAY_LOG',
      payload: {
        fieldId: state.fieldId,
        zoneId: state.zoneId,
        date: TODAY,
        drugId: drug.id,
      },
    });
    setLogging(false);
    showToast('살포 기록이 저장되었습니다.');
  }

  if (!drug) {
    return (
      <div className="page verdict-page">
        <header className="topbar">
          <button className="tb-back" onClick={() => navigate(-1)}>←</button>
          <h1 className="tb-title">살포 판단</h1>
          <div style={{ width: 40 }} />
        </header>
        <div className="empty" style={{ marginTop: 60, gap: 12 }}>
          <span style={{ fontSize: 15, color: 'var(--ink-2)', textAlign: 'center', lineHeight: 1.6 }}>
            지도에서 구역을 탭한 뒤<br />
            해충 → 농약 순서로 선택해 주세요
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--sunken)', borderRadius: 12, padding: '10px 14px' }}>
              <span style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>①</span>
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>지도에서 구역 탭</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--sunken)', borderRadius: 12, padding: '10px 14px' }}>
              <span style={{ color: 'var(--accent)' }}>②</span>
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>해충 선택</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--sunken)', borderRadius: 12, padding: '10px 14px' }}>
              <span style={{ color: 'var(--accent)' }}>③</span>
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>농약 카드 탭 → 판정 확인</span>
            </div>
          </div>
          <button className="btn primary" onClick={() => navigate('/map')} style={{ marginTop: 8 }}>
            지도로 이동
          </button>
        </div>
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
          <button className="bn-item active">
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

  const verdict = result?.state ?? 'UNKNOWN';

  return (
    <div className="page verdict-page">
      <header className="topbar">
        <button className="tb-back" onClick={() => navigate(-1)}>←</button>
        <div className="tb-center">
          <span className="tb-drug-name">{drug.b}</span>
          {zone && <span className="tb-zone-name">{zone.name}</span>}
        </div>
        <div style={{ width: 40 }} />
      </header>

      <div className="verdict-content">
        {/* 종합 판정 */}
        <div className={`vbox ${verdict}`}>
          <div className="vbox-top">
            <Chip state={verdict} />
            <span className="vbox-label">{VERDICT_LABEL[verdict]}</span>
          </div>
          {verdict === 'GREEN' && (
            <p className="vbox-ok">오늘 {fmtDate(TODAY)} 살포 가능합니다.</p>
          )}
          {verdict === 'RED' && (
            <p className="vbox-reason">조건을 충족하지 못해 지금은 사용할 수 없습니다.</p>
          )}
          {verdict === 'AMBER' && (
            <p className="vbox-reason">사용은 가능하지만 주의가 필요합니다.</p>
          )}
          {verdict === 'UNKNOWN' && (
            <p className="vbox-reason">일부 조건을 확인하지 못했습니다.</p>
          )}
          {verdict === 'NA' && (
            <p className="vbox-reason">심을 때 사용하는 약입니다.</p>
          )}
        </div>

        {/* 4개 체크 */}
        {result?.checks && (
          <div className="checks-section">
            <h3 className="section-title">4단계 확인</h3>
            {result.checks.map((c) => (
              <CheckItem key={c.no} check={c} />
            ))}
          </div>
        )}

        {/* 약 상세 */}
        <div className="drug-detail-section">
          <h3 className="section-title">약제 정보</h3>
          <div className="drug-detail-card">
            <div className="dd-row"><span className="dd-label">상표명</span><span className="dd-val">{drug.b}</span></div>
            <div className="dd-row"><span className="dd-label">제품명</span><span className="dd-val">{drug.p}</span></div>
            <div className="dd-row"><span className="dd-label">회사</span><span className="dd-val">{drug.co}</span></div>
            <div className="dd-row"><span className="dd-label">희석</span><span className="dd-val">{drug.rt} · {drug.dil}</span></div>
            <div className="dd-row"><span className="dd-label">수확 전 일수</span><span className="dd-val">{drug.phi != null ? `${drug.phi}일` : '해당 없음'}</span></div>
            <div className="dd-row"><span className="dd-label">최대 횟수</span><span className="dd-val">{drug.max != null ? `${drug.max}회` : '제한 없음'}</span></div>
            {drug.ing?.length > 0 && (
              <div className="dd-row">
                <span className="dd-label">계통</span>
                <span className="dd-val dd-moa">
                  {drug.ing.map(([, moa]) => <MoaTag key={moa} code={moa} showIntl />)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 계통 분포 */}
        {distData?.rows?.length > 0 && (
          <div className="dist-section">
            <h3 className="section-title">이 구역 계통 이력</h3>
            <div className="dist-list">
              {distData.rows.map(({ c, k }) => (
                <div key={c} className="dist-item">
                  <MoaTag code={c} showIntl />
                  <span className="dist-cnt">{k}회</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 대안 약제 */}
        {alts.length > 0 && (
          <div className="alts-section">
            <h3 className="section-title">계통이 다른 대안 약제</h3>
            {alts.slice(0, 3).map(({ cand }) => (
              <PesticideCard
                key={cand.id}
                drug={cand}
                verdict="GREEN"
                onSelect={(id) => dispatch({ type: 'SELECT_DRUG', payload: id })}
              />
            ))}
          </div>
        )}

        {/* 살포 기록 버튼 */}
        <div className="log-action">
          {!logging ? (
            <button
              className="btn primary"
              onClick={() => setLogging(true)}
              disabled={verdict === 'RED'}
            >
              살포 기록하기
            </button>
          ) : (
            <div className="log-confirm">
              <p>오늘 <b>{fmtDate(TODAY)}</b>에 <b>{drug.b}</b>을(를)<br />
                {zone?.name}에 살포한 것으로 기록합니다.</p>
              <div className="log-actions">
                <button className="btn primary" onClick={addLog}>확인</button>
                <button className="btn" onClick={() => setLogging(false)}>취소</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 토스트 */}
      {toastMsg && <div className="toast show">{toastMsg}</div>}

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
        <button className="bn-item active">
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
