import Chip from './Chip.jsx';

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

export default function PestItem({ pest, verdict, onClick }) {
  const gradeColor = { A: 'var(--bad)', B: 'var(--warn)', C: 'var(--ok)' };

  return (
    <button className="pest-item" onClick={onClick} type="button">
      <div className="pi-left">
        <div className="pi-icon">
          {pest.photo
            ? <img src={pest.photo} alt={pest.name} loading="lazy" />
            : <span>{pest.type === '해충' ? '🐛' : pest.type === '병' ? '🍂' : '🌿'}</span>
          }
        </div>
      </div>
      <div className="pi-body">
        <div className="pi-row1">
          <span className="pi-name">{pest.name}</span>
          {pest.grade && (
            <span
              className="pi-grade"
              style={{ color: gradeColor[pest.grade] ?? 'var(--ink-3)' }}
            >
              {pest.grade}급
            </span>
          )}
          {verdict && <Chip state={verdict} />}
        </div>
        <div className="pi-row2">
          <span className="pi-type">{pest.type}</span>
          {pest.sci && <span className="pi-sci">{pest.sci}</span>}
        </div>
        {pest.months?.length > 0 && (
          <div className="pi-months">
            {MONTHS.map((m, i) => (
              <span
                key={i}
                className={`pm ${pest.months.includes(i + 1) ? 'on' : ''}`}
              >
                {i + 1}
              </span>
            ))}
          </div>
        )}
        <div className="pi-row3">
          <span>등록 농약 <b>{pest.drugs ?? 0}종</b></span>
          {pest.parts?.length > 0 && (
            <span className="pi-parts">{pest.parts.join(', ')}</span>
          )}
        </div>
      </div>
      <svg className="pi-arrow" width="8" height="14" viewBox="0 0 8 14" fill="none">
        <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}
