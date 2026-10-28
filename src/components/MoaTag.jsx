import { MOA_MAP } from '../data/seed.js';

export default function MoaTag({ code, showIntl = false }) {
  return (
    <span className="moa">
      <span className="kr">계통 {code}</span>
      {showIntl && MOA_MAP[code] && (
        <span className="in">{MOA_MAP[code]}</span>
      )}
    </span>
  );
}
