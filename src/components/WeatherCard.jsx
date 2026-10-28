import { useApp } from '../context/AppContext.jsx';
import { WX } from '../data/seed.js';

export default function WeatherCard() {
  const { state, dispatch } = useApp();

  if (!state.showWeather) return null;

  const hours = WX.h ?? [];

  return (
    <div className="wx-card">
      <div className="wx-header">
        <div>
          <span className="wx-title">오늘 강수 예보</span>
          <span className="wx-at">{WX.at}</span>
        </div>
        <button
          className="xbtn"
          onClick={() => dispatch({ type: 'TOGGLE_WEATHER' })}
          aria-label="날씨 닫기"
        >
          ✕
        </button>
      </div>
      <div className="wx-hours">
        {hours.map(([time, pct, amt]) => {
          const risky = pct >= 50;
          return (
            <div key={time} className={`wx-hr${risky ? ' risky' : ''}`}>
              <span className="wx-time">{time}</span>
              <div className="wx-bar-wrap">
                <div className="wx-bar" style={{ height: `${pct}%` }} />
              </div>
              <span className={`wx-pct${risky ? ' hi' : ''}`}>{pct}%</span>
              {amt > 0 && <span className="wx-amt">{amt}㎜</span>}
            </div>
          );
        })}
      </div>
      <p className="wx-note">강수 확률 50% 이상인 시간대에는 살포를 피하세요.</p>
    </div>
  );
}
