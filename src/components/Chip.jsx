import { VERDICT_LABEL } from '../data/verdictEngine.js';

export default function Chip({ state, className = '' }) {
  return (
    <span className={`chip ${state} ${className}`.trim()}>
      {VERDICT_LABEL[state] ?? state}
    </span>
  );
}
