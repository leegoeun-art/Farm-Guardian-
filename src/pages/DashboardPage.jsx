import { useNavigate } from 'react-router-dom';
import { useApp, getField } from '../context/AppContext.jsx';
import { DRUGS, TODAY } from '../data/seed.js';
import { judge, fmtDate, VERDICT_LABEL } from '../data/verdictEngine.js';
import Chip from '../components/Chip.jsx';

const BN_ICONS = {
  map: <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17L8 7l5 5 4-7"/><circle cx="8" cy="7" r="1.2" fill="currentColor" stroke="none"/><circle cx="13" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>,
  pest: <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4 C11 4 6 8 6 13 C6 16.3 8.2 19 11 19 C13.8 19 16 16.3 16 13 C16 8 11 4 11 4Z"/><path d="M11 9 L11 19"/><path d="M9 13 C9 13 10 11.5 11 12.5"/></svg>,
  verdict: <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 3 L4 6V11C4 15.4 7 18.8 11 20C15 18.8 18 15.4 18 11V6L11 3Z"/><path d="M8 11l2 2 4-4"/></svg>,
  records: <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="4" width="12" height="15" rx="2"/><path d="M8 8h6M8 11h6M8 14h4"/><path d="M9 4V3a2 2 0 0 1 4 0v1"/></svg>,
};

export default function DashboardPage() {
  const { state } = useApp();
  const navigate = useNavigate();
  const field = getField(state.fields, state.fieldId);

  const zoneSummaries = field?.zones.map((z) => {
    const liveLogs = z.logs.filter((l) => !l.void);
    const verdicts = DRUGS.slice(0, 4).map((d) => judge(z, d, TODAY)?.state ?? 'UNKNOWN');
    const greenCount = verdicts.filter((v) => v === 'GREEN').length;
    return { zone: z, liveLogs, greenCount, total: verdicts.length };
  }) ?? [];

  return (
    <div className="page dashboard-page">
      <header className="topbar">
        <button className="tb-back" onClick={() => navigate(-1)}>←</button>
        <h1 className="tb-title">대시보드</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="dashboard-content">
        <div className="dash-header">
          <h2>{field?.name ?? '밭 없음'}</h2>
          <span className="dash-date">{fmtDate(TODAY)} 기준</span>
        </div>

        <div className="dash-grid">
          {zoneSummaries.map(({ zone, liveLogs, greenCount, total }) => (
            <div key={zone.id} className="dash-card" onClick={() => navigate('/map')}>
              <h3 className="dk-name">{zone.name}</h3>
              <div className="dk-stats">
                <div className="dk-stat">
                  <span className="dk-num">{liveLogs.length}</span>
                  <span className="dk-lbl">살포 이력</span>
                </div>
                <div className="dk-stat">
                  <span className="dk-num" style={{ color: 'var(--ok)' }}>{greenCount}/{total}</span>
                  <span className="dk-lbl">가능 약제</span>
                </div>
              </div>
              <p className="dk-planted">심은 날 {zone.planted}</p>
            </div>
          ))}
        </div>

        <div className="dash-actions">
          <button className="btn primary" onClick={() => navigate('/map')}>지도 보기</button>
          <button className="btn" onClick={() => navigate('/records')}>이력 관리</button>
        </div>
      </div>

      <nav className="bottom-nav">
        <button className="bn-item active">
          {BN_ICONS.map}<span>지도</span>
        </button>
        <button className="bn-item" onClick={() => navigate('/pest')}>
          {BN_ICONS.pest}<span>해충</span>
        </button>
        <button className="bn-item" onClick={() => navigate('/verdict')}>
          {BN_ICONS.verdict}<span>판단</span>
        </button>
        <button className="bn-item" onClick={() => navigate('/records')}>
          {BN_ICONS.records}<span>이력</span>
        </button>
      </nav>
    </div>
  );
}
