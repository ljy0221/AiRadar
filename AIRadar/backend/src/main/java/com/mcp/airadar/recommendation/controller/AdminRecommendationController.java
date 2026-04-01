package com.mcp.airadar.recommendation.controller;

import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Map;

/**
 * 추천 배치 수동 트리거 API
 *
 * POST /api/v1/admin/recommendations/trigger
 *   → Airflow REST API로 recommendation_batch DAG 즉시 실행
 *   → [AUTH 필요] 로그인한 사용자만 사용 가능
 *
 * 환경변수:
 *   AIRFLOW_BASE_URL  : http://airflow:8081 (기본값)
 *   AIRFLOW_USERNAME  : airflow admin 계정
 *   AIRFLOW_PASSWORD  : airflow admin 비밀번호
 */
@Log4j2
@RestController
@RequestMapping("/api/v1/admin/recommendations")
public class AdminRecommendationController {

    private static final String DAG_ID = "recommendation_batch";

    private final HttpClient httpClient;
    private final String airflowBaseUrl;
    private final String airflowUsername;
    private final String airflowPassword;

    public AdminRecommendationController(
            @Value("${airflow.base-url:http://airflow:8081}") String airflowBaseUrl,
            @Value("${airflow.username:airflow}") String airflowUsername,
            @Value("${airflow.password:airflow}") String airflowPassword) {
        this.airflowBaseUrl  = airflowBaseUrl;
        this.airflowUsername = airflowUsername;
        this.airflowPassword = airflowPassword;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * ALS 추천 배치 수동 트리거
     * POST /api/v1/admin/recommendations/trigger
     *
     * Airflow DAG run ID: manual__<date>__<timestamp>
     * 이미 실행 중인 run이 있어도 max_active_runs=1 이므로 Airflow가 대기시킴
     */
    @PostMapping("/trigger")
    public ResponseEntity<Map<String, String>> triggerRecommendationBatch() {
        String date    = LocalDate.now().toString();
        String runId   = "manual__" + date + "__" + System.currentTimeMillis();
        String url     = airflowBaseUrl + "/api/v1/dags/" + DAG_ID + "/dagRuns";
        String body    = """
                {"dag_run_id": "%s", "conf": {"date": "%s"}}
                """.formatted(runId, date).strip();

        String credentials = java.util.Base64.getEncoder()
                .encodeToString((airflowUsername + ":" + airflowPassword).getBytes());

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Basic " + credentials)
                    .timeout(Duration.ofSeconds(10))
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200 || response.statusCode() == 201) {
                log.info("[Admin] recommendation_batch DAG 수동 트리거 성공: runId={}", runId);
                return ResponseEntity.ok(Map.of(
                        "status",  "triggered",
                        "dag_id",  DAG_ID,
                        "run_id",  runId,
                        "date",    date
                ));
            }

            log.warn("[Admin] Airflow 응답 오류: status={}, body={}", response.statusCode(), response.body());
            return ResponseEntity.status(502).body(Map.of(
                    "status",  "error",
                    "message", "Airflow returned " + response.statusCode()
            ));

        } catch (Exception e) {
            log.error("[Admin] Airflow 연결 실패: {}", e.getMessage());
            return ResponseEntity.status(503).body(Map.of(
                    "status",  "error",
                    "message", "Airflow unreachable: " + e.getMessage()
            ));
        }
    }
}
