-- ProtoLive PostgreSQL 샘플 데이터 (개발/QA용)
-- 사용 전제: db/schema.sql이 반영된 상태에서 실행

BEGIN;

TRUNCATE TABLE
  project_events,
  match_proposals,
  projects,
  users
RESTART IDENTITY CASCADE;

INSERT INTO users (id, email, role, created_at) VALUES
  (1, 'maker-a@protolive.local', 'maker', '2026-05-21T10:00:00+09:00'),
  (2, 'maker-b@protolive.local', 'maker', '2026-05-21T10:02:00+09:00'),
  (3, 'maker-c@protolive.local', 'maker', '2026-05-21T10:03:00+09:00'),
  (4, 'investor-a@protolive.local', 'investor', '2026-05-23T11:00:00+09:00'),
  (5, 'investor-b@protolive.local', 'investor', '2026-05-23T11:04:00+09:00'),
  (6, 'investor-c@protolive.local', 'investor', '2026-05-23T11:08:00+09:00');

INSERT INTO projects (
  id,
  user_id,
  title,
  description,
  live_url,
  category,
  access_mode,
  protection_notice_accepted,
  final_url,
  validation_success,
  http_status,
  response_time_ms,
  last_verified_at,
  investor_count,
  match_count,
  committed_amount_min,
  committed_amount_max,
  created_at
) VALUES
    (1, 1, 'SignalBoard for Founders', '초기 창업자를 위한 투자자 매칭 대시보드. 공개 데모 링크를 통해 실제 사용 로그와 문의 유입을 함께 추적합니다.', 'https://example.com/signalboard', 'AI & SaaS', 'open', TRUE, 'https://example.com/signalboard', TRUE, 200, 210, '2026-05-23T01:00:00+09:00', 2, 2, 60000000, 130000000, '2026-05-21T10:00:00+09:00'),
    (2, 1, 'CreatorOps Lab', '콘텐츠 크리에이터 수익화 실험 도구. 유입/리텐션 실측과 PMF 인터뷰 데이터 공유를 전제합니다.', 'https://example.com/creator-ops', 'Other', 'screened', TRUE, 'https://example.com/creator-ops', TRUE, 200, 640, '2026-05-24T03:20:00+09:00', 2, 2, 150000000, 400000000, '2026-05-22T09:30:00+09:00'),
  (3, 2, 'FinOps Check', '재무 리스크 알림과 회수 전략을 동시에 보여주는 투자자 중심 템플릿.', 'https://example.com/finops-check', 'FinTech', 'open', TRUE, NULL, FALSE, 403, 1880, '2026-05-25T14:10:00+09:00', 0, 0, 0, 0, '2026-05-22T19:40:00+09:00'),
    (4, 3, 'TaskFlow AI', '개인형 태스크 플로우 엔진. PM·영업·투자자용 협업 보드까지 연동해 데모를 운영합니다.', 'https://example.com/taskflow-ai', 'Web3 & Community', 'screened', TRUE, 'https://example.com/taskflow-ai', TRUE, 200, 320, '2026-05-27T18:00:00+09:00', 3, 3, 180000000, 450000000, '2026-05-20T07:00:00+09:00'),
    (5, 1, 'Pulse Commerce', '이커머스 운영자에게 실시간 전환 분석과 투자자 질의 로그를 동시에 제공하는 데모.', 'https://example.com/pulse-commerce', 'XR & E-Commerce', 'open', TRUE, NULL, TRUE, 200, 280, '2026-05-28T10:30:00+09:00', 1, 1, 10000000, 30000000, '2026-05-28T10:30:00+09:00');

INSERT INTO match_proposals (id, project_id, funding_range_id, message, created_at) VALUES
  (1, 1, 'seed-50-100', '시드 단계부터 파일럿 고객 전환율 추적 지표를 같이 보고 싶습니다.', '2026-05-25T06:10:00+09:00'),
  (2, 1, 'pre-seed-10-30', '우선 1차 PoC 진행 후 투자 라운드 확장까지 검토 가능한지 보고 싶습니다.', '2026-05-26T13:00:00+09:00'),
  (3, 2, 'seed-100-300', '콘텐츠 크리에이터 마케팅 데이터 품질을 함께 테스트해보겠습니다.', '2026-05-29T21:40:00+09:00'),
  (4, 2, 'seed-50-100', '유입·구독 지표가 안정적이면 2개월 내 계약까지 진행 가능합니다.', '2026-05-30T09:20:00+09:00'),
  (5, 4, 'pre-seed-30-50', '보안 토폴로지와 멀티 채널 협업 구조가 괜찮아 보입니다.', '2026-05-31T11:10:00+09:00'),
  (6, 4, 'seed-100-300', 'PMF 리포트를 함께 받아보면 빠르게 의사결정 가능합니다.', '2026-05-31T11:42:00+09:00'),
  (7, 4, 'seed-50-100', '팀 확장 전 단계 투자 제안서를 공유받고 싶습니다.', '2026-06-01T00:55:00+09:00'),
  (8, 5, 'pre-seed-10-30', '온보딩 경로를 개선하면 성장성이 높아 보입니다. 소규모 실험을 시작해요.', '2026-06-01T03:33:00+09:00');

INSERT INTO project_events (id, project_id, event_type, created_at) VALUES
  (1, 1, 'create', '2026-05-21T10:05:00+09:00'),
  (2, 1, 'preview', '2026-05-24T08:12:00+09:00'),
  (3, 1, 'outbound', '2026-05-24T09:20:00+09:00'),
  (4, 1, 'match', '2026-05-25T06:11:00+09:00'),
  (5, 1, 'refresh', '2026-05-28T11:31:00+09:00'),
  (6, 2, 'create', '2026-05-22T09:40:00+09:00'),
  (7, 2, 'preview', '2026-05-30T18:20:00+09:00'),
  (8, 2, 'match', '2026-05-30T21:00:00+09:00'),
  (9, 2, 'preview', '2026-06-01T00:10:00+09:00'),
  (10, 3, 'create', '2026-05-22T20:00:00+09:00'),
  (11, 3, 'refresh', '2026-06-01T03:20:00+09:00'),
  (12, 4, 'create', '2026-05-20T07:06:00+09:00'),
  (13, 4, 'match', '2026-05-26T15:50:00+09:00'),
  (14, 4, 'match', '2026-05-27T16:10:00+09:00'),
  (15, 4, 'match', '2026-06-01T04:10:00+09:00'),
  (16, 4, 'outbound', '2026-06-01T05:00:00+09:00'),
  (17, 4, 'refresh', '2026-06-01T07:13:00+09:00'),
  (18, 5, 'create', '2026-05-28T10:45:00+09:00'),
  (19, 5, 'outbound', '2026-05-29T09:33:00+09:00'),
  (20, 5, 'refresh', '2026-05-30T08:00:00+09:00'),
  (21, 5, 'preview', '2026-06-01T01:30:00+09:00');

SELECT setval(pg_get_serial_sequence('users', 'id'), 6, TRUE);
SELECT setval(pg_get_serial_sequence('projects', 'id'), 5, TRUE);
SELECT setval(pg_get_serial_sequence('match_proposals', 'id'), 8, TRUE);
SELECT setval(pg_get_serial_sequence('project_events', 'id'), 21, TRUE);

COMMIT;
