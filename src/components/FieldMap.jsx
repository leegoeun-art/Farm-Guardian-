import { PARCELS, MAP_FILLS } from '../data/seed.js';

const HA_SCALE = 0.42 / polyArea([[112,148],[286,126],[300,300],[126,322]]);

function polyArea(p) {
  let s = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    s += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]);
  }
  return Math.abs(s / 2);
}

function centroid(p) {
  return [
    p.reduce((a, q) => a + q[0], 0) / p.length,
    p.reduce((a, q) => a + q[1], 0) / p.length,
  ];
}

function pstr(p) {
  return p.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
}

function lerp(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function zonePoly(fieldPoly, zoneCount, i) {
  const p = fieldPoly;
  if (p.length === 4) {
    const t0 = i / zoneCount, t1 = (i + 1) / zoneCount;
    return [lerp(p[0], p[1], t0), lerp(p[0], p[1], t1), lerp(p[3], p[2], t1), lerp(p[3], p[2], t0)];
  }
  return p;
}

function liveCount(zone) {
  return zone.logs.filter((l) => !l.void).length;
}

export default function FieldMap({ field, selectedZone, onZoneSelect, viewBox = '55 62 300 490' }) {
  const taken = new Set();

  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid slice"
      className="map-bg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      role="img"
      aria-label="밭 경계와 구역을 보여주는 지도"
    >
      {/* 배경 */}
      <rect x="-200" y="-200" width="900" height="900" fill="var(--m-bg)" />

      {/* 필지 */}
      {PARCELS.map((pa) => {
        const used = taken.has(pa.id);
        return (
          <polygon
            key={pa.id}
            points={pstr(pa.p)}
            fill={MAP_FILLS[(pa.f - 1) % MAP_FILLS.length]}
            stroke="var(--m-edge)"
            strokeWidth="1"
            strokeOpacity=".34"
          />
        );
      })}

      {/* 농수로 */}
      <path d="M48 0 C40 110 58 250 36 440" fill="none" stroke="var(--m-edge)" strokeWidth="7" strokeOpacity=".3" />
      <path d="M48 0 C40 110 58 250 36 440" fill="none" stroke="var(--m-edge)" strokeWidth="2" strokeOpacity=".5" strokeDasharray="9 7" />

      {/* 밭 경계 */}
      {field && (
        <>
          <polygon
            points={pstr(field.poly)}
            fill="none"
            stroke="#fff"
            strokeWidth="3.4"
            strokeOpacity=".95"
            strokeLinejoin="round"
          />
          {/* 구역들 */}
          {field.zones.map((z, i) => {
            const poly = zonePoly(field.poly, field.zones.length, i);
            const on = z.id === selectedZone;
            const n = liveCount(z);
            const c = centroid(poly);
            return (
              <g
                key={z.id}
                style={{ cursor: 'pointer' }}
                onClick={() => onZoneSelect?.(z.id)}
              >
                <polygon
                  points={pstr(poly)}
                  fill={on ? 'rgba(31,79,216,.46)' : 'rgba(255,255,255,.1)'}
                  stroke="#fff"
                  strokeWidth={on ? 2.6 : 1.5}
                  strokeOpacity={on ? 1 : .75}
                  strokeDasharray={n === 0 ? '7 5' : undefined}
                  strokeLinejoin="round"
                />
                <text className="z-lbl" x={c[0]} y={c[1]} textAnchor="middle">
                  {z.name}
                </text>
                <text className="z-sub" x={c[0]} y={c[1] + 15} textAnchor="middle">
                  {n ? `이력 ${n}건` : '기록 없음'}
                </text>
              </g>
            );
          })}
        </>
      )}
    </svg>
  );
}
