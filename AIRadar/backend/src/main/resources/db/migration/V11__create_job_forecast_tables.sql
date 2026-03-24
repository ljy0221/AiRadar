CREATE TABLE job_role (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE job_role_core_task (
    id BIGSERIAL PRIMARY KEY,
    job_role_id BIGINT NOT NULL REFERENCES job_role(id) ON DELETE CASCADE,
    task_key VARCHAR(100) NOT NULL,
    task_title VARCHAR(200) NOT NULL,
    task_description TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (job_role_id, task_key)
);

CREATE TABLE job_forecast (
    id BIGSERIAL PRIMARY KEY,
    job_role_id BIGINT NOT NULL REFERENCES job_role(id) ON DELETE CASCADE,
    forecast_month DATE NOT NULL,
    generated_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    model_name VARCHAR(100),
    prompt_version VARCHAR(100),
    raw_response_json JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (job_role_id, forecast_month)
);

CREATE TABLE job_forecast_task (
    id BIGSERIAL PRIMARY KEY,
    forecast_id BIGINT NOT NULL REFERENCES job_forecast(id) ON DELETE CASCADE,
    task_key VARCHAR(100) NOT NULL,
    task_title VARCHAR(200) NOT NULL,
    task_description TEXT NOT NULL,
    impact_summary TEXT NOT NULL,
    workflow_steps_json JSONB NOT NULL,
    automation_effect TEXT,
    human_strengths TEXT[] NOT NULL DEFAULT '{}',
    recommended_skills TEXT[] NOT NULL DEFAULT '{}',
    promising_tools TEXT[] NOT NULL DEFAULT '{}',
    paper_evidence_level VARCHAR(20),
    paper_evidence_note VARCHAR(100),
    news_evidence_count INTEGER NOT NULL DEFAULT 0,
    news_evidence_note VARCHAR(100),
    display_order INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (forecast_id, task_key)
);

INSERT INTO job_role (code, name) VALUES
('developer', '개발자'),
('marketer', '마케터'),
('admin-assistant', '행정 보조'),
('interpreter', '통역사'),
('customer-support', '고객 상담원'),
('lawyer', '변호사'),
('accountant', '회계사'),
('counselor', '심리상담사'),
('fashion-designer', '패션 디자이너'),
('police-officer', '경찰관');

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'markup_automation', '피그마 시안을 바탕으로 하는 단순 마크업 자동화',
       'AI가 디자인 파일을 분석하고 초기 React/HTML/CSS 마크업을 빠르게 생성하는 업무입니다.', 1
FROM job_role WHERE code = 'developer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'api_scaffolding', '반복적인 CRUD API 보일러플레이트 생성',
       '기본적인 엔티티, DTO, 컨트롤러, 서비스, 테스트 코드 초안을 자동 생성하는 업무입니다.', 2
FROM job_role WHERE code = 'developer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'code_review_assist', '정적 분석 기반 코드 리뷰 초안 작성',
       '코드 변경사항을 분석하여 잠재 버그, 스타일 이슈, 테스트 누락 지점을 먼저 찾아주는 업무입니다.', 3
FROM job_role WHERE code = 'developer';

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'ad_copy_generation', '광고 카피 초안 대량 생성',
       '타깃 고객과 채널 특성에 맞는 광고 문구를 여러 버전으로 빠르게 만드는 업무입니다.', 1
FROM job_role WHERE code = 'marketer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'campaign_report_summary', '캠페인 리포트 자동 요약',
       '광고 성과 수치를 바탕으로 핵심 인사이트와 다음 액션을 정리하는 업무입니다.', 2
FROM job_role WHERE code = 'marketer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'trend_monitoring', '경쟁사 및 트렌드 모니터링',
       '시장 변화와 경쟁사 메시지를 수집하고 반복적으로 정리하는 업무입니다.', 3
FROM job_role WHERE code = 'marketer';

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'document_drafting', '반복 문서 작성 초안 생성',
       '정형화된 공문, 보고서, 안내문 초안을 자동으로 만드는 업무입니다.', 1
FROM job_role WHERE code = 'admin-assistant';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'schedule_coordination', '일정 및 회의 조율 자동화',
       '회의 요청, 일정 충돌 확인, 메일 초안 작성 등 반복 행정을 처리하는 업무입니다.', 2
FROM job_role WHERE code = 'admin-assistant';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'record_classification', '문서 분류 및 정리',
       '내부 문서, 첨부파일, 회의록을 규칙에 맞게 분류하고 저장하는 업무입니다.', 3
FROM job_role WHERE code = 'admin-assistant';

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'speech_translation', '실시간 회의 발화 1차 번역',
       '회의 음성을 실시간 텍스트로 변환하고 빠르게 초벌 번역하는 업무입니다.', 1
FROM job_role WHERE code = 'interpreter';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'document_translation', '반복 문서 번역 초안 작성',
       'FAQ, 안내서, 계약 개요 등 정형 문서의 초벌 번역을 만드는 업무입니다.', 2
FROM job_role WHERE code = 'interpreter';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'terminology_alignment', '용어집 정리 및 표현 통일',
       '업무 도메인별 번역 용어를 정리하고 일관된 표현을 유지하는 업무입니다.', 3
FROM job_role WHERE code = 'interpreter';

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'faq_response', 'FAQ 기반 1차 상담 응답',
       '반복 문의에 대해 빠르게 표준 답변을 제시하는 업무입니다.', 1
FROM job_role WHERE code = 'customer-support';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'ticket_classification', '문의 유형 자동 분류',
       '고객 문의를 환불, 배송, 기술 문제 등으로 분류하는 업무입니다.', 2
FROM job_role WHERE code = 'customer-support';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'call_summary', '상담 내역 요약 및 후속조치 정리',
       '통화나 채팅 기록을 요약하고 다음 액션을 정리하는 업무입니다.', 3
FROM job_role WHERE code = 'customer-support';

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'precedent_search', '판례 및 법령 1차 검색',
       '쟁점 키워드에 맞는 판례와 법령 후보를 빠르게 찾는 업무입니다.', 1
FROM job_role WHERE code = 'lawyer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'contract_review_checklist', '계약서 검토 체크리스트 생성',
       '표준 계약서 조항을 스캔하고 누락 또는 위험 항목을 정리하는 업무입니다.', 2
FROM job_role WHERE code = 'lawyer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'brief_drafting', '법률 서면 초안 보조',
       '의견서, 메모, 사실관계 요약의 초안을 빠르게 만드는 업무입니다.', 3
FROM job_role WHERE code = 'lawyer';

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'expense_categorization', '거래내역 자동 분류',
       '지출과 수입 항목을 회계 기준에 맞게 분류하는 업무입니다.', 1
FROM job_role WHERE code = 'accountant';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'closing_report_draft', '월 마감 보고서 초안 작성',
       '월별 재무 수치를 요약하고 주요 변동 원인을 정리하는 업무입니다.', 2
FROM job_role WHERE code = 'accountant';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'compliance_check', '증빙 및 규정 준수 검토',
       '증빙 누락, 이상 거래, 규정 위반 가능성을 점검하는 업무입니다.', 3
FROM job_role WHERE code = 'accountant';

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'session_note_summary', '상담 기록 요약 정리',
       '상담 대화를 구조화해 핵심 이슈와 후속 계획을 정리하는 업무입니다.', 1
FROM job_role WHERE code = 'counselor';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'screening_questionnaire', '초기 문진 문항 추천',
       '내담자 상태를 빠르게 파악하기 위한 문진 문항을 추천하는 업무입니다.', 2
FROM job_role WHERE code = 'counselor';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'resource_recommendation', '상담 자료 및 과제 추천',
       '상담 주제에 맞는 교육 자료, 활동 과제, 셀프 케어 자료를 추천하는 업무입니다.', 3
FROM job_role WHERE code = 'counselor';

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'moodboard_generation', '트렌드 기반 무드보드 초안 생성',
       '시즌 키워드와 참고 이미지를 바탕으로 초기 컨셉 보드를 만드는 업무입니다.', 1
FROM job_role WHERE code = 'fashion-designer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'pattern_variation', '패턴 및 컬러 변형안 생성',
       '기존 디자인의 색상, 패턴, 소재 조합을 여러 버전으로 시도하는 업무입니다.', 2
FROM job_role WHERE code = 'fashion-designer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'product_description', '상품 설명문 자동 초안 작성',
       '디자인 특징과 착장 포인트를 반영한 설명문을 작성하는 업무입니다.', 3
FROM job_role WHERE code = 'fashion-designer';

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'incident_report_draft', '사건 보고서 초안 정리',
       '현장 기록과 진술을 토대로 기본 보고서 구조를 정리하는 업무입니다.', 1
FROM job_role WHERE code = 'police-officer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'cctv_log_review', 'CCTV 및 로그 1차 검토',
       '대량 영상과 로그 중 이상 징후 구간을 우선 탐지하는 업무입니다.', 2
FROM job_role WHERE code = 'police-officer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'patrol_briefing', '순찰 브리핑 요약 생성',
       '지역 사건 이력과 주의 대상을 요약해 순찰 전 브리핑 자료로 만드는 업무입니다.', 3
FROM job_role WHERE code = 'police-officer';
