import { useNavigate } from 'react-router-dom';
import { useApp, getField } from '../context/AppContext.jsx';

export default function FieldSetupPage() {
  const { state } = useApp();
  const navigate = useNavigate();
  const field = getField(state.fields, state.fieldId);

  return (
    <div className="page setup-page">
      <header className="topbar">
        <button className="tb-back" onClick={() => navigate(-1)}>←</button>
        <h1 className="tb-title">밭 · 구역 관리</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="setup-content">
        {field && (
          <div className="field-card">
            <div className="fc-header">
              <h2 className="fc-name">{field.name}</h2>
              <span className="fc-crop">{field.crop}</span>
            </div>
            <p className="fc-address">{field.address}</p>
            <div className="fc-zones">
              {field.zones.map((z) => (
                <div key={z.id} className="alt-card">
                  <span className="az-name">{z.name}</span>
                  <span className="az-meta">{z.crop} · 심은 날 {z.planted}</span>
                  <span className="az-count">이력 {z.logs.filter((l) => !l.void).length}건</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="setup-hint">
          <p>밭과 구역 편집은 추후 업데이트될 예정입니다.</p>
          <p>현재는 시드 데이터로 대관령 윗밭 1개 밭, 3개 구역이 기본 제공됩니다.</p>
        </div>

        <button className="btn primary" onClick={() => navigate('/map')}>
          지도로 돌아가기
        </button>
      </div>
    </div>
  );
}
