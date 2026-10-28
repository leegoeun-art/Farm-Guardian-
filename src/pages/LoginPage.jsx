import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 3 L4 6V11C4 15.4 7 18.8 11 20C15 18.8 18 15.4 18 11V6L11 3Z"/>
        <path d="M8 11l2 2 4-4"/>
      </svg>
    ),
    title: '4단계 적합성 판단', desc: '등록·시기·횟수·계통을 한 번에 확인'
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="14" height="16" rx="2"/>
        <path d="M8 7h6M8 10h6M8 13h4"/>
        <path d="M15 17l1.5 1.5L19 16"/>
      </svg>
    ),
    title: '수확 전 안전 일수', desc: '오늘 뿌리면 며칠 후 수확 가능한지'
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="M11 7v4l3 2"/>
        <path d="M7 17l-2 2M15 17l2 2"/>
      </svg>
    ),
    title: '계통 중복 경고', desc: '같은 계통 반복 사용 시 자동 알림'
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="4" width="12" height="15" rx="2"/>
        <path d="M8 8h6M8 11h6M8 14h4"/>
        <path d="M9 4V3a2 2 0 0 1 4 0v1"/>
      </svg>
    ),
    title: '살포 이력 관리', desc: '구역별 기록으로 횟수 자동 계산'
  },
];

export default function LoginPage() {
  const { dispatch } = useApp();
  const navigate = useNavigate();

  function handleKakao() {
    dispatch({
      type: 'LOGIN',
      payload: { id: 'demo-user', name: '홍길동', email: '2gonii22@gmail.com', avatar: null },
    });
    navigate('/map');
  }

  return (
    <div className="landing">

      {/* ── 히어로 ── */}
      <section className="lnd-hero">
        <div className="lnd-logo-row">
          <div className="lnd-logo-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M7 18 C7 12 10 7 14 7 C18 7 21 12 21 18" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
              <circle cx="14" cy="18" r="3.5" fill="white"/>
              <path d="M11.5 13 Q12 9.5 14 8 Q16 9.5 16.5 13" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="lnd-logo-name">FarmGuardian</span>
        </div>

        <h1 className="lnd-headline">
          농약 살포,<br />
          <em>안전하게</em> 결정하세요.
        </h1>
        <p className="lnd-sub">
          뿌려도 되는지 4단계로 즉시 확인.<br />
          배추 방제를 위한 스마트 판단 도우미.
        </p>

        <div className="lnd-cta-group">
          <button className="lnd-cta-primary" onClick={handleKakao}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M10 2C5.58 2 2 4.87 2 8.4c0 2.19 1.41 4.12 3.55 5.24l-.9 3.34a.25.25 0 00.37.28L9.2 14.8c.26.02.53.04.8.04 4.42 0 8-2.87 8-6.4S14.42 2 10 2z" fill="#3C1E1E"/>
            </svg>
            카카오로 시작하기
          </button>
          <button className="lnd-cta-ghost" onClick={handleKakao}>
            데모로 둘러보기 →
          </button>
        </div>

        <p className="lnd-caption">무료 체험 · 회원가입 필요</p>

        {/* 배경 장식 */}
        <div className="lnd-hero-deco" aria-hidden="true">
          <svg width="100%" height="160" viewBox="0 0 430 160" preserveAspectRatio="none">
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a5c2e" stopOpacity=".0"/>
                <stop offset="100%" stopColor="#0c2616" stopOpacity=".0"/>
              </linearGradient>
            </defs>
            {/* 밭 일러스트 추상 */}
            <ellipse cx="215" cy="140" rx="280" ry="60" fill="#162e14" opacity=".35"/>
            <ellipse cx="80" cy="155" rx="90" ry="22" fill="#1d5c30" opacity=".2"/>
            <ellipse cx="360" cy="152" rx="80" ry="18" fill="#2d8a47" opacity=".15"/>
            {/* 나무 */}
            <rect x="60" y="118" width="8" height="20" rx="2" fill="#1a4522" opacity=".6"/>
            <ellipse cx="64" cy="113" rx="14" ry="16" fill="#265c2e" opacity=".55"/>
            <rect x="340" y="120" width="7" height="18" rx="2" fill="#1a4522" opacity=".6"/>
            <ellipse cx="344" cy="115" rx="12" ry="14" fill="#2d7040" opacity=".5"/>
            {/* 작은 풀 */}
            <ellipse cx="150" cy="148" rx="20" ry="7" fill="#2a6e35" opacity=".3"/>
            <ellipse cx="290" cy="150" rx="16" ry="6" fill="#2a6e35" opacity=".25"/>
          </svg>
        </div>
      </section>

      {/* ── 기능 그리드 ── */}
      <section className="lnd-features">
        <h2 className="lnd-feat-title">이런 점이 달라요</h2>
        <div className="lnd-feat-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="lnd-feat-card">
              <span className="lfc-icon">{f.icon}</span>
              <span className="lfc-title">{f.title}</span>
              <p className="lfc-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 어떻게 작동하나요 ── */}
      <section className="lnd-dark">
        <h2 className="lnd-dark-title">
          추측 말고<br />
          <em className="lnd-em-gold">확인</em>하세요.
        </h2>
        <p className="lnd-dark-body">
          PLS 기준 등록 여부, 수확 전 안전 일수,<br />
          이번 시즌 사용 횟수, 계통 중복까지.<br />
          4가지를 자동으로 따져드립니다.
        </p>
        <div className="lnd-steps">
          <div className="lnd-step"><span className="lnd-step-no">①</span><span>밭 구역 선택</span></div>
          <div className="lnd-step-arrow">→</div>
          <div className="lnd-step"><span className="lnd-step-no">②</span><span>해충 선택</span></div>
          <div className="lnd-step-arrow">→</div>
          <div className="lnd-step"><span className="lnd-step-no">③</span><span>판정 확인</span></div>
        </div>
      </section>

      {/* ── 하단 CTA ── */}
      <section className="lnd-footer-cta">
        <p className="lnd-footer-msg">오늘 살포 전에 한 번만 확인해 보세요.</p>
        <button className="lnd-cta-primary wide" onClick={handleKakao}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M10 2C5.58 2 2 4.87 2 8.4c0 2.19 1.41 4.12 3.55 5.24l-.9 3.34a.25.25 0 00.37.28L9.2 14.8c.26.02.53.04.8.04 4.42 0 8-2.87 8-6.4S14.42 2 10 2z" fill="#3C1E1E"/>
          </svg>
          카카오로 무료 시작
        </button>
        <p className="lnd-terms">
          계속 진행하면 <a href="#">이용약관</a> 및 <a href="#">개인정보처리방침</a>에 동의합니다.
        </p>
      </section>

    </div>
  );
}
