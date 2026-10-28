import { useState } from 'react';
import MoaTag from './MoaTag.jsx';
import EvidenceBox from './EvidenceBox.jsx';
import { CHECK_TITLE, VERDICT_LABEL } from '../data/verdictEngine.js';

export default function CheckItem({ check }) {
  const [open, setOpen] = useState(false);
  const { no, state, reason, ev } = check;

  return (
    <details
      className={`check ${state}`}
      open={open}
      onToggle={(e) => setOpen(e.target.open)}
    >
      <summary>
        <span className="no">{no}</span>
        <span className="tt">
          <span className="b">
            {CHECK_TITLE[no]}
            {check.moa && !open && (
              <> &nbsp;{check.moa.map((c) => <MoaTag key={c} code={c} />)}</>
            )}
          </span>
          <span>{VERDICT_LABEL[state]} — {reason}</span>
        </span>
        <span
          className="chip"
          style={{ background: 'none', color: 'inherit', fontSize: 18, padding: '0 4px' }}
          aria-hidden="true"
        >
          {open ? '▲' : '▼'}
        </span>
      </summary>

      <div className="bd">
        {/* ② 시기 */}
        {no === 2 && check.hv && (
          <p style={{ margin: 0 }}>
            오늘 뿌리면 <b>{check.hv}</b>부터 딸 수 있습니다.
            마지막으로 뿌리고 {check.phi}일은 지나야 합니다.
          </p>
        )}

        {/* ③ 횟수 테이블 */}
        {no === 3 && check.rows?.length > 0 && (
          <>
            <table className="ing">
              <thead>
                <tr>
                  <th>성분</th>
                  <th>뿌리는 법</th>
                  <th>쓴 횟수</th>
                  <th>최대</th>
                  <th>남음</th>
                </tr>
              </thead>
              <tbody>
                {check.rows.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{r.rt}</td>
                    <td>{r.used}</td>
                    <td>{r.limit ?? '—'}</td>
                    <td className={r.rem != null && r.rem <= 0 ? 'out' : ''}>
                      {r.rem ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {check.rows.length > 1 && (
              <p style={{ margin: 0, color: 'var(--ink-2)' }}>성분이 둘인 약이라 성분마다 따로 셉니다.</p>
            )}
          </>
        )}

        {/* ④ 계통 흐름 */}
        {no === 4 && (
          <>
            <div className="flow">
              <span>직전</span>
              {check.last ? check.last.map((c) => <MoaTag key={c} code={c} showIntl />) : <span>기록 없음</span>}
              <span>→ 이번</span>
              {check.moa.map((c) => <MoaTag key={c} code={c} showIntl />)}
            </div>
            <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 12 }}>
              계통은 약이 벌레를 죽이는 방식입니다.
              이름이 달라도 번호가 같으면 같은 계통이고, 같은 계통만 거듭 쓰면 약이 잘 안 듣게 됩니다.
            </p>
          </>
        )}

        <EvidenceBox ev={ev} />
      </div>
    </details>
  );
}
