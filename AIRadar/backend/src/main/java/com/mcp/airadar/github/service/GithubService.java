package com.mcp.airadar.github.service;

import com.mcp.airadar.github.dto.GithubTrendingDto;
import com.mcp.airadar.github.repository.GithubRepoDailyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class GithubService {

    private static final int MAX_LIMIT = 50;

    private final GithubRepoDailyRepository githubRepoDailyRepository;

    public GithubService(GithubRepoDailyRepository githubRepoDailyRepository) {
        this.githubRepoDailyRepository = githubRepoDailyRepository;
    }

    /**
     * 특정 날짜 기준 star 급증 레포 목록 반환.
     *
     * @param date  조회 기준 날짜 (null이면 오늘)
     * @param limit 최대 반환 건수 (최대 50)
     */
    public List<GithubTrendingDto> getTrendingRepos(LocalDate date, int limit) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        int safeLimit = Math.min(limit, MAX_LIMIT);

        return githubRepoDailyRepository.findTrendingByDate(targetDate, safeLimit)
                .stream()
                .map(row -> new GithubTrendingDto(
                        (String)  row[0],
                        (String)  row[1],
                        (String)  row[2],
                        (String)  row[3],
                        row[4] != null ? ((Number) row[4]).longValue() : null,
                        row[5] != null ? ((Number) row[5]).intValue()  : null,
                        row[6] != null ? ((java.sql.Date) row[6]).toLocalDate() : null
                ))
                .toList();
    }
}
