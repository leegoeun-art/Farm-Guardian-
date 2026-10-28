# API 명세서

팜가디언 · FE ↔ BE 계약 · **2026-10-27 전면 재작성**

기준 문서
- DB — [DB_시드_전달서.md](DB_시드_전달서.md) 3-1절 스키마 (16테이블, Supabase)
- 경로 — [API_목록.csv](API_목록.csv) (36개, 2026-10-26)
- 동작 — [요구사항 명세서](../shared/팜가디언_요구사항명세서.md) · [PRD](../shared/팜가디언_PRD.md)
- 규칙 — [프로젝트 현황](../internal/프로젝트_현황.md) 4절 하드 룰

> 2026-10-12 판은 DB 확정 전 추정이라 경로·타입이 전부 달랐다. 이 문서가 대체한다.

---

## 0. 읽는 법

| 상황 | 볼 곳 |
|---|---|
| 지금 뭘 먼저 만드나 | 12절 데모 경로 9개 |
| 응답 모양이 궁금 | 2절 공통 타입 |
| 에러를 어떻게 내나 | 1-4절 |
| 판정이 왜 이렇게 나오나 | 11절 하드 룰 + [전달서 4절](DB_시드_전달서.md) |
| 목 데이터가 필요 | 12절 |

경로·메서드·담당·우선순위는 [API_목록.csv](API_목록.csv)가 정본이다. 이 문서는 거기에 요청·응답·예외를 채운 것이다.

---

## 1. 공통 규약

### 1-1. 기본

```
Base URL   https://<host>            접두사 없음 (/api 붙이지 않는다)
형식       application/json; charset=utf-8
날짜       YYYY-MM-DD (KST 기준)
일시       RFC 3339 (2026-10-27T09:00:00+09:00)
좌표       EPSG:5179 (DB 저장) · 응답은 GeoJSON Polygon
```

### 1-2. 인증

카카오 로그인(Supabase Auth)으로 받은 **Supabase JWT**를 보낸다.

```
Authorization: Bearer <access_token>
```

`API-01` `API-02`만 인증 없이 호출한다. 나머지 34개는 전부 필요하다.

**FastAPI는 DB에 직접 붙어 RLS를 거치지 않는다.** 요청마다 JWT에서 `user_id`(UUID)를 꺼내 쿼리 조건에 직접 넣어야 한다. 넣지 않으면 남의 밭이 보인다. 서비스 키·DB 비밀번호는 서버 환경변수에만 둔다.

### 1-3. 응답 형식

성공은 항상 `data` + `meta`다.

```json
{
  "data": { },
  "meta": {
    "base_date": "2026-10-05",
    "sources": ["PSIS SVC01", "NCPMS 도감"]
  }
}
```

| 필드 | 뜻 |
|---|---|
| `meta.base_date` | 응답에 쓰인 **원자료 기준일**. 판정·약제·병해충 응답에 필수 |
| `meta.sources` | 쓰인 출처 이름. 화면에 표기해야 한다 (NFR-08, NCPMS는 CC-BY-NC) |

목록은 `data`가 배열이고 페이지 정보가 붙는다.

```json
{ "data": [ ], "meta": { "base_date": "2026-10-05", "total": 288, "limit": 50, "offset": 0 } }
```

### 1-4. 상태 코드와 에러

```
200  조회·수정 성공
201  생성 성공 (Location 헤더에 새 자원 경로)
204  삭제·취소 성공 (본문 없음)
400  요청 형식 오류
401  토큰 없음·만료
403  남의 자원
404  없음
409  중복·상태 충돌
422  값은 맞지만 처리 불가 (예: 정식일이 오늘보다 미래)
503  외부 API 장애 (팜맵·기상청·카카오)
```

에러 본문:

```json
{
  "error": {
    "code": "ZONE_NOT_FOUND",
    "message": "구역을 찾을 수 없습니다.",
    "detail": { "zone_id": 99 }
  }
}
```

| code | 상태 | 언제 |
|---|---|---|
| `INVALID_REQUEST` | 400 | 필수 값 누락·형식 오류 |
| `INVALID_AUTH_CODE` | 400 | 카카오 인가 코드가 틀림 |
| `UNAUTHORIZED` | 401 | 토큰 없음·만료 |
| `FORBIDDEN` | 403 | 본인 자원이 아님 |
| `NOT_FOUND` | 404 | 일반 |
| `FIELD_NOT_FOUND` / `ZONE_NOT_FOUND` / `PEST_NOT_FOUND` / `PESTICIDE_NOT_FOUND` | 404 | 자원별 |
| `DUPLICATE_RECORD` | 409 | 같은 구역·약·날짜 기록이 이미 있음 |
| `ZONE_HAS_RECORDS` | 409 | 기록이 있는 구역을 지우려 함 |
| `PLANTING_DATE_REQUIRED` | 422 | ③ 계산에 정식일이 필요한데 없음 — **판정에서는 쓰지 않는다** (⚪로 응답) |
| `EXTERNAL_API_UNAVAILABLE` | 503 | 팜맵·기상청 장애 |
| `KAKAO_UNAVAILABLE` | 502 | 카카오 장애 |

**판정 API는 데이터가 모자라도 에러를 내지 않는다.** 해당 체크를 `UNKNOWN`으로 돌려준다 (11절).

### 1-5. 같은 요청 한 번만 반영

`POST /zones/{zoneId}/spray-records`, `.../past`는 `Idempotency-Key` 헤더가 **필수**다.

```
Idempotency-Key: 9f2c1b7e-...
```

같은 키로 다시 오면 저장하지 않고 **처음 응답을 그대로** 돌려준다(200). 키가 없으면 400 `INVALID_REQUEST`. 사용자가 「따로 뿌린 것」이라고 확인한 경우에만 새 키로 보낸다.

---

## 2. 공통 타입

DB 16테이블에서 파생한다. 테이블에 없는 값을 응답에 만들지 않는다.

### 2-1. 판정

```ts
type VerdictState = 'GREEN' | 'AMBER' | 'RED' | 'UNKNOWN' | 'NA';

interface Evidence {
  raw_text:  string | null;   // PSIS 원문 그대로 (safe_use_std.note / pesticide_use.use_time)
  source:    string;          // 'PSIS SVC01' | 'NCPMS 도감' | '농식품부 PLS' | 'IRAC v11.5'
  base_date: string;          // 'YYYY-MM-DD'
}

interface Check {
  no:       1 | 2 | 3 | 4;
  state:    VerdictState;
  reason:   string;           // 사용자에게 보여줄 한 줄
  evidence: Evidence;         // 필수. 근거 없이 상태를 내지 않는다
}
```

체크별 추가 필드:

```ts
interface Check2 extends Check {          // ② 시기
  no: 2;
  phi_days:     number | null;            // safe_use_std.phi_days
  harvest_from: string | null;            // 오늘 뿌리면 언제부터 수확 가능
  use_until:    string | null;            // parse_status='plant_rel'일 때 정식일 + planting_window_days
}

interface IngredientCount {
  ingredient_id: number;
  name:          string;                  // '스피네토람'
  route:         string | null;           // '경엽처리' — 한도를 비교한 처리법 풀
  used:          number;                  // 이번 작기 사용 횟수 (처리법 무관, 성분 전체)
  limit:         number | null;           // 같은 성분 + 같은 처리법 약들의 max_count 최솟값
  remaining:     number | null;           // limit - used. limit이 null이면 null
}

interface Check3 extends Check {          // ③ 횟수
  no: 3;
  ingredients: IngredientCount[];         // 혼합제는 여러 개. 가장 적게 남은 것이 화면 대표
}

interface Check4 extends Check {          // ④ 작용기작
  no: 4;
  moa:          Moa | null;
  last_moa:     Moa | null;               // 직전 살포의 계열
  rule:         string | null;            // rotation_rule.description
  consecutive:  number | null;            // 같은 계열 연속 횟수
}
```

```ts
interface Verdict {
  pesticide: Pesticide;
  state:     VerdictState;                // 최종. 우선순위 RED > NA > UNKNOWN > AMBER > GREEN
  checks:    [Check, Check2, Check3, Check4];
  base_date: string;
}
```

### 2-2. 약·성분·계열

```ts
interface Moa {                           // moa
  moa_id:        number;
  kr_code:       string;                  // '5', '가1'
  intl_code:     string | null;           // 'IRAC 5', 'FRAC 4'
  usage_type:    'fungicide' | 'insecticide';
  is_multi_site: boolean;
}

interface Ingredient {                    // ingredient
  ingredient_id: number;
  name:          string;
  moa:           Moa | null;              // 계열 모르면 null → ④는 UNKNOWN
}

interface Pesticide {                     // pesticide_use + safe_use_std + use_ingredient
  use_id:       number;                   // 이 값이 약의 식별자다. API 경로의 {pesticideId}
  product:      string;                   // 품목명 '스피네토람 액상수화제'
  brand:        string;                   // 상표명 '엑설트'
  company:      string | null;
  usage:        '살균' | '살충' | '균충' | null;
  method:       string | null;            // 원문 '발생 초부터 경엽처리'
  route:        string | null;            // 정규화 '경엽처리' (12종)
  dilution:     string | null;            // '2000배'
  use_time:     string;                   // 원문 '수확7일전'
  use_count:    string;                   // 원문 '3회'
  phi_days:     number | null;
  max_count:    number | null;
  parse_status: 'ok' | 'stage' | 'plant_rel' | 'no_std' | 'failed';
  planting_window_days: number | null;    // plant_rel 전용. 원문 「파종(정식)일부터14일」 → 14
  ingredients:  Ingredient[];             // 혼합제는 2개 이상
  reg_date:     string | null;
}
```

`use_id`가 약의 키다. 같은 상표라도 작물·병해충·처리법이 다르면 다른 `use_id`다.

### 2-3. 병해충

```ts
interface PestSeason {                    // pest_season
  source:   'pdf' | 'ncpms';              // pdf = 농진청 경보(강함), ncpms = 도감 설명(약함)
  months:   number[];                     // [6,7]
  region:   string | null;
  culti:    string | null;
  grade:    string | null;                // '예보' | '주의보'
  evidence: string | null;
}

interface PestPhoto {                     // pest_photo
  photo_id:   number;
  url:        string;
  title:      string | null;
  part:       string | null;
  is_main:    boolean;
  photo_crop: string | null;              // 다른 작물 사진이면 그 작물명. 화면에 표시해야 한다
}

interface Pest {                          // pest
  pest_id:   number;
  crop_id:   number;
  kind:      'disease' | 'insect';
  name:      string;                      // 도감 이름 '배추좀나방'
  sci_name:  string | null;
  parts:     string[];                    // ['잎','벌레']
  symptom:   string | null;
  has_doc:   boolean;                     // false면 사진·증상 없음, 이름 검색으로만 찾힘
  photos:    PestPhoto[];
  seasons:   PestSeason[];
  has_pesticide: boolean;                 // false면 '등록 약 없음' 안내
}
```

### 2-4. 밭·구역·기록

```ts
interface Field {                         // field
  field_id:   number;
  name:       string | null;
  address:    string | null;
  geom:       GeoJSONPolygon | null;
  area_ha:    number | null;
  created_at: string;
  zones:      Zone[];                     // 밭 상세에만
}

interface Zone {                          // zone
  zone_id:     number;
  field_id:    number;
  name:        string;                    // 'A구역'
  crop:        { crop_id: number; name: string } | null;
  planted_at:  string | null;             // null이면 ③④가 UNKNOWN
  plant_count: number | null;
  geom:        GeoJSONPolygon | null;
  area_ha:     number | null;
}

interface SprayRecord {                   // spray_log
  log_id:       number;
  zone_id:      number;
  pesticide:    Pesticide;
  pest:         { pest_id: number; name: string } | null;
  sprayed_at:   string;
  source:       'tap' | 'manual' | 'ocr' | 'receipt' | 'seed';
  cancelled_at: string | null;
  created_at:   string;
}
```

취소는 **소프트 삭제**다. 목록 기본값은 `cancelled_at IS NULL`만 돌려준다.

---

## 3. 로그인 (API-01 ~ 05)

### API-01 `POST /auth/kakao/login` — 카카오 로그인

인증 불필요. **첫 로그인이 곧 회원가입이다.** `auth.users`에 행이 생기고 트리거가 `app_user`를 만든다.

```json
// 요청
{ "code": "<카카오 인가 코드>", "redirect_uri": "https://<host>/auth/callback" }

// 200
{ "data": {
    "access_token": "...", "refresh_token": "...", "expires_in": 3600,
    "user": { "user_id": "uuid", "nickname": "이승석", "onboarded": false },
    "is_new": true
}, "meta": {} }
```

예외 — 400 `INVALID_AUTH_CODE` · 502 `KAKAO_UNAVAILABLE`.

닉네임은 `raw_user_meta_data`의 `nickname` → `name` → `full_name` 순으로 찾는다. **첫 로그인에서 실제로 어느 키로 오는지 확인하고 트리거를 고쳐야 한다** (전달서 미확정 #17).

### API-02 `POST /auth/refresh` — 토큰 재발급

인증 불필요. `{ "refresh_token": "..." }` → API-01과 같은 토큰 묶음.

재발급을 구현하지 않기로 하면 **이 API와 `refresh_token` 필드를 빼고** 만료 시 재로그인시킨다. 둘 중 하나로 정한다.

### API-03 `GET /users/me` — 내 정보

```json
{ "data": { "user_id": "uuid", "nickname": "이승석",
            "onboarded": true, "created_at": "...", "field_count": 1 }, "meta": {} }
```

### API-04 `POST /users/me/onboarding` — 온보딩 완료

안내 동의를 마쳤음을 기록한다. 요청 본문 없음 → 204.

**확인 필요:** 온보딩에서 주 작물 같은 값을 따로 받는지. 받는다면 `app_user`에 컬럼이 필요하다 (현재 스키마에 없다).

### API-05 `DELETE /users/me` — 회원 탈퇴

FastAPI가 Supabase Admin API로 `auth.users`를 지운다. `app_user → field → zone → spray_log`가 연쇄 삭제된다. → 204

**확인 필요:** 카카오 연결 끊기가 실패해도 탈퇴를 진행하나. 지역 통계(P2)에 이력을 남기려면 익명화가 필요하다 (전달서 미확정 #4).

---

## 4. 밭·구역 (API-06 ~ 17)

### API-06 `GET /addresses?q=평창군 대관령면` — 주소 검색

```json
{ "data": [ { "pnu": "5176025021...", "address": "강원특별자치도 평창군 대관령면 ...",
              "jibun": "123-4" } ], "meta": { "total": 3 } }
```

### API-07 `GET /parcels?pnu=...` — 필지 경계

팜맵에서 실제 경작 경계를 가져온다.

```json
{ "data": { "pnu": "...", "geom": { "type": "Polygon", "coordinates": [[...]] },
            "area_ha": 0.42, "srid": 5179 }, "meta": { "sources": ["팜맵"] } }
```

예외 — 503 `EXTERNAL_API_UNAVAILABLE`. **판정 경로가 아니므로 실패해도 다른 기능을 막지 않는다.**

### API-08 `POST /fields` — 밭 등록

```json
{ "pnu": "...", "name": "대관령 윗밭", "address": "...",
  "geom": { "type": "Polygon", "coordinates": [[...]] }, "area_ha": 0.42 }
```
→ 201 + `Location: /fields/{fieldId}`, 본문은 `Field`.

### API-09 `GET /fields` — 내 밭 목록

`Field[]` (구역 제외, `zone_count` 포함).

### API-10 `GET /fields/{fieldId}` — 밭 상세

`Field` + `zones: Zone[]`.

### API-11 `DELETE /fields/{fieldId}` — 밭 삭제

→ 204.

**확인 필요:** 실제 삭제인가 소프트 삭제인가. 살포 기록이 달린 구역이 있으면 409 `ZONE_HAS_RECORDS`로 막을지 함께 정한다. 현재 DDL은 `ON DELETE CASCADE`라 기록까지 지워진다.

### API-12 `POST /fields/{fieldId}/zone-splits/preview` — 구역 나누기 미리보기

저장하지 않는다. 균등 면적으로 나눈 결과만 돌려준다.

```json
// 요청
{ "count": 3, "direction": "auto" }

// 200
{ "data": { "zones": [ { "name": "A구역", "geom": {...}, "area_ha": 0.14 } ],
            "total_area_ha": 0.42, "max_deviation_pct": 1.8 }, "meta": {} }
```

선 그어 직접 나누기는 제외했다 (CSV 비고, BE-30 미확정).

### API-13 `PUT /fields/{fieldId}/zones` — 구역 저장

미리보기 결과를 확정한다. 전체 교체다.

```json
{ "zones": [ { "zone_id": 1, "name": "A구역", "geom": {...}, "crop_id": 2, "planted_at": "2026-08-20" },
             { "name": "D구역", "geom": {...} } ] }
```

`zone_id`가 있으면 수정, 없으면 생성.

**확인 필요:** 기록이 있는 구역이 요청에서 빠졌을 때. 지우면 이력이 사라진다. 409로 막는 쪽을 권한다.

### API-14 `GET /zones/{zoneId}` — 구역 상세

`Zone` + 최근 살포 요약.

```json
{ "data": { "zone_id": 1, "name": "A구역",
            "crop": { "crop_id": 2, "name": "배추" },
            "planted_at": "2026-08-20", "area_ha": 0.14,
            "last_spray": { "sprayed_at": "2026-10-03", "brand": "엑설트",
                            "moa": { "kr_code": "5", "intl_code": "IRAC 5" } },
            "spray_count": 4 },
  "meta": { "base_date": "2026-10-05" } }
```

### API-15 `PATCH /zones/{zoneId}` — 구역 수정

`name` · `crop_id` · `geom` 중 보낸 것만 바꾼다.

작물을 바꾸면 이전 작물의 살포 기록은 **지우지 않는다.** 작기 귀속은 `planted_at` 기준으로 계산한다 (전달서 미확정, 검증 필요).

### API-16 `PUT /zones/{zoneId}/planting-date` — 정식일

```json
{ "planted_at": "2026-08-20" }   // null 허용 = 모름
```

미래 날짜는 422. 정식일을 바꾸면 ③④ 계산 범위가 바뀌므로 **응답에 영향받는 기록 수를 함께 돌려준다.**

```json
{ "data": { "zone_id": 1, "planted_at": "2026-08-20", "affected_records": 4 }, "meta": {} }
```

### API-17 `GET /zones/{zoneId}/summary` — 구역 상태 요약

홈 화면 카드용. 판정을 돌리지 않고 집계만 한다.

```json
{ "data": { "zone_id": 1, "crop": "배추", "planted_at": "2026-08-20",
            "days_since_planting": 68, "spray_count": 4,
            "moa_top": { "kr_code": "5", "count": 2, "share": 0.5 },
            "needs_planting_date": false,
            "active_alerts": [ { "pest_id": 7, "name": "배추좀나방", "grade": "예보" } ] },
  "meta": { "base_date": "2026-10-05" } }
```

---

## 5. 병해충 (API-18 ~ 21)

### API-18 `GET /crops/{crop}/pests` — 작물별 병해충 목록

`{crop}`은 작물 이름(`배추`) 또는 `crop_id`.

```
?kind=insect        disease / insect
?part=잎            pest.parts 포함
?month=10           pest_season.months 포함 (후보를 거르지 않고 배지로만 쓴다)
?has_pesticide=true 등록 약이 있는 것만
```

```json
{ "data": [ { "pest_id": 7, "name": "배추좀나방", "kind": "insect",
              "sci_name": "Plutella xylostella", "parts": ["잎","벌레"],
              "has_doc": true, "has_pesticide": true,
              "main_photo": { "url": "...", "photo_crop": null },
              "season_badge": { "source": "pdf", "grade": "예보", "months": [6,7,8,9,10] } } ],
  "meta": { "base_date": "2026-10-05", "total": 47, "sources": ["NCPMS 도감"] } }
```

**발생 시기로 목록을 거르지 않는다.** `season_badge`로만 표시한다 (하드 룰 4).

### API-19 `GET /pests/search?q=좀나방&crop_id=2` — 이름 검색

`pest.name`과 `pest_alias.alias_name`을 함께 찾는다. PSIS·PDF·NCPMS 이름이 다르기 때문이다.

```json
{ "data": [ { "pest_id": 7, "name": "배추좀나방", "matched_by": "alias",
              "matched_text": "좀나방", "source": "PSIS" } ], "meta": {} }
```

### API-20 `GET /pests/{pestId}` — 병해충 상세

`Pest` 전체 (사진·발생시기 포함).

사진이 다른 작물 것이면 `photo_crop`이 채워진다. **화면에 「양배추 사진」처럼 표시해야 한다.** 출처(NCPMS)도 함께 표기한다 — CC-BY-NC.

### API-21 `GET /pests/{pestId}/vectors` — 매개충

바이러스병은 등록 약이 0건이다. 옮기는 벌레를 찾아 그 벌레의 약으로 잇는다.

```json
{ "data": { "virus": { "pest_id": 31, "name": "순무황화모자이크바이러스병" },
            "vectors": [ { "pest_id": 12, "name": "벼룩잎벌레",
                           "pesticide_count": 155, "evidence": "..." } ],
            "guide_text": "바이러스는 직접 치료하는 약이 없습니다. ..." }, "meta": {} }
```

매개충이 없으면 `vectors: []` + `guide_text`만.

---

## 6. 약·판정 (API-22 ~ 25)

### API-22 `GET /pesticides?pest_id=7` — 등록 약 목록

판정 없이 목록만. `Pesticide[]`.

```
?pest_id=7        필수
?route=경엽처리   처리법
?usage=살충
?q=엑설트         상표·품목 검색
```

등록 약이 0건이면 빈 배열 + `meta.guide: "등록된 약이 없습니다. 농업기술센터에 문의하세요."`

### API-23 `GET /zones/{zoneId}/judgments?pest_id=7` — 약별 판정 목록

**핵심이다.** 그 구역에서 그 병해충에 쓸 수 있는 약을 전부 판정한다.

```
?pest_id=7     없으면 ①이 UNKNOWN이 되고 나머지는 각자 판단
?state=GREEN   거르기
?limit=50&offset=0
```

```json
{ "data": [ { "pesticide": { "use_id": 101, "brand": "베네비아", "product": "사이안트라닐리프롤 유상수화제",
                             "route": "경엽처리", "dilution": "4000배",
                             "ingredients": [ { "name": "사이안트라닐리프롤",
                                                "moa": { "kr_code": "28", "intl_code": "IRAC 28" } } ] },
              "state": "GREEN",
              "checks": [
                { "no": 1, "state": "GREEN", "reason": "배추 배추좀나방에 등록된 약입니다.",
                  "evidence": { "raw_text": null, "source": "PSIS SVC01", "base_date": "2026-10-05" } },
                { "no": 2, "state": "GREEN", "reason": "10월 27일부터 수확할 수 있습니다.",
                  "phi_days": 14, "harvest_from": "2026-10-27",
                  "evidence": { "raw_text": "수확14일전", "source": "PSIS SVC01", "base_date": "2026-10-05" } },
                { "no": 3, "state": "GREEN", "reason": "사이안트라닐리프롤 0/3 — 3회 남았습니다.",
                  "ingredients": [ { "ingredient_id": 9, "name": "사이안트라닐리프롤",
                                     "route": "경엽처리", "used": 0, "limit": 3, "remaining": 3 } ],
                  "evidence": { "raw_text": "3회", "source": "PSIS SVC01", "base_date": "2026-10-05" } },
                { "no": 4, "state": "GREEN", "reason": "직전은 5번 계열, 이번은 28번 계열입니다.",
                  "moa": { "kr_code": "28", "intl_code": "IRAC 28", "is_multi_site": false },
                  "last_moa": { "kr_code": "5", "intl_code": "IRAC 5" },
                  "rule": "같은 계열을 연속으로 쓰지 않는다", "consecutive": 0,
                  "evidence": { "raw_text": null, "source": "농식품부 PLS", "base_date": "2026-10-05" } }
              ],
              "base_date": "2026-10-05" } ],
  "meta": { "base_date": "2026-10-05", "total": 288,
            "sources": ["PSIS SVC01", "농식품부 PLS", "IRAC v11.5"] } }
```

정렬은 `GREEN → AMBER → UNKNOWN → RED`. **불가한 약도 사유와 함께 전부 내려보낸다.** 목록에서 빼지 않는다.

### API-24 `GET /zones/{zoneId}/judgments/{pesticideId}` — 4체크 상세

`{pesticideId}`는 `pesticide_use.use_id`다. 응답은 `Verdict` 하나 + 대안.

```
?pest_id=7
```

API-23의 한 항목과 같은 모양에 `alternatives`가 붙는다.

```json
{ "data": { "pesticide": {...}, "state": "RED", "checks": [...],
            "alternatives": [ { "use_id": 101, "brand": "베네비아",
                                "moa": { "kr_code": "28" }, "state": "GREEN" } ],
            "base_date": "2026-10-05" }, "meta": {...} }
```

### API-25 `GET /zones/{zoneId}/judgments/{pesticideId}/alternatives` — 대체 약

지금 약이 불가·주의일 때 **다른 작용기작의 등록 약 중 GREEN인 것만** 돌려준다.

```json
{ "data": [ { "use_id": 101, "brand": "베네비아", "product": "...",
              "moa": { "kr_code": "28", "intl_code": "IRAC 28" },
              "state": "GREEN",
              "why": "28번 계열이라 직전 5번 계열과 겹치지 않습니다." } ],
  "meta": { "base_date": "2026-10-05" } }
```

0개이면 빈 배열 + `meta.guide: "대신 쓸 약을 찾지 못했습니다. 농업기술센터에 문의하세요."`

다작용점 약제 우선 정렬은 **적용하지 않는다** (제품쟁점 후속 검토).

---

## 7. 살포 기록 (API-26 ~ 29)

### API-26 `POST /zones/{zoneId}/spray-records` — 기록 저장

`Idempotency-Key` 필수.

```json
{ "use_id": 101, "pest_id": 7, "sprayed_at": "2026-10-27",
  "source": "tap", "verdict_snapshot": { },
  "confirmed_separate": false }
```

→ 201 + `SprayRecord`.

`confirmed_separate`는 **중복 409를 받은 뒤 사용자가 「따로 뿌린 것」이라고 확인했을 때만** `true`다. 이 필드가 없으면 새 `Idempotency-Key`로 다시 보내도 같은 중복 조건에 걸려 또 409가 된다.

`verdict_snapshot`은 저장 시점의 판정 결과(JSONB)다. 나중에 원자료가 갱신돼도 **그때 무엇을 보고 뿌렸는지**가 남는다.

같은 구역·약·날짜 기록이 이미 있고 `confirmed_separate`가 `false`면 409 `DUPLICATE_RECORD` + 기존 기록을 함께 돌려준다. 사용자가 「따로 뿌린 것」이라고 확인하면 **새 `Idempotency-Key` + `confirmed_separate: true`**로 다시 보낸다. 그때는 중복 검사를 건너뛰고 저장한다.

**판정 결과를 기록으로 자동 저장하지 않는다.** 사용자가 눌러야 저장된다 (하드 룰 5).

### API-27 `POST /zones/{zoneId}/spray-records/past` — 과거 이력 일괄

`Idempotency-Key` 필수.

```json
{ "records": [ { "use_id": 55, "sprayed_at": "2026-09-05", "source": "manual" },
               { "use_id": 72, "sprayed_at": "2026-09-15", "source": "manual" } ] }
```

```json
{ "data": { "created": 2, "skipped": 0,
            "records": [ ... ],
            "conflicts": [ { "index": 2, "code": "DUPLICATE_RECORD", "existing_log_id": 11 } ] },
  "meta": {} }
```

부분 성공을 허용한다. 충돌한 줄만 `conflicts`로 돌려주고 나머지는 저장한다.

### API-28 `GET /zones/{zoneId}/spray-records` — 기록 목록

```
?from=2026-08-20&to=2026-10-27
?include_cancelled=false   기본 false
?pest_id=7
```

`SprayRecord[]`. 정렬은 `sprayed_at DESC`.

### API-29 `POST /spray-records/{recordId}/cancel` — 기록 취소

`cancelled_at`을 채운다. **물리 삭제하지 않는다** (하드 룰 6).

→ 200 + 취소된 `SprayRecord`. 이미 취소됐으면 409.

---

## 8. 누적·통계 (API-30, 36)

### API-30 `GET /zones/{zoneId}/mechanism-distribution` — 계열 누적 분포

이번 작기에 어느 계열을 얼마나 썼는지. ④의 서사를 받치는 화면이다.

```
?from=2026-08-20   기본값은 zone.planted_at
?to=2026-10-27     기본값은 오늘
```

```json
{ "data": { "zone_id": 1, "from": "2026-08-20", "to": "2026-10-27", "total": 4,
            "distribution": [
              { "moa": { "kr_code": "5", "intl_code": "IRAC 5" }, "count": 2, "share": 0.5,
                "ingredients": ["스피네토람"] },
              { "moa": { "kr_code": "15", "intl_code": "IRAC 15" }, "count": 2, "share": 0.5,
                "ingredients": ["노발루론"] } ],
            "unknown_count": 0,
            "top_share": 0.5 },
  "meta": { "base_date": "2026-10-05" } }
```

**계통 사용 비중는 실제 이력으로 계산한 사용 비율이다.** 약효나 저항성 수준을 뜻하지 않는다. 화면 문구에서 그렇게 읽히면 안 된다 (금지 표현).

계열을 모르는 약은 `unknown_count`로만 센다. 분포에 섞지 않는다.

### API-36 `GET /stats/regions/mechanism-distribution` — 지역별 분포 (P2)

```
?region=강원특별자치도 평창군&crop_id=2
```

최소 표본 수 미만이면 `data: null` + `meta.reason: "표본이 적어 표시하지 않습니다."` 최소 표본 수는 미정이다 (개인정보).

---

## 9. 날씨·출처 (API-31, 32)

### API-31 `GET /zones/{zoneId}/weather/precipitation` — 강수 조회

구역 위치의 기상청 단기예보. **판정과 분리된 참고 정보다.**

```json
{ "data": { "zone_id": 1, "nx": 73, "ny": 134,
            "announced_at": "2026-10-27T05:00:00+09:00",
            "hourly": [ { "at": "2026-10-27T09:00:00+09:00", "pop": 20, "pcp_mm": 0 } ] },
  "meta": { "sources": ["기상청 단기예보"] } }
```

실패하면 503 `EXTERNAL_API_UNAVAILABLE`. **판정 화면은 날씨 없이도 그대로 동작해야 한다.**

### API-32 `GET /data-sources` — 출처와 기준일

NFR-08. 심사의 「사용 데이터와 방법론의 타당성」에 직접 쓰인다.

```json
{ "data": [ { "key": "psis", "name": "농약안전정보시스템 PSIS", "detail": "SVC01 농약등록정보",
              "base_date": "2026-10-05", "license": "공공누리 제1유형", "url": "..." },
            { "key": "ncpms", "name": "국가농작물병해충관리시스템 NCPMS", "detail": "도감·발생정보",
              "base_date": "2026-10-05", "license": "CC-BY-NC (비영리)", "url": "..." },
            { "key": "irac", "name": "IRAC MoA Classification", "detail": "v11.5",
              "base_date": "2026-02-01", "license": "CropLife International", "url": "..." },
            { "key": "frac", "name": "FRAC Code List", "detail": "2026",
              "base_date": "2026-05-01", "license": "CropLife International", "url": "..." },
            { "key": "pls", "name": "농식품부 PLS 제도 안내", "detail": "",
              "base_date": "2026-10-05", "license": "공공누리", "url": "..." } ],
  "meta": {} }
```

---

## 10. P1 (API-33 ~ 35)

P0가 끝난 뒤 착수한다. 요청·응답은 착수할 때 채운다.

| ID | 경로 | 용도 |
|---|---|---|
| API-33 | `GET /pesticides/{pesticideId}/papers` | 논문 실측값. 같은 계열이라는 이유로 다른 성분의 측정치를 대입하지 않는다 |
| API-34 | `POST /ocr/pesticide-labels` | 포장지 사진 → 약 이름 후보. **살포 사실·날짜를 OCR로 단정하지 않는다.** 사용자가 확인해야 저장된다 |
| API-35 | `POST /pesticides/{pesticideId}/dilution-calculations` | 희석 계산. 물 L × 희석배수 |

`resistance_ref`(API-33) 테이블은 V002로 미뤘다. 자료가 아직 없다.

---

## 11. 하드 룰 — 서버가 반드시 지킬 것

1. **판정 중에 외부 API를 호출하지 않는다.** 배치로 선적재한 자료만 쓴다. 가용성·재현성·파싱 실패 격리.
2. **`parse_status`를 확인하지 않고 ②③을 통과시키지 않는다.**

   | 값 | 뜻 | ② 시기 | ③ 횟수 | 줄 |
   |---|---|---|---|---|
   | `ok` | 수확 기준 숫자가 있다 | 날짜 계산 | 계산 | 3,303 |
   | `stage` | 심을 때 쓰는 약 | **NA** + 원문 | 계산 | 519 |
   | `plant_rel` | 정식일 기준 기한 | 정식일 + `planting_window_days`로 계산 | 계산 | 4 |
   | `no_std` | 원문에 숫자가 없다 | ⚪ + 원문 | ⚪ | 41 |
   | `failed` | 사람이 봐야 한다 | ⚪ + 원문 | ⚪ (숫자 칸에 값이 있어도 쓰지 않는다) | 3 |

   **빈칸이 두 종류다.**
   - `stage` — 심을 때 땅에 넣는 약이라 **「수확 며칠 전」이라는 항목 자체가 해당되지 않는다.** `NA`로 낸다.
   - `no_std` / `failed` — **값을 모른다.** `UNKNOWN`으로 낸다.

   **둘 다 GREEN으로 올리지 않는다.** `NA`를 「통과」로 집계하면 심을 때 쓰는 약이
   다 자란 작물에 「가능」으로 뜬다 — 이게 이 룰이 막는 것이다.

   종합 판정 우선순위: `RED > NA > UNKNOWN > AMBER > GREEN`.
3. **③ 횟수는 성분 기준이다.** 상표·품목이 달라도 성분이 같으면 같은 약. 혼합제는 성분마다 1회씩 센다. 하나라도 한도에 닿으면 불가이고, 화면에는 가장 적게 남은 성분을 보여준다.
4. **③ 한도는 같은 성분 + 같은 처리법(`route`) 약들의 `max_count` 중 최솟값이다.** 사용 횟수는 처리법과 무관하게 전부 센다. `route`가 NULL이면 한도를 계산하지 않고 ⚪.

   집계를 하나의 `JOIN` 조건으로 묶으면 **사용 횟수까지 처리법별로 줄어든다.** 이력은 전부 세고 한도만 `FILTER`로 고른다 — SQL은 [제품쟁점 10번](../internal/팜가디언_제품쟁점.md).

5. **이력 약의 `parse_status`도 확인한다.** `failed` 행의 `max_count`는 숫자가 있어도 한도 계산에 넣지 않는다. 하드 룰 2는 **이번에 쓸 약**만 덮는다 — 과거 이력은 따로 걸러야 한다.
6. **이력 0건이면 ③④는 ⚪다.** 산술값이 `used=0, limit=3, remaining=3`으로 나와도 GREEN으로 내지 않는다. 숫자 계산과 이력 충분성 검사는 별개다.
7. **발생 시기로 병해충 후보를 거르지 않는다.** 배지로만 쓴다. `pdf`는 강하게, `ncpms`는 약하게.
8. **판정 결과를 이력으로 자동 저장하지 않는다.** 사용자가 눌러야 저장된다.
9. **취소는 소프트 삭제다** (`cancelled_at`). 물리 삭제하지 않는다.
10. **잔여 횟수·계열 카운트를 컬럼으로 저장하지 않는다.** 조회 시 계산한다.
11. **근거 없이 상태를 내지 않는다.** 모든 `Check`에 `evidence`가 있어야 한다. 없는 원문을 만들지 않는다.
12. **정식일이 없다는 이유만으로 ②를 UNKNOWN으로 처리하지 않는다.** ①②는 이력 없이 판단할 수 있다. ③④만 UNKNOWN이다.
13. **FastAPI는 요청마다 JWT의 `user_id`를 쿼리 조건에 직접 넣는다.** RLS를 거치지 않는다.

---

## 12. 데모 경로와 목 데이터

### 12-1. 먼저 만들 9개

데모는 **배추 · 배추좀나방**이다 (착수회의 10/6 결정). 시드에 사용자·밭·구역 3개·이력 6건·약 7개가 들어 있어 밭 등록과 구역 나누기(API-06~13)를 밟지 않는다.

```
API-14  GET  /zones/{zoneId}                             구역 상세
API-18  GET  /crops/배추/pests                            병해충 목록
API-20  GET  /pests/{pestId}                             병해충 상세
API-23  GET  /zones/{zoneId}/judgments?pest_id=           판정 목록
API-24  GET  /zones/{zoneId}/judgments/{pesticideId}      4체크 상세   ← 핵심
API-25  GET  .../judgments/{pesticideId}/alternatives     대체 약
API-26  POST /zones/{zoneId}/spray-records                기록
API-30  GET  /zones/{zoneId}/mechanism-distribution       계열 누적
API-32  GET  /data-sources                                출처·기준일
```

데모에 안 들어가는 27개도 **구현은 한다.** 심사의 「구현·시연 수준」은 레포로도 평가될 수 있다.

**선행 작업 — 9개 전부 JWT가 필요하다.** 시드 사용자(`00000000-...-a001`)는 「카카오 계정이 아닌 시드 전용 사용자」다. 데모에서 로그인을 밟지 않기로 했으므로 **이 사용자의 토큰을 어떻게 얻을지 정해야 한다.**

```
A. auth.users에 시드 사용자를 넣고 Supabase Admin API로 토큰 발급   ← 전달서 미확정 #16과 같은 작업
B. 데모 한정으로 FastAPI에 고정 user_id 주입 (환경변수)             ← 빠르지만 운영 코드에 분기가 생긴다
```

A를 권한다. #16을 해결하면 같이 풀린다. **이게 막히면 데모 9개 전부가 401이다.**

### 12-2. 시드 (전달서 5절)

약 7개 — 전부 배추좀나방 · 경엽처리 · 기준일 2026-10-05.

| use_id | 상표 | 처리법 | 희석 | phi | max | parse | 성분 (계열) |
|---|---|---|---|---|---|---|---|
| 1 | 엑설트 | 경엽처리 | 2000배 | 7 | 3 | ok | 스피네토람 (5) |
| 2 | 델리게이트 | 경엽처리 | 2000배 | 7 | 3 | ok | 스피네토람 (5) |
| 3 | 베네비아 | 경엽처리 | 4000배 | 14 | 3 | ok | 사이안트라닐리프롤 (28) |
| 4 | 라이몬 | 경엽처리 | 2000배 | 10 | 2 | ok | 노발루론 (15) |
| 5 | 검투사 | 경엽처리 | 2000배 | 14 | 3 | ok | 레피멕틴 (6) |
| 6 | 어바운트 | 경엽처리 | 1000배 | 14 | 2 | ok | 인독사카브 (22a) |
| **7** | **다지논** | **관주처리** | 800배 | — | — | **failed** | 다이아지논 (1b) · `pest_id=2` 벼룩잎벌레 |
| **8** | **더블킥** | 경엽처리 | 2000배 | 14 | 2 | ok | 아바멕틴 (6) + 스피네토람 (5) |

`use_id` 7은 더블킥이 아니라 **다지논**이다 (파싱 실패 케이스). 더블킥은 **8**이다. 시드 SQL(전달서 6절) 그대로다.

구역·이력:

```
A구역  배추 · 정식 2026-08-20 · 9/05 검투사 → 9/15 라이몬 → 9/25 라이몬 → 10/03 엑설트
B구역  배추 · 정식 2026-09-01 · 이력 0건
C구역  배추 · 정식 2026-08-25 · 9/10 엑설트 → 9/24 엑설트
```

### 12-3. FE가 반드시 만들어야 할 목 케이스

`today = 2026-10-13` 기준. 이 6개가 전부 화면에 떠야 한다.

| # | 구역 | 약 | 기대 | 보여줄 것 |
|---|---|---|---|---|
| 1 | A | 베네비아 | **GREEN** | 4체크 전부 통과. 10/27부터 수확 |
| 2 | A | 델리게이트 | **AMBER** | ④ 직전 엑설트와 같은 5번 계열 + 대안 |
| 3 | A | 라이몬 | **RED** | ③ 노발루론 2/2 소진 + 대안 |
| 4 | C | 더블킥 (`use_id=8`) | **RED** | 혼합제. 스피네토람 2/2 (한도 = min(더블킥 2, 엑설트 3)), 아바멕틴 0/2 |
| 5 | B | 베네비아 | **UNKNOWN** | 이력 0건 → ③④ ⚪ |
| 6 | A | 다지논 (`use_id=7`, 배추·벼룩잎벌레) | **RED** | `parse_status='plant_rel'`, `planting_window_days=14`. 정식 2026-08-20 + 14일 = 09-03. 오늘 10-13은 지났다. **관주처리**라 D안에서 경엽 풀과 분리된다 |
| 7 | A | 근충탄 (`use_id=9`, 배추·벼룩잎벌레) | **NA** | `parse_status='stage'` → ② NA + 원문 「정식기」, ③은 평소대로 계산(최대 1회). **NA를 GREEN으로 올리면 버그다** |
| 8 | A | 젠타리 (`use_id=10`, 배추·배추좀나방) | **UNKNOWN** | `parse_status='no_std'` → ②③ 둘 다 ⚪ + 원문 「발생초기」 |

4번이 성분 기준 한도 규칙을 검증한다. 엑설트만 보면 3회라 통과지만 더블킥 한도 2가 적용돼 불가가 된다.

6·7·8번이 하드 룰 2를 검증한다. 셋이 **빈칸의 세 종류**를 각각 덮는다 —
정식일 기준(`plant_rel`), 항목 해당 없음(`stage`), 값 없음(`no_std`).
**어느 하나라도 GREEN으로 내면 버그다.**

---

## 13. 남은 확인

| # | 항목 | 영향 | 누가 |
|---|---|---|---|
| 1 | ~~「심을 때」 약과 ③ 한도~~ — **2026-10-27 확정.** `stage`는 ② `NA`, ③은 계산. 처리법 풀 분리(D안) 유지 | 판정 결과 | ~~PM~~ 완료 |
| 2 | 토큰 재발급 구현 여부 | API-02 삭제 여부 | BE |
| 3 | 온보딩에서 받는 값 | `app_user` 컬럼 추가 여부 | PM·BE |
| 4 | 밭 삭제 — 실제 삭제 vs 소프트 삭제 | API-11 | 전 팀 |
| 5 | 기록 있는 구역이 저장 요청에서 빠졌을 때 | API-13 | 전 팀 |
| 6 | 탈퇴 시 이력 익명화 | API-05, 지역 통계 P2 | 전 팀 |
| 7 | 지역 통계 최소 표본 수 | API-36 | 전 팀 |
| 8 | `registration`(등록취소) 테이블 | ① 등록취소 판정 | DB |
