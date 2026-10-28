import Chip from './Chip.jsx';
import MoaTag from './MoaTag.jsx';

export default function PesticideCard({ drug, verdict, onSelect, selected }) {
  if (!drug) return null;
  const { b, p, co, rt, dil, phi, max, ing } = drug;

  return (
    <button
      className={`drug-card${selected ? ' selected' : ''}`}
      onClick={() => onSelect?.(drug.id)}
      type="button"
    >
      <div className="dc-top">
        <div className="dc-names">
          <span className="dc-brand">{b}</span>
          <span className="dc-product">{p}</span>
        </div>
        {verdict && <Chip state={verdict} />}
      </div>
      <div className="dc-meta">
        <span>{rt}</span>
        <span className="dc-dot">·</span>
        <span>희석 {dil}</span>
        <span className="dc-dot">·</span>
        <span>수확 {phi}일 전까지</span>
        {max != null && (
          <>
            <span className="dc-dot">·</span>
            <span>최대 {max}회</span>
          </>
        )}
      </div>
      <div className="dc-moa">
        {ing?.map(([, moa]) => (
          <MoaTag key={moa} code={moa} showIntl />
        ))}
        {co && <span className="dc-co">{co}</span>}
      </div>
    </button>
  );
}
