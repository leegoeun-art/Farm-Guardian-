import { useNavigate } from 'react-router-dom';
import { useApp, getField } from '../context/AppContext.jsx';
import { DRUGS, TODAY } from '../data/seed.js';
import { judge, fmtDate, VERDICT_LABEL } from '../data/verdictEngine.js';
import Chip from '../components/Chip.jsx';

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
    </div>
  );
}
