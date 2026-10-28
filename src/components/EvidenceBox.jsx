export default function EvidenceBox({ ev }) {
  if (!ev) return null;
  return (
    <div className="evid">
      {ev.raw && <span>원문 <b>「{ev.raw}」</b></span>}
      <span>{ev.src}</span>
      <span>자료 기준일 {ev.base}</span>
    </div>
  );
}
