package com.mcp.airadar.github.service;

import com.mcp.airadar.github.dto.GithubActivityPointDto;
import com.mcp.airadar.github.dto.GithubOverviewDto;
import com.mcp.airadar.github.dto.GithubTrendingDto;
import com.mcp.airadar.github.dto.GithubTrendingRepoDto;
import com.mcp.airadar.github.entity.GithubRepo;
import com.mcp.airadar.github.entity.GithubRepoDaily;
import com.mcp.airadar.github.repository.GithubRepoDailyRepository;
import com.mcp.airadar.github.repository.GithubRepoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class GithubService {

    private static final int MAX_LIMIT = 50;
    private static final int MAX_DAILY_WINDOW = 7;
    private static final int MAX_MONTHLY_WINDOW = 7;
    private static final DateTimeFormatter DAILY_LABEL_FORMAT = DateTimeFormatter.ofPattern("MM-dd");
    private static final DateTimeFormatter MONTHLY_LABEL_FORMAT = DateTimeFormatter.ofPattern("yy-MM");

    private final GithubRepoRepository githubRepoRepository;
    private final GithubRepoDailyRepository githubRepoDailyRepository;

    public GithubService(
            GithubRepoRepository githubRepoRepository,
            GithubRepoDailyRepository githubRepoDailyRepository
    ) {
        this.githubRepoRepository = githubRepoRepository;
        this.githubRepoDailyRepository = githubRepoDailyRepository;
    }

    public GithubOverviewDto getGithubOverview(LocalDate date, int limit, int dailyWindow, int monthlyWindow) {
        LocalDate requestedDate = date != null ? date : LocalDate.now();
        int safeLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
        int safeDailyWindow = Math.max(1, Math.min(dailyWindow, MAX_DAILY_WINDOW));
        int safeMonthlyWindow = Math.max(1, Math.min(monthlyWindow, MAX_MONTHLY_WINDOW));

        LocalDate snapshotDate = githubRepoRepository.findLatestSnapshotDateOnOrBefore(requestedDate);
        if (snapshotDate == null) {
            return GithubOverviewDto.builder()
                    .requestedDate(requestedDate)
                    .snapshotDate(null)
                    .dailyWindow(safeDailyWindow)
                    .monthlyWindow(safeMonthlyWindow)
                    .repos(List.of())
                    .build();
        }

        List<GithubRepo> trendingRepos = githubRepoRepository.findTopTrendingBySnapshotDate(snapshotDate, safeLimit);
        if (trendingRepos.isEmpty()) {
            return GithubOverviewDto.builder()
                    .requestedDate(requestedDate)
                    .snapshotDate(snapshotDate)
                    .dailyWindow(safeDailyWindow)
                    .monthlyWindow(safeMonthlyWindow)
                    .repos(List.of())
                    .build();
        }

        List<String> repoIds = trendingRepos.stream()
                .map(GithubRepo::getRepoId)
                .toList();

        LocalDate dailyFromDate = snapshotDate.minusDays(safeDailyWindow - 1L);
        LocalDate monthlyFromDate = snapshotDate.minusMonths(safeMonthlyWindow - 1L).withDayOfMonth(1);

        List<GithubRepoDaily> history = githubRepoDailyRepository.findByRepoIdInAndSnapshotDateBetweenOrderByRepoIdAscSnapshotDateAsc(
                repoIds,
                monthlyFromDate,
                snapshotDate
        );

        Map<String, List<GithubRepoDaily>> historyByRepo = history.stream()
                .collect(Collectors.groupingBy(GithubRepoDaily::getRepoId, LinkedHashMap::new, Collectors.toList()));

        List<GithubTrendingRepoDto> repoDtos = trendingRepos.stream()
                .map(repo -> toTrendingRepoDto(repo, historyByRepo.getOrDefault(repo.getRepoId(), List.of()), dailyFromDate, safeMonthlyWindow))
                .toList();

        return GithubOverviewDto.builder()
                .requestedDate(requestedDate)
                .snapshotDate(snapshotDate)
                .dailyWindow(safeDailyWindow)
                .monthlyWindow(safeMonthlyWindow)
                .repos(repoDtos)
                .build();
    }

    /**
     * 날짜 범위 내 스냅샷 날짜별 트렌딩 레포 조회.
     * startDate/endDate 중 하나라도 있으면 범위 조회, 둘 다 없으면 단일 날짜 조회로 위임.
     */
    public List<GithubTrendingDto> getTrendingReposByRange(LocalDate startDate, LocalDate endDate, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
        LocalDate from = startDate != null ? startDate : LocalDate.now().minusDays(6);
        LocalDate to = endDate != null ? endDate : LocalDate.now();

        return githubRepoDailyRepository.findTrendingByDateRange(from, to, safeLimit)
                .stream()
                .map(row -> GithubTrendingDto.builder()
                        .repoId((String) row[0])
                        .repoName((String) row[1])
                        .description((String) row[2])
                        .language((String) row[3])
                        .stars(row[4] != null ? ((Number) row[4]).longValue() : null)
                        .starDelta1d(row[5] != null ? ((Number) row[5]).intValue() : null)
                        .snapshotDate(row[6] != null ? ((java.sql.Date) row[6]).toLocalDate() : null)
                        .build())
                .toList();
    }

    /**
     * Backward-compatible endpoint response for the existing /trending route.
     */
    public List<GithubTrendingDto> getTrendingRepos(LocalDate date, int limit) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        int safeLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
        LocalDate snapshotDate = githubRepoRepository.findLatestSnapshotDateOnOrBefore(targetDate);
        if (snapshotDate == null) {
            return List.of();
        }

        return githubRepoDailyRepository.findTrendingByDate(snapshotDate, safeLimit)
                .stream()
                .map(row -> GithubTrendingDto.builder()
                        .repoId((String) row[0])
                        .repoName((String) row[1])
                        .description((String) row[2])
                        .language((String) row[3])
                        .stars(row[4] != null ? ((Number) row[4]).longValue() : null)
                        .starDelta1d(row[5] != null ? ((Number) row[5]).intValue() : null)
                        .snapshotDate(row[6] != null ? ((java.sql.Date) row[6]).toLocalDate() : null)
                        .build())
                .toList();
    }

    private GithubTrendingRepoDto toTrendingRepoDto(
            GithubRepo repo,
            List<GithubRepoDaily> history,
            LocalDate dailyFromDate,
            int monthlyWindow
    ) {
        Map<LocalDate, GithubRepoDaily> byDate = history.stream()
                .collect(Collectors.toMap(GithubRepoDaily::getSnapshotDate, Function.identity(), (left, right) -> right, LinkedHashMap::new));

        GithubRepoDaily latestDaily = byDate.get(repo.getSnapshotDate());
        List<GithubActivityPointDto> dailyPoints = buildDailyPoints(history, dailyFromDate);
        List<GithubActivityPointDto> monthlyPoints = buildMonthlyPoints(history, monthlyWindow);

        return GithubTrendingRepoDto.builder()
                .repoId(repo.getRepoId())
                .repoName(repo.getRepoName())
                .description(repo.getDescription())
                .language(repo.getLanguage())
                .stars(repo.getStars())
                .forks(repo.getForks())
                .starDelta7d(repo.getStarDelta7d())
                .daily(dailyPoints)
                .monthly(monthlyPoints)
                .build();
    }

    private List<GithubActivityPointDto> buildDailyPoints(List<GithubRepoDaily> history, LocalDate dailyFromDate) {
        List<GithubRepoDaily> dailyHistory = history.stream()
                .filter(point -> !point.getSnapshotDate().isBefore(dailyFromDate))
                .sorted(Comparator.comparing(GithubRepoDaily::getSnapshotDate))
                .toList();

        return toActivityPoints(dailyHistory, DAILY_LABEL_FORMAT);
    }

    private List<GithubActivityPointDto> buildMonthlyPoints(List<GithubRepoDaily> history, int monthlyWindow) {
        Map<YearMonth, GithubRepoDaily> monthEndPoints = new LinkedHashMap<>();
        for (GithubRepoDaily point : history) {
            monthEndPoints.put(YearMonth.from(point.getSnapshotDate()), point);
        }

        List<GithubRepoDaily> monthlyHistory = new ArrayList<>(monthEndPoints.values());
        if (monthlyHistory.size() > monthlyWindow) {
            monthlyHistory = monthlyHistory.subList(monthlyHistory.size() - monthlyWindow, monthlyHistory.size());
        }

        monthlyHistory.sort(Comparator.comparing(GithubRepoDaily::getSnapshotDate));
        return toMonthlyActivityPoints(monthlyHistory);
    }

    private List<GithubActivityPointDto> toActivityPoints(List<GithubRepoDaily> points, DateTimeFormatter labelFormatter) {
        List<GithubActivityPointDto> result = new ArrayList<>();

        for (GithubRepoDaily point : points) {
            result.add(GithubActivityPointDto.builder()
                    .label(point.getSnapshotDate().format(labelFormatter))
                    .snapshotDate(point.getSnapshotDate())
                    .stars(point.getStars())
                    .forks(point.getForks())
                    .openIssues(point.getOpenIssues())
                    .build());
        }

        return result;
    }

    private List<GithubActivityPointDto> toMonthlyActivityPoints(List<GithubRepoDaily> points) {
        List<GithubActivityPointDto> result = new ArrayList<>();

        for (GithubRepoDaily point : points) {
            result.add(GithubActivityPointDto.builder()
                    .label(point.getSnapshotDate().format(MONTHLY_LABEL_FORMAT))
                    .snapshotDate(point.getSnapshotDate())
                    .stars(point.getStars())
                    .forks(point.getForks())
                    .openIssues(point.getOpenIssues())
                    .build());
        }

        return result;
    }
}
