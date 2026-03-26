-- Replace job forecast seed data without modifying historical migrations.
-- This migration assumes tables were created by V11.

-- Remove existing seed and generated forecast data tied to roles.
-- ON DELETE CASCADE from job_role will clean:
-- job_role_core_task, job_forecast, job_forecast_task
DELETE FROM job_role;

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
SELECT id, 'markup_automation', '요구사항 분석 및 설계',
       '응용소프트웨어의 개발 범위와 목표를 설정하고, 소프트웨어의 세부적인 기능 및 사양에 관한 상세 설계를 수행한다.', 1
FROM job_role WHERE code = 'developer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'api_scaffolding', '프로그램 개발 및 통합',
       '상세 설계에 따라 단위 프로그램을 개발하고, 개발된 여러 프로그램들을 모아 응용시스템으로 결합시킨다.', 2
FROM job_role WHERE code = 'developer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'code_review_assist', '테스트 및 품질 검증',
       '해당 컴퓨터시스템에 개발된 프로그램을 설치하고 기능 및 성능을 종합적으로 평가·분석하며, 테스트를 통해 버그를 수정한다.', 3
FROM job_role WHERE code = 'developer';

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'ad_copy_generation', '시장조사 및 소비자 분석',
       '소비자 행동 데이터를 수집·분석하여 타깃 시장의 니즈를 파악하고 마케팅 방향을 설정한다.', 1
FROM job_role WHERE code = 'marketer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'campaign_report_summary', '마케팅 전략 및 캠페인 기획',
       '브랜드 포지셔닝과 매체 전략을 수립하고, 광고·홍보 캠페인 전반을 기획·실행한다.', 2
FROM job_role WHERE code = 'marketer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'trend_monitoring', '콘텐츠 및 채널 관리',
       '온·오프라인 매체(SNS, 디지털, 인쇄 등)를 활용하여 광고 콘텐츠를 제작·배포하고 채널별 성과를 관리한다.', 3
FROM job_role WHERE code = 'marketer';

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'document_drafting', '문서 작성 및 서류 관리',
       '각종 공문서, 보고서, 회의록 등을 작성·접수·분류하고 문서 보관 체계를 유지한다.', 1
FROM job_role WHERE code = 'admin-assistant';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'schedule_coordination', '일정 조율 및 회의 지원',
       '임직원의 일정을 관리하고, 회의 준비·진행·사후 처리를 지원한다.', 2
FROM job_role WHERE code = 'admin-assistant';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'record_classification', '물품 구매 및 비품 관리',
       '사무용품 및 소모품을 청구·수발하고 재고를 관리한다.', 3
FROM job_role WHERE code = 'admin-assistant';

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'speech_translation', '동시·순차 통역',
       '국제회의, 비즈니스 협상, 외교 행사 등에서 발화 내용을 실시간으로 또는 순차적으로 다른 언어로 전달한다.', 1
FROM job_role WHERE code = 'interpreter';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'document_translation', '번역 전처리 및 용어 조사',
       '통역 전 관련 분야의 전문용어, 배경지식, 자료를 사전에 조사·숙지하여 정확한 통역을 준비한다.', 2
FROM job_role WHERE code = 'interpreter';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'terminology_alignment', '문화적 맥락 중재',
       '언어 간 문화적 차이를 고려하여 의미가 왜곡되지 않도록 맥락에 맞게 내용을 조율·전달한다.', 3
FROM job_role WHERE code = 'interpreter';

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'faq_response', '고객 문의 응대',
       '전화·채팅·이메일 등 다양한 채널을 통해 고객의 질문, 불만, 요청 사항을 접수하고 안내한다.', 1
FROM job_role WHERE code = 'customer-support';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'ticket_classification', '문제 해결 및 민원 처리',
       '고객의 불만 사항을 파악하고, 규정과 권한 범위 내에서 신속하게 해결책을 제시하거나 담당 부서로 연결한다.', 2
FROM job_role WHERE code = 'customer-support';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'call_summary', '상담 이력 기록 및 관리',
       '상담 내용, 처리 결과, 고객 정보를 시스템에 정확히 입력·관리하여 이력을 유지한다.', 3
FROM job_role WHERE code = 'customer-support';

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'precedent_search', '법률 자문 및 상담',
       '개인·기업 의뢰인의 법적 문제를 분석하고, 관련 법령·판례를 검토하여 법률 의견 및 해결 방안을 제시한다.', 1
FROM job_role WHERE code = 'lawyer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'contract_review_checklist', '소송 대리 및 변론',
       '민사·형사·행정 등 각종 소송에서 의뢰인을 대리하여 법원에 출석하고, 주장과 증거를 정리·제출하여 변론한다.', 2
FROM job_role WHERE code = 'lawyer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'brief_drafting', '계약서 및 법률문서 작성·검토',
       '각종 계약서, 협약서, 법적 의견서를 작성하고, 분쟁 예방을 위한 법적 위험을 검토·조언한다.', 3
FROM job_role WHERE code = 'lawyer';

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'expense_categorization', '재무제표 감사',
       '기업의 재무제표가 일반적으로 인정된 회계원칙(GAAP·IFRS)에 따라 적정하게 작성되었는지 독립적으로 감사하고 감사의견을 표명한다.', 1
FROM job_role WHERE code = 'accountant';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'closing_report_draft', '세무 신고 및 세무 조정',
       '법인세·부가가치세 등 각종 세금을 계산·신고하고, 세무조정계산서를 작성하며 세무 관련 자문을 제공한다.', 2
FROM job_role WHERE code = 'accountant';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'compliance_check', '원가 및 관리 회계',
       '원가 분석, 예산 편성, 손익 분기점 분석 등 내부 경영 의사결정을 위한 관리회계 업무를 수행한다.', 3
FROM job_role WHERE code = 'accountant';

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'session_note_summary', '심리 평가 및 진단',
       '표준화된 심리검사 도구(성격, 지능, 정서 등)를 활용하여 내담자의 심리적 상태를 평가하고 문제를 파악한다.', 1
FROM job_role WHERE code = 'counselor';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'screening_questionnaire', '개인 상담 및 심리치료',
       '인지행동치료, 정신분석, 인간중심치료 등 다양한 상담 기법을 적용하여 내담자의 심리적 문제를 해결하도록 지원한다.', 2
FROM job_role WHERE code = 'counselor';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'resource_recommendation', '상담 계획 수립 및 목표 설정',
       '내담자의 문제 특성과 욕구를 반영한 상담 목표와 회기별 개입 계획을 수립하고 진행 과정을 모니터링한다.', 3
FROM job_role WHERE code = 'counselor';

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'moodboard_generation', '트렌드 조사 및 컨셉 기획',
       '국내외 패션 트렌드, 소비자 동향, 시즌 테마를 분석하여 컬렉션 컨셉과 디자인 방향을 설정한다.', 1
FROM job_role WHERE code = 'fashion-designer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'pattern_variation', '의상 디자인 및 도식화',
       '스케치 및 CAD 도구를 활용하여 의상 디자인 도면(도식화)을 작성하고 소재·색상·패턴을 결정한다.', 2
FROM job_role WHERE code = 'fashion-designer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'product_description', '패턴 제작 및 샘플 피팅',
       '원형 패턴을 제작하고 샘플 의류를 제작한 뒤 피팅을 통해 핏·실루엣·디테일을 수정·보완한다.', 3
FROM job_role WHERE code = 'fashion-designer';

INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'incident_report_draft', '범죄 예방 및 순찰',
       '담당 지역을 순찰하며 범죄 발생을 예방하고, 위험 상황에 대응하며 주민 안전을 확보한다.', 1
FROM job_role WHERE code = 'police-officer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'cctv_log_review', '사건·사고 수사 및 조사',
       '범죄 신고를 접수하고 현장에 출동하여 증거를 수집하고, 피의자·참고인을 조사하여 수사 보고서를 작성한다.', 2
FROM job_role WHERE code = 'police-officer';
INSERT INTO job_role_core_task (job_role_id, task_key, task_title, task_description, display_order)
SELECT id, 'patrol_briefing', '교통 관리 및 단속',
       '교통 흐름을 통제하고, 교통법규 위반 행위를 단속하며, 교통사고 발생 시 현장을 조사한다.', 3
FROM job_role WHERE code = 'police-officer';
