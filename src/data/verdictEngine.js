import { DRUGS, TODAY, BASE_DATE } from './seed.js';

export const drug = (id) => DRUGS.find((d) => d.id === id);

const PSIS = '농약안전정보시스템 PSIS · SVC01';
const IRAC = '농림축산식품부 PLS 안내 · IRAC v11.5';

const HASMAX = (ps) => ps === 'ok' || ps === 'stage' || ps === 'plant';

export function addDays(iso, n) {
  const t = new Date(iso + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

export function dateDiff(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

export function fmtDate(iso) {
  const [, m, d] = iso.split('-');
  return `${+m}월 ${+d}일`;
}

export function liveLog(zone) {
  return zone.logs.filter((l) => !l.void);
}

/* 판정 엔진 — api-spec 11절 하드 룰 */
export function judge(zone, cand, today = TODAY) {
  const hist = liveLog(zone)
    .filter((l) => zone.planted && l.d >= zone.planted)
    .sort((a, b) => (a.d < b.d ? -1 : 1));
  const none = hist.length === 0;
  const ev = (raw, src) => ({ raw, src, base: BASE_DATE });

  /* ① 등록 */
  const c1 = {
    no: 1,
    state: 'GREEN',
    reason: `배추 ${cand.pest}에 쓸 수 있게 등록된 약입니다.`,
    ev: ev(null, PSIS),
  };

  /* ② 시기 (PHI) */
  let c2;
  if (cand.ps === 'ok') {
    const hv = addDays(today, cand.phi);
    c2 = { no: 2, state: 'GREEN', reason: `${fmtDate(hv)}부터 수확할 수 있습니다.`, phi: cand.phi, hv, ev: ev(cand.ut, PSIS) };
  } else if (cand.ps === 'stage') {
    c2 = { no: 2, state: 'NA', phi: null, hv: null, ev: ev(cand.ut, PSIS),
      reason: '심을 때 땅에 넣는 약이라 수확 전 일수가 없습니다.' };
  } else if (cand.ps === 'plant') {
    const due = addDays(zone.planted, cand.pw);
    const over = today > due;
    c2 = { no: 2, state: over ? 'RED' : 'GREEN', phi: null, hv: null, due, ev: ev(cand.ut, PSIS),
      reason: over
        ? `심은 날(${fmtDate(zone.planted)})부터 ${cand.pw}일까지 쓰는 약입니다. ${fmtDate(due)}이 지났습니다.`
        : `심은 날부터 ${cand.pw}일까지 씁니다. ${fmtDate(due)}까지입니다.` };
  } else {
    c2 = { no: 2, state: 'UNKNOWN', phi: null, hv: null, ev: ev(cand.ut, PSIS),
      reason: cand.ps === 'failed' ? '포장지에 적힌 시기를 날짜로 바꾸지 못했습니다.' : '수확 며칠 전까지인지 적혀 있지 않습니다.' };
  }

  /* ③ 횟수 */
  const rows = cand.ing.map(([name]) => {
    let used = 0; const lim = [];
    for (const l of hist) {
      const h = drug(l.u);
      if (!h.ing.some(([n]) => n === name)) continue;
      used++;
      if (h.rt === cand.rt && HASMAX(h.ps) && h.max != null) lim.push(h.max);
    }
    if (cand.max != null) lim.push(cand.max);
    const limit = lim.length ? Math.min(...lim) : null;
    return { name, rt: cand.rt, used, limit, rem: limit == null ? null : limit - used };
  });

  let c3;
  if (!HASMAX(cand.ps) || cand.max == null) {
    c3 = { no: 3, state: 'UNKNOWN', reason: '몇 번까지 쓸 수 있는지 확인하지 못했습니다.', rows, ev: ev(cand.uc, PSIS) };
  } else if (none) {
    c3 = { no: 3, state: 'UNKNOWN', reason: '이 구역에 뿌린 기록이 없습니다.', rows, ev: ev(cand.uc, PSIS) };
  } else {
    const w = rows.reduce((a, b) => ((a.rem ?? 9) <= (b.rem ?? 9) ? a : b));
    const over = rows.some((r) => r.rem != null && r.rem <= 0);
    c3 = {
      no: 3,
      state: over ? 'RED' : 'GREEN',
      rows,
      ev: ev(cand.uc, PSIS),
      reason: over
        ? `${w.name}을 ${w.used}번 썼습니다. 이번 농사에 ${w.limit}번까지라 더 못 씁니다.`
        : `${w.name}을 ${w.used}번 썼습니다. 이번 농사에 ${w.limit}번까지라 ${w.rem}번 남았습니다.`,
    };
  }

  /* ④ 작용기작 */
  const last = hist[hist.length - 1];
  const lm = last ? drug(last.u).ing.map(([, m]) => m) : null;
  const my = cand.ing.map(([, m]) => m);
  let c4;
  if (none) {
    c4 = { no: 4, state: 'UNKNOWN', reason: '직전에 무엇을 뿌렸는지 알 수 없습니다.', moa: my, last: null, ev: ev(null, IRAC) };
  } else {
    const dup = my.filter((m) => lm.includes(m));
    c4 = {
      no: 4,
      state: dup.length ? 'AMBER' : 'GREEN',
      moa: my,
      last: lm,
      ev: ev(null, IRAC),
      reason: dup.length
        ? `직전에 뿌린 ${drug(last.u).b}와 같은 ${dup.join('·')}번 계통입니다.`
        : `직전은 ${lm.join('·')}번, 이번은 ${my.join('·')}번. 계통이 다릅니다.`,
    };
  }

  const cs = [c1, c2, c3, c4];
  const state =
    cs.some((c) => c.state === 'RED') ? 'RED' :
    cs.some((c) => c.state === 'NA')  ? 'NA'  :
    cs.some((c) => c.state === 'UNKNOWN') ? 'UNKNOWN' :
    cs.some((c) => c.state === 'AMBER') ? 'AMBER' : 'GREEN';

  return { cand, state, checks: cs };
}

/* 구역 계통 분포 */
export function calcDist(zone) {
  const L = liveLog(zone).filter((l) => zone.planted && l.d >= zone.planted);
  const n = L.length;
  const m = {};
  for (const l of L) for (const [, c] of drug(l.u).ing) m[c] = (m[c] || 0) + 1;
  return {
    n,
    rows: Object.entries(m).sort((a, b) => b[1] - a[1]).map(([c, k]) => ({ c, k, s: k / n })),
  };
}

/* 대안 약제 */
export function calcAlts(zone, verdict) {
  const mine = verdict.cand.ing.map(([, m]) => m);
  return DRUGS.filter(
    (d) => d.id !== verdict.cand.id &&
           d.pest === verdict.cand.pest &&
           !d.ing.some(([, m]) => mine.includes(m))
  )
    .map((d) => judge(zone, d, TODAY))
    .filter((x) => x.state === 'GREEN');
}

export const VERDICT_LABEL = { GREEN: '가능', AMBER: '주의', RED: '불가', UNKNOWN: '확인 필요', NA: '심을 때' };
export const CHECK_TITLE = { 1: '등록', 2: '시기', 3: '횟수', 4: '계통' };
