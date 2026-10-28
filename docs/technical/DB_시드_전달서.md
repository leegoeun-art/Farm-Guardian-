# 팜가디언 DB 전달서 — 필드 대응표 · ERD · 마이그레이션 · 첫 사례 시드

> 작성: 한원탁 (DB) · 2026-10-13 초판 · **2026-10-15 개정**
> 받는 사람: BE (이준혁, 윤혜빈) · 함께 확인: 최현성
> 원자료: `최종/` 엑셀 7개 (3번·4번은 원탁 수정본과 동일)
> 데이터 기준일: **2026-10-05** (PSIS OpenAPI SVC01 수집일)

이 문서 하나로 BE가 같은 명령으로 시드를 넣고, 첫 사례(배추 · 배추좀나방)를 조회할 수 있어야 한다.

**10/15 개정 내용**
1. ③ 횟수를 **성분 기준**으로 센다(DB팀 결정). 계산 규칙은 4절.
2. `ingredient`(성분), `use_ingredient`(약 × 성분) 테이블 추가. 혼합제는 성분 두 줄.
3. 작용기작은 성분의 속성이라 `ingredient.moa_id`로 옮기고 `use_moa`는 없앴다. 데이터 확인 결과 한 성분이 두 계열로 나오는 경우는 0건이다.
4. `app_user`(카카오 로그인·회원가입·탈퇴, P0) 테이블 추가. `field.user_id`가 이 테이블을 참조한다.
5. `parse_status`의 `unlimited`를 `no_std`(기준 미표기)로 바꾸고 「제한 없음」으로 해석하지 않는다. 판정 규칙은 3-2절.
6. 첫 사례에 혼합제 사례(더블킥)와 C구역을 추가하고 판정 기대값을 성분 기준으로 다시 맞췄다.

**10/27 개정 — `plant_rel` 추가 (PM 확정)**
1. `parse_status`에 **`plant_rel`** 추가. 원문 「파종(정식)일부터14일」처럼 **정식일 기준 기한**인 4줄이다. 전에는 `failed`로 묶여 있었다.
2. `safe_use_std.planting_window_days` 칼럼 추가. 위 원문에서 뽑은 날짜 수(14).
3. `stage` 519줄의 ② 시기는 ⚪(UNKNOWN)이 아니라 **`NA`(항목 해당 없음)**로 낸다. ③ 횟수는 값이 있으므로 그대로 계산한다.
4. 종합 판정 우선순위: **`RED > NA > UNKNOWN > AMBER > GREEN`**. `NA`를 통과로 올리면 버그다.
5. 근거와 판정 규칙 전문은 `docs/internal/팜가디언_제품쟁점.md` 11번, API 계약은 `docs/technical/api-spec.md` 11절.

**10/15 개정 2 — 개발 DB를 Supabase로**
1. 카카오 로그인은 Supabase Auth의 Kakao 공급자를 쓴다. 회원 정보는 `auth.users`에 생기고, `app_user`는 그 `id`(UUID)를 키로 쓰는 프로필 테이블이 된다. 가입하면 트리거가 `app_user` 행을 만들고, 탈퇴는 `auth.users` 삭제로 연쇄 삭제된다.
2. 모든 테이블에 RLS(행 단위 보안)를 켠다. 참조 데이터는 누구나 읽기만, 밭·구역·이력은 본인 것만 (3-3절).
3. PostGIS는 Supabase `extensions` 스키마에 켠다.
4. 파일 위치와 적재 명령을 Supabase CLI 방식으로 바꿨다 (`supabase/migrations/`, `supabase/seed.sql`, `supabase db reset`).

---

## 0. 요약

| 항목 | 상태 |
| --- | --- |
| 수집 엑셀 7개 → 테이블 대응 | 완료 (1절) |
| 통합 ERD | 현성 7개 + 원탁 5개(safe_use_std·ingredient·use_ingredient·moa·rotation_rule) + 사용자·판정용 4개 (2절) |
| 마이그레이션 | `V001__init.sql` (3절) |
| ③ 횟수 계산 규칙 | 성분 기준 · 같은 성분 약 중 가장 작은 한도 (4절) |
| 첫 사례 시드 | 배추 · 배추좀나방 · 약 7개 · 구역 3개 · 시험 이력 6건 (5·6절) |
| DB 환경 | Supabase (Postgres + PostGIS + Auth 카카오) · RLS 적용 (3-3절) |
| 적재 명령 | 로컬 `supabase db reset` 한 줄 / 원격 `supabase db push` + 시드 (7절) |
| 누락·미확정 | 8절 |

---

## 1. 필드 대응표 (엑셀 → 테이블)

엑셀은 **이름**(작물, 병해충, 품목명, 상표명)으로 이어져 있다. DB에서는 적재할 때 번호(`pest_id`, `use_id`, `ingredient_id`, `moa_id`)를 매겨 잇는다.

### 1-1. `1_병해충_발생시기_최종.xlsx` → `pest_season`

| 엑셀 칸 | 테이블.칼럼 | 변환 |
| --- | --- | --- |
| 작물 + 병해충 | pest_season.pest_id | (crop.name, pest.name)으로 조회 |
| 발생 월 | pest_season.months | `"6, 7, 8"` → `{6,7,8}` (SMALLINT[]) |
| 출처 | pest_season.source | `PDF 경보` → `pdf`, `NCPMS 설명` → `ncpms` |
| 지역 | pest_season.region | 그대로. 빈칸·「없음」은 NULL |
| 재배형태 | pest_season.culti | 그대로 |
| 등급 | pest_season.grade | 그대로 (예보 / 주의보) |
| 근거 문장 | pest_season.evidence | 원문 그대로 |

### 1-2. `2_병해충_도감.xlsx` → `pest`, `pest_photo`

| 시트 · 엑셀 칸 | 테이블.칼럼 | 변환 |
| --- | --- | --- |
| 병해충 · 작물 | pest.crop_id | crop.name으로 조회 |
| 병해충 · 구분 | pest.kind | `병` → `disease`, `해충` → `insect` |
| 병해충 · 병해충 | pest.name | 도감 이름 (모든 파일의 기준 이름) |
| 병해충 · 학명 | pest.sci_name | 빈칸 22개 → NULL |
| 병해충 · 부위 | pest.parts | `"벌레, 잎"` → `{벌레,잎}` |
| 병해충 · 증상·피해 | pest.symptom | 빈칸 11개 → NULL |
| 병해충 · 사진 출처 | pest.photo_crop | 작물명 또는 「사진 없음」→ NULL |
| (없음) | pest.has_doc | 도감에 있으면 true, 3번 파일에만 있는 13개는 false |
| 사진 · 작물 + 병해충 | pest_photo.pest_id | 조회 |
| 사진 · 사진 주소 | pest_photo.url | 그대로 |
| 사진 · 사진 제목 | pest_photo.title | 그대로 |
| 사진 · 부위 | pest_photo.part | 그대로 |
| 병해충 · 대표 사진 | pest_photo.is_main | 사진 주소가 같으면 true |

### 1-3. `3_병해충별_등록약.xlsx` → `pesticide_use`

| 엑셀 칸 | 테이블.칼럼 | 변환 |
| --- | --- | --- |
| 작물 + 병해충 | pesticide_use.pest_id | 조회 (없으면 has_doc=false인 pest 생성) |
| 용도 | pesticide_use.usage | 살균 / 살충 / 균충 |
| 품목명 | pesticide_use.product | 그대로. 성분은 1-6 규칙으로 여기서 뽑는다 |
| 상표명 | pesticide_use.brand | 그대로 |
| 회사 | pesticide_use.company | 그대로 |
| 계열 코드 | pesticide_use.moa_code | **원문 그대로** (`6+5`). 판정은 ingredient.moa_id로 한다 |
| 사용 방법 | pesticide_use.method | 그대로 |
| 희석배수 | pesticide_use.dilution | 그대로 |
| 사용 시기 | pesticide_use.use_time | 원문 그대로 |
| 사용 횟수 | pesticide_use.use_count | 원문 그대로 |
| 최초 등록일 | pesticide_use.reg_date | `20210414` → DATE |

### 1-4. `4_약사용규칙.xlsx` → `safe_use_std`

연결 키: (작물, 병해충, 약 이름=품목명, 상표명, 사용 방법, 희석배수, 사용 시기 원문, 사용 횟수 원문). 표3의 같은 키 행 모두에 1:1로 붙인다.

| 엑셀 칸 | 테이블.칼럼 | 변환 |
| --- | --- | --- |
| (키) | safe_use_std.use_id | pesticide_use.use_id |
| 수확 전 일수 | safe_use_std.phi_days | 빈칸 → NULL |
| 최대 횟수 | safe_use_std.max_count | 빈칸 → NULL |
| 변환 구분 | safe_use_std.parse_status | 성공 → `ok`, 심을 때 → `stage`, 제한 없음 → **`no_std`**, 확인 필요 → `failed`. 단 원문이 **「파종(정식)일부터N일」** 꼴이면 → **`plant_rel`** (4줄) |
| 사용 시기 원문 | safe_use_std.planting_window_days | `plant_rel`일 때만 원문의 N을 숫자로. 나머지는 NULL |
| 비고 | safe_use_std.note | 그대로 |
| (고정) | safe_use_std.base_date | `2026-10-05` |

### 1-5. `5_약계열.xlsx` + moa 대응표 → `moa`

| 엑셀 칸 | 테이블.칼럼 | 변환 |
| --- | --- | --- |
| 국내 계열 코드 | moa.kr_code | `가1 \| 사1` → 두 줄로 나눔, 중복 제거 |
| 국제 코드 | moa.intl_code | 같은 순서로 나눔 |
| (원탁_표4-6.xlsx moa_살균제 / moa_살충제) | moa.usage_type, moa.target_site | 대응표 그대로 |
| (없음) | moa.is_multi_site | 카 · FRAC M · 생1·생2 · IRAC 8·13·UN → true |

### 1-6. 품목명 → `ingredient`, `use_ingredient` (10/15 추가)

**규칙:** 품목명에서 마지막 공백 뒤의 제형을 빼고, 남은 앞부분을 `.`로 나눈다.

| 품목명 | 성분 |
| --- | --- |
| 스피네토람 액상수화제 | 스피네토람 |
| 아바멕틴.스피네토람 액상수화제 | 아바멕틴 (seq 1), 스피네토람 (seq 2) |

| 원천 | 테이블.칼럼 | 변환 |
| --- | --- | --- |
| 품목명 앞부분을 `.`로 나눈 값 | ingredient.name | 중복 제거 |
| 같은 순서의 계열 코드 (`6+5`의 6, 5) | ingredient.moa_id | moa.kr_code로 조회 |
| pesticide_use 한 줄 × 성분 | use_ingredient (use_id, ingredient_id, seq) | 혼합제는 두 줄 |

데이터로 확인한 결과 (최종 3번 파일, 품목 652개):
- 품목명이 모두 「성분 제형」 형태로 공백이 정확히 하나라 규칙이 그대로 통한다. 제형은 25종이다.
- 성분 **216개**, 혼합제 품목 **321개**.
- 한 성분이 두 계열 코드로 나오는 경우는 **0건**이다. 그래서 계열은 성분에 붙인다.
- 계열 코드가 없어 `moa_id`가 NULL인 성분은 5개다: 딤프로피리다즈, 피리다클로메틸, 바실루스서브틸리스아이에이비비에스03, 바실루스서브틸리스제이씨케이1398, 비티쿠르스타키아이엠비엘비9.

### 1-7. `6_반복규칙.xlsx` → `rotation_rule`

| 엑셀 칸 | 테이블.칼럼 | 변환 |
| --- | --- | --- |
| 대상 | rotation_rule.moa_scope | 그대로 (적용 계열) |
| 최근 몇 번 중 | rotation_rule.window_size | 숫자 |
| 연속 몇 번까지 | rotation_rule.max_consecutive | 숫자 |
| 시즌 최대 | rotation_rule.season_max_raw | 원문 (`2~4`, `계획 살포의 50% 이내`) |
| 비고 | rotation_rule.description | 그대로 |
| 출처 | rotation_rule.source | 그대로 |
| (없음) | rotation_rule.window_unit | IRAC 행만 `day`(30), 나머지 `count` |

### 1-8. `7_바이러스_매개충.xlsx` → `virus_vector`

| 엑셀 칸 | 테이블.칼럼 | 변환 |
| --- | --- | --- |
| 작물 + 바이러스 병 | virus_vector.virus_pest_id | 조회 |
| 작물 + 연결할 병해충(도감 이름) | virus_vector.vector_pest_id | 조회. 「없음」은 NULL |
| 근거 | virus_vector.evidence | 원문 |
| 앱 안내 | virus_vector.guide_text | 그대로 |

### 1-9. 이름 별칭 → `pest_alias`

원탁 `원탁_표4-6.xlsx`의 「표②초안」 17쌍. `source='PSIS'`, `alias_name`=PSIS 원문(예: 거세미나방류), `pest_id`=도감 이름(거세미나방)의 번호.

---

## 2. ERD

현성 ERD(pest 중심 7개)는 그대로 두고, 원탁 테이블 5개와 사용자·판정용 테이블 4개를 붙였다.

```mermaid
erDiagram
    auth_users ||--|| app_user : "1:1 (Supabase Auth)"
    app_user ||--o{ field : "1:N"
    field ||--o{ zone : "1:N"
    crop ||--o{ zone : "1:N"
    zone ||--o{ spray_log : "1:N"
    crop ||--o{ pest : "1:N"
    pest ||--o{ pest_alias : "1:N"
    pest ||--o{ pest_season : "1:N"
    pest ||--o{ pest_photo : "1:N"
    pest ||--o{ virus_vector : "바이러스"
    pest ||--o{ virus_vector : "매개충"
    pest ||--o{ pesticide_use : "1:N"
    pesticide_use ||--o| safe_use_std : "1:1"
    pesticide_use ||--|{ use_ingredient : "1:N"
    ingredient ||--o{ use_ingredient : "1:N"
    moa ||--o{ ingredient : "1:N"
    moa ||--o{ rotation_rule : "moa_scope"
    pesticide_use ||--o{ spray_log : "1:N"

    auth_users {
        uuid id PK "Supabase 관리 (auth.users)"
        jsonb raw_user_meta_data "카카오 닉네임 등"
    }
    app_user {
        uuid user_id PK, FK "auth.users.id"
        varchar nickname
        timestamptz created_at
        timestamptz last_login_at
        boolean is_test
    }
    field {
        bigint field_id PK
        uuid user_id FK
        varchar name
        geometry geom
        numeric area_ha
    }
    zone {
        bigint zone_id PK
        bigint field_id FK
        bigint crop_id FK
        varchar name
        date planted_at "작기 시작"
        boolean is_test
    }
    spray_log {
        bigint log_id PK
        bigint zone_id FK
        bigint use_id FK
        bigint pest_id FK
        date sprayed_at
        varchar source
        jsonb verdict_snapshot
        timestamptz cancelled_at
    }
    crop {
        bigint crop_id PK
        varchar name
        text_arr psis_crop_names
    }
    pest {
        bigint pest_id PK
        bigint crop_id FK
        varchar kind
        varchar name "도감 이름"
        varchar sci_name
        text_arr parts
        text symptom
        boolean has_doc
        varchar photo_crop
    }
    pest_alias {
        bigint alias_id PK
        bigint pest_id FK
        varchar source
        varchar alias_name
    }
    pest_season {
        bigint season_id PK
        bigint pest_id FK
        varchar source
        smallint_arr months
        varchar region
        varchar culti
        varchar grade
        text evidence
    }
    pest_photo {
        bigint photo_id PK
        bigint pest_id FK
        text url
        varchar title
        varchar part
        boolean is_main
        varchar photo_crop
    }
    virus_vector {
        bigint virus_pest_id FK
        bigint vector_pest_id FK
        text evidence
        text guide_text
    }
    pesticide_use {
        bigint use_id PK
        bigint pest_id FK
        varchar product "품목명"
        varchar brand "상표명"
        varchar company
        varchar moa_code "원문"
        varchar method
        varchar dilution
        varchar use_time "원문"
        varchar use_count "원문"
        date reg_date
    }
    safe_use_std {
        bigint use_id PK, FK
        smallint phi_days
        smallint max_count
        varchar parse_status "ok/stage/plant_rel/no_std/failed"
        smallint planting_window_days
        text note
        date base_date
    }
    ingredient {
        bigint ingredient_id PK
        varchar name UK "품목명 - 제형"
        bigint moa_id FK
    }
    use_ingredient {
        bigint use_id PK, FK
        smallint seq PK
        bigint ingredient_id FK
    }
    moa {
        bigint moa_id PK
        varchar kr_code "가1, 6, 3a"
        varchar intl_code "FRAC 4, IRAC 6"
        varchar usage_type
        varchar target_site
        boolean is_multi_site
    }
    rotation_rule {
        bigint rule_id PK
        varchar source
        varchar moa_scope
        varchar window_unit "count/day"
        smallint window_size
        smallint max_consecutive
        varchar season_max_raw
        text description
    }
```

Mermaid가 안 보이는 곳에서는 아래 요약을 본다.

```
auth.users ─1:1─ app_user ─1:N─ field ─1:N─ zone ─N:1─ crop
                            └─1:N─ spray_log ─N:1─ pesticide_use
crop ─1:N─ pest ─1:N─ pest_season / pest_photo / pest_alias
             ├──── virus_vector (virus_pest_id, vector_pest_id)
             └─1:N─ pesticide_use ─1:1─ safe_use_std
                          └─1:N─ use_ingredient ─N:1─ ingredient ─N:1─ moa ─1:N─ rotation_rule
```

**테크스펙 4.2와 다른 점** (BE 확인 필요)

| 테크스펙 | 이 문서 | 이유 |
| --- | --- | --- |
| field.user_id BIGINT (참조 없음) | app_user(user_id UUID = auth.users.id) + field.user_id FK | 카카오 로그인·회원가입·탈퇴가 P0. 로그인은 Supabase Auth가 맡는다 |
| (없음) | 전 테이블 RLS | Supabase는 public 스키마를 API로 노출하므로 기본 차단이 필요 |
| pesticide + safe_use_std(pesticide_id) | pesticide_use + safe_use_std(use_id) | 현성 엑셀 구조 그대로 적재. 한 줄 = 작물·병해충·약·사용 방법 |
| pesticide.ingredient (문자열) | ingredient + use_ingredient | ③을 성분 기준으로 센다. 혼합제는 성분 두 줄 |
| pesticide.moa_id 하나 | ingredient.moa_id | 계열은 성분의 속성. 혼합제는 성분마다 계열이 하나씩 |
| pest.aliases TEXT[] | pest_alias 테이블 | 출처별 원문 보관 |
| pest_candidate | pest_season | 🔔 배지 용도로 결정 |
| spray_log.pesticide_id | spray_log.use_id | 기록할 때 고른 등록 행(작물·병해충별 한도 포함)을 그대로 참조 |
| parse_status ok/partial/failed | ok/stage/plant_rel/no_std/failed | 실제 PSIS 데이터 형태에 맞춤 (3-2절). `plant_rel`은 10/27 추가 |

---

## 3. 마이그레이션 `supabase/migrations/20261015000000_init.sql`

### 3-1. 스키마

```sql
-- Supabase는 확장을 extensions 스키마에 둔다
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- 사용자 프로필 (로그인·회원 정보 자체는 Supabase Auth의 auth.users)
CREATE TABLE app_user (
    user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname      VARCHAR(100),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ,
    is_test       BOOLEAN NOT NULL DEFAULT false
);
-- 카카오 회원번호는 auth.identities(provider = 'kakao')에 있으므로 따로 저장하지 않는다
-- 탈퇴: auth.users 삭제 → app_user → field → zone → spray_log 연쇄 삭제 (8절 미확정 #4)

-- 카카오로 처음 로그인(=회원가입)하면 프로필 행을 만든다
CREATE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    INSERT INTO public.app_user (user_id, nickname)
    VALUES (NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'nickname',
                     NEW.raw_user_meta_data->>'name',
                     NEW.raw_user_meta_data->>'full_name'));
    RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE crop (
    crop_id         BIGSERIAL PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,      -- 감자 / 배추 / 토마토
    psis_crop_names TEXT[] NOT NULL,                  -- PSIS 원문 작물명
    row_spacing_cm  INTEGER,
    col_spacing_cm  INTEGER
);

CREATE TABLE pest (
    pest_id    BIGSERIAL PRIMARY KEY,
    crop_id    BIGINT NOT NULL REFERENCES crop(crop_id),
    kind       VARCHAR(10) NOT NULL,                  -- disease / insect
    name       VARCHAR(100) NOT NULL,                 -- 도감 이름
    sci_name   VARCHAR(200),
    parts      TEXT[],
    symptom    TEXT,
    has_doc    BOOLEAN NOT NULL DEFAULT true,
    photo_crop VARCHAR(50),
    UNIQUE (crop_id, name)
);

CREATE TABLE pest_alias (
    alias_id   BIGSERIAL PRIMARY KEY,
    pest_id    BIGINT NOT NULL REFERENCES pest(pest_id),
    source     VARCHAR(20) NOT NULL,                  -- PSIS / PDF / NCPMS
    alias_name VARCHAR(200) NOT NULL,
    UNIQUE (pest_id, source, alias_name)
);

CREATE TABLE pest_season (
    season_id BIGSERIAL PRIMARY KEY,
    pest_id   BIGINT NOT NULL REFERENCES pest(pest_id),
    source    VARCHAR(10) NOT NULL,                   -- pdf / ncpms
    months    SMALLINT[] NOT NULL,
    region    VARCHAR(200),
    culti     VARCHAR(100),
    grade     VARCHAR(20),
    evidence  TEXT
);

CREATE TABLE pest_photo (
    photo_id   BIGSERIAL PRIMARY KEY,
    pest_id    BIGINT NOT NULL REFERENCES pest(pest_id),
    url        TEXT NOT NULL,
    title      VARCHAR(200),
    part       VARCHAR(50),
    is_main    BOOLEAN NOT NULL DEFAULT false,
    photo_crop VARCHAR(50)
);

CREATE TABLE virus_vector (
    virus_pest_id  BIGINT NOT NULL REFERENCES pest(pest_id),
    vector_pest_id BIGINT REFERENCES pest(pest_id),   -- 매개충 없음이면 NULL
    evidence       TEXT,
    guide_text     TEXT
);

CREATE TABLE pesticide_use (
    use_id    BIGSERIAL PRIMARY KEY,
    pest_id   BIGINT NOT NULL REFERENCES pest(pest_id),
    usage     VARCHAR(10),                            -- 살균 / 살충 / 균충
    product   VARCHAR(200) NOT NULL,                  -- 품목명
    brand     VARCHAR(200) NOT NULL,                  -- 상표명
    company   VARCHAR(100),
    moa_code  VARCHAR(50),                            -- 원문 (6+5)
    method    VARCHAR(200),
    dilution  VARCHAR(100),
    use_time  VARCHAR(100) NOT NULL,                  -- 원문: 수확7일전
    use_count VARCHAR(50)  NOT NULL,                  -- 원문: 3회
    reg_date  DATE
);
CREATE INDEX idx_use_pest ON pesticide_use(pest_id);
CREATE INDEX idx_use_product ON pesticide_use(product, brand);

CREATE TABLE safe_use_std (
    use_id       BIGINT PRIMARY KEY REFERENCES pesticide_use(use_id),
    phi_days     SMALLINT,
    max_count    SMALLINT,
    parse_status VARCHAR(10) NOT NULL
                 CHECK (parse_status IN ('ok','stage','plant_rel','no_std','failed')),
    planting_window_days SMALLINT,
    CHECK (parse_status <> 'plant_rel' OR planting_window_days IS NOT NULL),
    note         TEXT,
    base_date    DATE NOT NULL
);

CREATE TABLE moa (
    moa_id        BIGSERIAL PRIMARY KEY,
    kr_code       VARCHAR(20) NOT NULL,               -- 가1, 6, 3a
    intl_code     VARCHAR(20),                        -- FRAC 4, IRAC 6
    usage_type    VARCHAR(12) NOT NULL,               -- fungicide / insecticide
    target_site   VARCHAR(200),
    is_multi_site BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (kr_code, usage_type)
);

-- 성분 (품목명에서 제형을 뺀 이름)
CREATE TABLE ingredient (
    ingredient_id BIGSERIAL PRIMARY KEY,
    name          VARCHAR(200) NOT NULL UNIQUE,       -- 스피네토람
    moa_id        BIGINT REFERENCES moa(moa_id)       -- 계열 모르면 NULL
);

-- 약 × 성분 (혼합제는 두 줄)
CREATE TABLE use_ingredient (
    use_id        BIGINT NOT NULL REFERENCES pesticide_use(use_id),
    seq           SMALLINT NOT NULL,                  -- 품목명 안 순서
    ingredient_id BIGINT NOT NULL REFERENCES ingredient(ingredient_id),
    PRIMARY KEY (use_id, seq),
    UNIQUE (use_id, ingredient_id)
);
CREATE INDEX idx_ui_ingredient ON use_ingredient(ingredient_id);

CREATE TABLE rotation_rule (
    rule_id         BIGSERIAL PRIMARY KEY,
    source          VARCHAR(100) NOT NULL,
    moa_scope       VARCHAR(200) NOT NULL,
    window_unit     VARCHAR(5) NOT NULL DEFAULT 'count',   -- count / day
    window_size     SMALLINT,
    max_consecutive SMALLINT,
    season_max_raw  VARCHAR(100),
    description     TEXT
);

-- 밭·구역·이력
CREATE TABLE field (
    field_id    BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    name        VARCHAR(100),
    address     VARCHAR(300),
    geom        extensions.geometry(POLYGON, 5179),
    area_ha     NUMERIC(10,4),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_field_user ON field(user_id);

CREATE TABLE zone (
    zone_id     BIGSERIAL PRIMARY KEY,
    field_id    BIGINT NOT NULL REFERENCES field(field_id) ON DELETE CASCADE,
    name        VARCHAR(50) NOT NULL,
    crop_id     BIGINT REFERENCES crop(crop_id),
    planted_at  DATE,                                 -- 정식일 = 작기 시작
    plant_count INTEGER,
    geom        extensions.geometry(POLYGON, 5179),
    is_test     BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE spray_log (
    log_id           BIGSERIAL PRIMARY KEY,
    zone_id          BIGINT NOT NULL REFERENCES zone(zone_id) ON DELETE CASCADE,
    use_id           BIGINT NOT NULL REFERENCES pesticide_use(use_id),
    pest_id          BIGINT REFERENCES pest(pest_id),
    sprayed_at       DATE NOT NULL,
    source           VARCHAR(20) NOT NULL,            -- tap / manual / ocr / receipt / seed
    verdict_snapshot JSONB,
    cancelled_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_spray_zone ON spray_log(zone_id, sprayed_at DESC) WHERE cancelled_at IS NULL;
```

`registration`, `resistance_ref`는 자료가 아직 없어 V002로 미룬다(8절).

### 3-2. `parse_status`와 ②③ 판정 (제안)

PRD는 「데이터 결측 → ⚪ 확인 필요」다. 그래서 숫자가 비어 있는 칸을 「제한 없음」으로 통과시키지 않는다.

| parse_status | 뜻 (원문 예) | 줄 | ② 시기 | ③ 횟수 |
| --- | --- | --- | --- | --- |
| `ok` | 「수확7일전」 + 「3회」 | 3,303 | 날짜 계산 | 4절 규칙으로 계산 |
| `stage` | 「정식기」 + 「1회」 | 519 | **`NA`** + 원문 「심을 때 땅에 넣는 약이라 수확 전 일수가 없다」 | 계산 (횟수는 있음) |
| `plant_rel` | 「파종(정식)일부터14일」 | 4 | 정식일 + `planting_window_days` 로 계산. 지났으면 RED | 계산 |
| `no_std` | 「발생초기」 + 「-」 (미생물·구리제) | 41 | ⚪ + 원문 + 「PSIS에 수확 전 일수가 적혀 있지 않음, 라벨 확인」 | ⚪ + 사용한 횟수만 표시 |
| `failed` | 사람이 봐야 하는 나머지 | 3 | ⚪ + 원문 | ⚪ + 원문 (숫자 칸에 값이 있어도 쓰지 않음) |

`stage`의 ②를 ⚪(UNKNOWN)으로 내지 않는다. **값을 못 읽은 것이 아니라 항목 자체가 없는 것**이라 구분한다.
종합 판정 우선순위는 `RED > NA > UNKNOWN > AMBER > GREEN`.

### 3-3. RLS (행 단위 보안) — 같은 마이그레이션 파일 끝에 이어 붙인다

Supabase는 `public` 스키마의 테이블을 anon 키로 API에 바로 노출한다. 그래서 모든 테이블에 RLS를 켜고 필요한 것만 연다.

| 구분 | 테이블 | 읽기 | 쓰기 |
| --- | --- | --- | --- |
| 참조 데이터 | crop, pest, pest_alias, pest_season, pest_photo, virus_vector, pesticide_use, safe_use_std, moa, ingredient, use_ingredient, rotation_rule | 누구나 (anon·authenticated) | 정책 없음 = 막힘. 적재는 서버(배치) 권한으로만 |
| 사용자 데이터 | app_user, field, zone, spray_log | 본인 것만 | 본인 것만 |

```sql
-- 참조 데이터: RLS 켜고 읽기만 허용
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['crop','pest','pest_alias','pest_season','pest_photo','virus_vector',
                           'pesticide_use','safe_use_std','moa','ingredient','use_ingredient','rotation_rule']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "read all" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
  END LOOP;
END $$;

-- 사용자 데이터: 본인 것만
ALTER TABLE app_user  ENABLE ROW LEVEL SECURITY;
ALTER TABLE field     ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone      ENABLE ROW LEVEL SECURITY;
ALTER TABLE spray_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile" ON app_user FOR ALL TO authenticated
    USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "own field" ON field FOR ALL TO authenticated
    USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "own zone" ON zone FOR ALL TO authenticated
    USING      (EXISTS (SELECT 1 FROM field f WHERE f.field_id = zone.field_id AND f.user_id = (SELECT auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM field f WHERE f.field_id = zone.field_id AND f.user_id = (SELECT auth.uid())));

CREATE POLICY "own spray_log" ON spray_log FOR ALL TO authenticated
    USING      (EXISTS (SELECT 1 FROM zone z JOIN field f ON f.field_id = z.field_id
                        WHERE z.zone_id = spray_log.zone_id AND f.user_id = (SELECT auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM zone z JOIN field f ON f.field_id = z.field_id
                        WHERE z.zone_id = spray_log.zone_id AND f.user_id = (SELECT auth.uid())));
```

**FastAPI 연결 참고:** 판정·기록 API는 FastAPI가 DB에 직접 붙는다. 이 연결(DB 비밀번호·서비스 권한)은 RLS를 거치지 않으므로, FastAPI가 요청마다 **카카오 로그인 토큰(Supabase JWT)에서 user_id를 꺼내 쿼리에 직접 조건으로 넣어야** 한다. RLS는 FE가 anon 키로 테이블을 직접 읽을 때의 안전장치다. 서비스 키와 DB 비밀번호는 FastAPI 환경변수에만 두고 FE에는 넣지 않는다.

---

## 4. ③ 횟수 계산 규칙 (10/15 결정)

1. **성분 기준으로 센다.** 상표·품목이 달라도 성분이 같으면 같은 약이다.
2. **혼합제는 성분마다 한 번씩 쓴 것으로 센다.** 더블킥(아바멕틴.스피네토람)을 한 번 뿌리면 아바멕틴 1회, 스피네토람 1회.
3. **세는 범위:** 같은 구역, 정식일(`zone.planted_at`) 이후, 취소되지 않은 기록.
4. **한도는 이번에 쓸 약과 이력에 있는 같은 성분 약들의 최대 횟수 중 가장 작은 값.** 각 이력의 한도는 그 기록이 가리키는 등록 행(`spray_log.use_id` → `safe_use_std.max_count`)에서 가져온다.
5. **혼합제는 성분마다 따로 계산하고, 하나라도 한도에 닿으면 불가.** 화면에는 가장 적게 남은 성분을 보여 준다.
6. 이번 약의 `max_count`가 NULL이거나 `parse_status`가 `no_std`·`failed`면 ⚪. 이력 약의 한도가 NULL이면 그 값은 한도 계산에서 빼고, 횟수에는 넣는다.

**순서와 상관없이 결과가 같다** (배추좀나방 예)

| 상황 | 이번 약 한도 | 이력 약 한도 | 적용 한도 | 스피네토람 사용 | 결과 |
| --- | --- | --- | --- | --- | --- |
| 엑설트 2번 → 더블킥 | 2 | 3 | **2** | 2 | 🔴 불가 |
| 더블킥 2번 → 엑설트 | 3 | 2 | **2** | 2 | 🔴 불가 |

**조회 SQL** (`:zone_id`, `:use_id` = 이번에 쓸 등록 행)

```sql
WITH cand AS (                     -- 이번 약의 성분과 한도
    SELECT ui.ingredient_id, s.max_count AS cand_max
    FROM use_ingredient ui
    JOIN safe_use_std s ON s.use_id = ui.use_id
    WHERE ui.use_id = :use_id
),
hist AS (                          -- 이번 작기 이력의 성분과 각 약의 한도
    SELECT ui.ingredient_id, s.max_count AS hist_max
    FROM spray_log l
    JOIN zone z            ON z.zone_id = l.zone_id
    JOIN use_ingredient ui ON ui.use_id = l.use_id
    JOIN safe_use_std s    ON s.use_id = l.use_id
    WHERE l.zone_id = :zone_id
      AND l.cancelled_at IS NULL
      AND l.sprayed_at >= z.planted_at
)
SELECT i.name                                         AS ingredient,
       c.cand_max,
       count(h.ingredient_id)                         AS used,
       LEAST(c.cand_max, min(h.hist_max))             AS limit_count,   -- NULL인 이력 한도는 LEAST·min이 무시
       LEAST(c.cand_max, min(h.hist_max)) - count(h.ingredient_id) AS remaining
FROM cand c
JOIN ingredient i ON i.ingredient_id = c.ingredient_id
LEFT JOIN hist h  ON h.ingredient_id = c.ingredient_id
GROUP BY i.name, c.cand_max
ORDER BY remaining;
-- 판정: cand_max IS NULL → ⚪ / remaining <= 0 인 성분이 하나라도 있으면 🔴 / 아니면 🟢 (가장 작은 remaining 표시)
```

④ 계열 반복도 같은 경로(`use_ingredient → ingredient → moa`)로 계열을 꺼낸다. 혼합제는 계열 중 하나라도 직전과 겹치면 같은 계열로 본다(표6 판단 방법 제안).

---

## 5. 첫 사례 — 배추 · 배추좀나방

착수 회의(10/6) 제안대로 등록약이 가장 많은 **배추**, 병해충은 **배추좀나방**(등록 288줄)이다.

### 5-1. 작물·병해충

| 항목 | 값 | 출처 |
| --- | --- | --- |
| 작물 | 배추 (PSIS 작물명 「배추」) | PSIS |
| 병해충 | 배추좀나방, 해충, *Plutella xylostella*, 부위 벌레·잎 | NCPMS 도감 |
| 발생 시기 | PDF 경보 6~10월 (고랭지·여름배추, 예보) / NCPMS 6·8·9월 | 농진청 발생정보 PDF, NCPMS |
| 등록약 | 288줄 → 사용 규칙 276줄 (성공 259 · 심을 때 10 · 제한 없음 7) | PSIS SVC01 |
| 별칭 | 없음 (PSIS 원문과 도감 이름이 같음) | — |

### 5-2. 약제 7개

모두 사용 방법 「발생 초부터 경엽처리」, 기준일 2026-10-05, 출처 PSIS SVC01. 이 7개는 배추좀나방에 사용 규칙이 한 줄씩만 있어 「엄격한 쪽」 처리가 필요 없다.

| # | 품목명 | 상표명 | 회사 | 희석배수 | 원문 | phi_days | max_count | 성분 (계열) | 최초 등록일 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 스피네토람 액상수화제 | 엑설트 | (주)동방아그로 | 2000배 | 수확7일전 3회 | 7 | 3 | 스피네토람 (5) | 2008-03-31 |
| 2 | 스피네토람 입상수화제 | 델리게이트 | (주)팜한농 | 2000배 | 수확7일전 3회 | 7 | 3 | 스피네토람 (5) | 2009-03-30 |
| 3 | 사이안트라닐리프롤 유상수화제 | 베네비아 | (주)팜한농 | 4000배 | 수확14일전 3회 | 14 | 3 | 사이안트라닐리프롤 (28) | 2022-05-09 |
| 4 | 노발루론 액상수화제 | 라이몬 | 한국삼공(주) | 2000배 | 수확10일전 2회 | 10 | 2 | 노발루론 (15) | 2006-12-29 |
| 5 | 레피멕틴 유제 | 검투사 | (주)팜한농 | 2000배 | 수확14일전 3회 | 14 | 3 | 레피멕틴 (6) | 2012-04-06 |
| 6 | 인독사카브 분산성액제 | 어바운트 | (주)농협케미컬 | 1000배 | 수확14일전 2회 | 14 | 2 | 인독사카브 (22a) | 2018-09-07 |
| 7 | 아바멕틴.스피네토람 액상수화제 | 더블킥 | (주)농협케미컬 | 2000배 | 수확14일전 2회 | 14 | 2 | 아바멕틴 (6) + 스피네토람 (5) | 2018-12-21 |

파싱 실패 사례용으로 배추 · 벼룩잎벌레의 다이아지논 유제(다지논)를 한 줄 더 넣는다.

### 5-3. 적용 규칙 (`6_반복규칙`)

| 규칙 | 내용 | 출처 |
| --- | --- | --- |
| 기본 | 같은 국내 계열을 연속으로 쓰지 않는다 (최근 2번 중 1번) | 농식품부 PLS 안내 |
| 살충제 | 같은 세대(약 30일) 안에서 같은 계열 2회까지 | IRAC MoA Classification v11.5 (2026.2) |

규칙이 겹치면 엄격한 쪽을 쓴다. 첫 사례는 PLS 기본 규칙(연속 금지)으로 ④를 판정한다.

### 5-4. 시험 사용자·구역·이력 (`is_test=true`, `source='seed'`)

| 구역 | 작물 | 정식일 | 이력 |
| --- | --- | --- | --- |
| A구역 (시험) | 배추 | 2026-08-20 | 9/05 검투사 → 9/15 라이몬 → 9/25 라이몬 → 10/03 엑설트 |
| B구역 (시험) | 배추 | 2026-09-01 | 0건 |
| C구역 (시험) | 배추 | 2026-08-25 | 9/10 엑설트 → 9/24 엑설트 |

시험 사용자 1명(`user_id = 00000000-0000-0000-0000-00000000a001`, `is_test = true`)이 밭 하나와 세 구역을 가진다. 카카오 계정이 아닌 시드 전용 사용자다.

### 5-5. 판정 기대값 (today = 2026-10-13, 성분 기준)

| 사례 | 구역 | 약 | ① 등록 | ② 시기 | ③ 횟수 | ④ 계열 | 전체 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 정상 | A | 베네비아 | 🟢 | 🟢 10/27부터 수확 | 🟢 사이안트라닐리프롤 0/3 → 3회 남음 | 🟢 직전 5, 이번 28 | **GREEN** |
| 주의 | A | 델리게이트 | 🟢 | 🟢 10/20부터 | 🟢 스피네토람 1/3 (엑설트 1회) → 2회 남음 | 🟡 직전 엑설트와 같은 5 | **AMBER** + 대안 |
| 횟수 소진 | A | 라이몬 | 🟢 | 🟢 10/23부터 | 🔴 노발루론 2/2 | 🟢 직전 5, 이번 15 | **RED** + 대안 |
| 혼합제 한도 | C | 더블킥 | 🟢 | 🟢 10/27부터 | 🔴 스피네토람 2/**2** (한도 = min(더블킥 2, 엑설트 3)), 아바멕틴 0/2 | 🟡 직전 5와 겹침 | **RED** + 대안 |
| 이력 0건 | B | 베네비아 | 🟢 | 🟢 10/27부터 | ⚪ 이력 없음 | ⚪ 이력 없음 | **UNKNOWN** |
| 파싱 실패 | — | 다지논 (배추 · 벼룩잎벌레) | 🟢 | ⚪ 원문 「파종(정식)일부터14일」 | ⚪ (`failed`) | — | **UNKNOWN** + 원문 |

혼합제 한도 사례가 팀이 정한 「같은 성분 약 중 가장 작은 한도」 규칙을 검증한다. 같은 이력에 엑설트만 기준으로 보면 3회라 통과지만, 더블킥 한도 2를 적용해 불가가 된다.

---

## 6. 시드 `supabase/seed.sql`

```sql
BEGIN;

-- 시험 사용자: auth.users에 넣으면 트리거가 app_user 행을 만든다 (로컬 supabase db reset 기준)
INSERT INTO auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000a001',
        'authenticated', 'authenticated', 'seed-test@farmguardian.local',
        '{"nickname":"시험 사용자"}', now(), now());
UPDATE app_user SET is_test = true WHERE user_id = '00000000-0000-0000-0000-00000000a001';

INSERT INTO crop (crop_id, name, psis_crop_names) VALUES
 (1, '감자',  '{감자,"감자(수미)"}'),
 (2, '배추',  '{배추}'),
 (3, '토마토', '{토마토,"토마토(방울토마토 포함)","토마토(슈퍼도태랑)"}');

INSERT INTO pest (pest_id, crop_id, kind, name, sci_name, parts, has_doc, photo_crop) VALUES
 (1, 2, 'insect', '배추좀나방', 'Plutella xylostella', '{벌레,잎}', true, '배추'),
 (2, 2, 'insect', '벼룩잎벌레', NULL, NULL, true, '배추');

INSERT INTO pest_season (pest_id, source, months, region, culti, grade, evidence) VALUES
 (1, 'pdf',   '{6,7,8,9,10}', NULL, '고랭지, 여름배추', '예보', NULL),
 (1, 'ncpms', '{6,8,9}',      NULL, NULL, NULL,
  '발생시기는 6월 상·중순에 최성기를 보이며, 고랭지 채소재배 지역에서는 평야지보다 / 늦은 8월 하순～9월 상순에 발생최성기를 보인다.');

INSERT INTO pesticide_use (use_id, pest_id, usage, product, brand, company, moa_code, method, dilution, use_time, use_count, reg_date) VALUES
 (1, 1, '살충', '스피네토람 액상수화제',          '엑설트',    '(주)동방아그로', '5',   '발생 초부터 경엽처리', '2000배 -', '수확7일전',  '3회', '2008-03-31'),
 (2, 1, '살충', '스피네토람 입상수화제',          '델리게이트', '(주)팜한농',    '5',   '발생 초부터 경엽처리', '2000배 -', '수확7일전',  '3회', '2009-03-30'),
 (3, 1, '살충', '사이안트라닐리프롤 유상수화제',   '베네비아',  '(주)팜한농',    '28',  '발생 초부터 경엽처리', '4000배 -', '수확14일전', '3회', '2022-05-09'),
 (4, 1, '살충', '노발루론 액상수화제',            '라이몬',    '한국삼공(주)',   '15',  '발생 초부터 경엽처리', '2000배 -', '수확10일전', '2회', '2006-12-29'),
 (5, 1, '살충', '레피멕틴 유제',                 '검투사',    '(주)팜한농',    '6',   '발생 초부터 경엽처리', '2000배 -', '수확14일전', '3회', '2012-04-06'),
 (6, 1, '살충', '인독사카브 분산성액제',          '어바운트',  '(주)농협케미컬', '22a', '발생 초부터 경엽처리', '1000배 -', '수확14일전', '2회', '2018-09-07'),
 (7, 2, '살충', '다이아지논 유제',               '다지논',    '아그리젠토(주)', '1b',  '발생 초부터 관주처리', '800배 -',  '파종(정식)일부터14일', '1회', '1981-02-25'),
 (8, 1, '살충', '아바멕틴.스피네토람 액상수화제',  '더블킥',    '(주)농협케미컬', '6+5', '발생 초부터 경엽처리', '2000배 -', '수확14일전', '2회', '2018-12-21');

INSERT INTO safe_use_std (use_id, phi_days, max_count, parse_status, note, base_date) VALUES
 (1, 7,  3, 'ok', NULL, '2026-10-05'),
 (2, 7,  3, 'ok', NULL, '2026-10-05'),
 (3, 14, 3, 'ok', NULL, '2026-10-05'),
 (4, 10, 2, 'ok', NULL, '2026-10-05'),
 (5, 14, 3, 'ok', NULL, '2026-10-05'),
 (6, 14, 2, 'ok', NULL, '2026-10-05'),
 (7, NULL, 1, 'failed', '파종·정식 후 14일 안에 쓰라는 뜻인지 확인', '2026-10-05'),
 (8, 14, 2, 'ok', NULL, '2026-10-05');

INSERT INTO moa (moa_id, kr_code, intl_code, usage_type, is_multi_site) VALUES
 (1, '5',   'IRAC 5',   'insecticide', false),
 (2, '28',  'IRAC 28',  'insecticide', false),
 (3, '15',  'IRAC 15',  'insecticide', false),
 (4, '6',   'IRAC 6',   'insecticide', false),
 (5, '22a', 'IRAC 22A', 'insecticide', false),
 (6, '1b',  'IRAC 1B',  'insecticide', false);

INSERT INTO ingredient (ingredient_id, name, moa_id) VALUES
 (1, '스피네토람',        1),
 (2, '사이안트라닐리프롤', 2),
 (3, '노발루론',          3),
 (4, '레피멕틴',          4),
 (5, '인독사카브',        5),
 (6, '다이아지논',        6),
 (7, '아바멕틴',          4);

INSERT INTO use_ingredient (use_id, seq, ingredient_id) VALUES
 (1,1,1),(2,1,1),(3,1,2),(4,1,3),(5,1,4),(6,1,5),(7,1,6),
 (8,1,7),(8,2,1);                                      -- 더블킥 = 아바멕틴 + 스피네토람

INSERT INTO rotation_rule (source, moa_scope, window_unit, window_size, max_consecutive, description) VALUES
 ('농식품부 PLS 안내', '농약 전체 (작용기작 표시 기준)', 'count', 2, 1,
  '(작용기작) 연속적으로 같은 숫자(1,2,3･･･) 또는 기호(가1, 나1･･･)인 농약을 사용하지 마세요.'),
 ('IRAC MoA Classification v11.5 (Feb 2026)', '살충제 전체 (예외 그룹 제외)', 'day', 30, 2,
  '같은 세대(약 30일) 안에서 2회까지');

-- 시험 데이터
INSERT INTO field (field_id, user_id, name) VALUES
 (1, '00000000-0000-0000-0000-00000000a001', '시험 밭 (시드)');
INSERT INTO zone (zone_id, field_id, name, crop_id, planted_at, is_test) VALUES
 (1, 1, 'A구역 (시험)', 2, '2026-08-20', true),
 (2, 1, 'B구역 (시험)', 2, '2026-09-01', true),
 (3, 1, 'C구역 (시험)', 2, '2026-08-25', true);

INSERT INTO spray_log (zone_id, use_id, pest_id, sprayed_at, source) VALUES
 (1, 5, 1, '2026-09-05', 'seed'),   -- A 검투사 (레피멕틴, 6)
 (1, 4, 1, '2026-09-15', 'seed'),   -- A 라이몬 (노발루론, 15)
 (1, 4, 1, '2026-09-25', 'seed'),   -- A 라이몬 → 노발루론 2/2
 (1, 1, 1, '2026-10-03', 'seed'),   -- A 엑설트 (스피네토람, 5) → 직전 계열
 (3, 1, 1, '2026-09-10', 'seed'),   -- C 엑설트
 (3, 1, 1, '2026-09-24', 'seed');   -- C 엑설트 → 스피네토람 2회

-- 직접 넣은 ID 뒤로 시퀀스를 맞춤
SELECT setval(pg_get_serial_sequence('crop','crop_id'),            (SELECT max(crop_id)       FROM crop));
SELECT setval(pg_get_serial_sequence('pest','pest_id'),            (SELECT max(pest_id)       FROM pest));
SELECT setval(pg_get_serial_sequence('pesticide_use','use_id'),    (SELECT max(use_id)        FROM pesticide_use));
SELECT setval(pg_get_serial_sequence('moa','moa_id'),              (SELECT max(moa_id)        FROM moa));
SELECT setval(pg_get_serial_sequence('ingredient','ingredient_id'),(SELECT max(ingredient_id) FROM ingredient));
SELECT setval(pg_get_serial_sequence('field','field_id'),          (SELECT max(field_id)      FROM field));
SELECT setval(pg_get_serial_sequence('zone','zone_id'),            (SELECT max(zone_id)       FROM zone));

COMMIT;
```

---

## 7. 적재 명령

**파일 위치 (Supabase CLI 기본 구조)**

```
supabase/
├─ config.toml
├─ migrations/
│  └─ 20261015000000_init.sql   ← 3-1 스키마 + 3-3 RLS
└─ seed.sql                     ← 6절 시드
```

**로컬 (각자 PC, Docker 필요)**

```bash
supabase init            # 처음 한 번 (레포에 supabase/ 폴더가 이미 있으면 생략)
supabase start           # 로컬 Supabase 실행
supabase db reset        # 마이그레이션 + seed.sql을 처음부터 다시 적용
```

**개발 프로젝트 (Supabase 클라우드, 팀 공용)**

```bash
supabase link --project-ref <프로젝트 ref>   # 대시보드 URL의 프로젝트 ID
supabase db push                            # migrations/ 적용
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql   # 시드는 한 번만 직접 넣는다
```

`SUPABASE_DB_URL`은 대시보드 → Connect의 Postgres 연결 문자열(세션 모드)이다. 원격 프로젝트의 시험 사용자는 시드의 `auth.users` INSERT 대신 대시보드 Authentication에서 만들고, 그 UUID로 `field.user_id`를 바꿔 넣는 쪽이 안전하다(8절 #16).

**확인 쿼리 — 배추좀나방 약 7개, 성분·계열까지 나오면 성공 (더블킥은 2줄)**

```bash
psql "$SUPABASE_DB_URL" -c "
SELECT u.brand, s.phi_days, s.max_count, i.name AS ingredient, m.kr_code, m.intl_code
FROM pesticide_use u
JOIN pest p            ON p.pest_id = u.pest_id AND p.name = '배추좀나방'
JOIN safe_use_std s    ON s.use_id = u.use_id
JOIN use_ingredient ui ON ui.use_id = u.use_id
JOIN ingredient i      ON i.ingredient_id = ui.ingredient_id
LEFT JOIN moa m        ON m.moa_id = i.moa_id
ORDER BY u.use_id, ui.seq;"
```

로컬이면 `supabase start`가 출력하는 DB URL(기본 `postgresql://postgres:postgres@127.0.0.1:54322/postgres`)을 쓴다. 4절 조회 SQL에 `:zone_id = 3, :use_id = 8`을 넣으면 스피네토람 `remaining = 0`(불가)이 나와야 한다. 전체 엑셀 적재(4,133줄)는 1절 대응표로 W3 전에 `load_excel.py`로 따로 넘긴다.

---

## 8. 누락 · 미확정 목록

| # | 항목 | 영향 | 해결 방법 | 담당 · 기한 제안 |
| --- | --- | --- | --- | --- |
| 1 | `registration` (등록취소) 표 없음 | ① 등록취소 판정·시드 케이스 불가 | PSIS SVC08 수집. 현재 키로 되는지 먼저 확인, 안 되면 「등록취소 농약정보」 추가 신청 | 한원탁 · W3 (10/19–25) |
| 2 | 「심을 때」 약도 성분 횟수·한도에 넣을지 | ③ | 예: 격파(디노테퓨란.스피네토람, 정식 전 육묘상 1회)를 쓰면 스피네토람 한도가 1이 되어 이후 엑설트가 막힌다. 팀 결정 필요 | DB·BE · W2 |
| 3 | 정식일 없을 때 ②③ 표시 | ③은 작기 시작을 몰라 셀 수 없음 | 팀 결정 (착수 회의 4절) | 전 팀 · W2 |
| 4 | 탈퇴 시 데이터 처리 | 개인정보 · 지역 통계 | 지금은 FastAPI가 Supabase Admin API로 `auth.users`를 지우면 연쇄 삭제. 지역 계통 사용 비중(P2)에 이력을 남기려면 익명화 방식으로 바꿔야 함 | 전 팀 · W4 전 |
| 5 | 성분명 표기가 다른 같은 성분 | ③ 누락 가능 | 성분명은 품목명 표기 그대로라, 표기가 다르면 다른 성분으로 센다. PSIS `engName`(주성분 영문명)으로 대조 | 한원탁 · 전체 적재 때 |
| 6 | 계열 모르는 성분 5개, 별표 8에 없는 기호 (가5, 34, 「다2, N-3」) | ④ 해당 약은 ⚪ | PSIS 화면 대조 | 한원탁 · W3 |
| 7 | `moa.is_multi_site` 칸 엑셀에 없음 | ④ 예외(카·M·IRAC 8·13·UN) | 적재 스크립트에서 계산 | 한원탁 · 전체 적재 때 |
| 8 | 3번 파일에 PSIS 조회키(`pestiCode`, `diseaseUseSeq`) 없음 | 재수집 시 행 단위 대조 | 다음 갱신 때 칸 추가 | 최현성 |
| 9 | 4번 「확인 필요」 7줄 | ②③ ⚪ + 원문 | 수작업 채움 또는 ⚪ 유지 (팀 결정) | 전 팀 |
| 10 | 국내 지침 「동일 약종 2~3회」 1차 출처 없음 | 표6에서 제외됨 | 출처 찾으면 추가 | 한원탁 |
| 11 | `resistance_ref` 논문 저항성값 | P1 화면 | 문헌 수집 + citation | W5 |
| 12 | 배추·토마토 재식거리 | 구역 주수 계산 | 농사로 표준 재배법에서 확보 | W4 전 |
| 13 | 도감 사진 없음 14개, 학명 22 · 증상 11 빈칸 | 도감 화면 | 공공기관 사진만 보충 | 최현성 |
| 14 | 실제 밭·구역 좌표 (팜맵) | 시드는 좌표 없음 | W4 팜맵 응답 확인 후 | DB·BE |
| 15 | PSIS·NCPMS·FRAC 이용 조건 (변경금지·비영리·상업 이용 허가) | 서비스 리스크 | PRD 리스크 표에 등록 | PM |
| 16 | 시드의 `auth.users` 직접 INSERT는 실제 Supabase에서 아직 실행 안 함 | 시험 사용자 생성 | 로컬 `supabase db reset`으로 먼저 확인. 막히면 대시보드에서 사용자 생성 후 UUID 교체 | 한원탁 · W2 |
| 17 | 카카오 로그인 설정 (Kakao Developers 앱 키, Supabase Auth Kakao 공급자, Redirect URL) | 로그인 | BE·FE가 설정. 닉네임이 `raw_user_meta_data`의 어느 키로 오는지 첫 로그인에서 확인해 트리거 수정 | BE · W2 |
| 18 | FastAPI 연결 방식 (직접 연결 / 풀러) | 서버 | 풀러의 트랜잭션 모드에서 asyncpg를 쓰면 prepared statement 캐시를 꺼야 한다. 연결 문자열 종류는 BE가 정함 | BE |

**해결됨 (10/15):** ③ 횟수 단위 → 성분 기준, 같은 성분 약 중 가장 작은 한도, 혼합제는 성분별 계산.

## 9. 출처

| 자료 | 버전 · 받은 날 |
| --- | --- |
| PSIS OpenAPI SVC01 (농약등록정보) | 2026-10-05 수집, 매뉴얼 ver 1.0 |
| NCPMS 도감 · 발생정보 | 현성 수집 (최종 폴더) |
| 농진청 「농작물 병해충 발생정보」 PDF | 2023~2026년 |
| 별표 8 작용기작그룹 표시 분류기준 | 성분별 목록 2023.3.16 개정 |
| IRAC MoA Classification | v11.5, 2026.2 |
| FRAC Code List | 2026 (May 2026) |
| 농식품부 PLS 제도 안내 | https://www.mafra.go.kr/PLS/2066/subview.do (2026-10-05 PDF 보관) |
