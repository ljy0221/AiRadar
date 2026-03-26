package com.mcp.airadar.news.service;

import com.mcp.airadar.news.dto.NewsDto;
import com.mcp.airadar.news.entity.NewsItem;
import com.mcp.airadar.news.repository.NewsRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class NewsService {

    private static final List<String> SUPPORTED_COMPANIES = List.of("openai", "microsoft", "google", "naver", "kakao");
    private static final int MAX_COMPANY_NEWS_LIMIT = 10;

    private final NewsRepository newsRepository;

    public NewsService(NewsRepository newsRepository) {
        this.newsRepository = newsRepository;
    }

    public List<NewsDto.DailyGroup> getNewsList(String region, String category, LocalDate date, LocalDate startDate, LocalDate endDate) {
        LocalDateTime startInclusive;
        LocalDateTime endExclusive;

        if (date != null) {
            // 단일 날짜 우선
            startInclusive = date.atStartOfDay();
            endExclusive = date.plusDays(1).atStartOfDay();
        } else if (startDate != null || endDate != null) {
            // 범위 조회
            LocalDate from = startDate != null ? startDate : LocalDate.now().minusDays(3);
            LocalDate to = endDate != null ? endDate : LocalDate.now();
            startInclusive = from.atStartOfDay();
            endExclusive = to.plusDays(1).atStartOfDay();
        } else {
            // 기본: 최근 3일
            LocalDate baseDate = LocalDate.now();
            startInclusive = baseDate.minusDays(3).atStartOfDay();
            endExclusive = baseDate.plusDays(1).atStartOfDay();
        }

        Comparator<NewsDto.ListItem> itemComparator = (a, b) -> {
            BigDecimal leftScore = a.score();
            BigDecimal rightScore = b.score();

            if (leftScore == null && rightScore != null) return 1;
            if (leftScore != null && rightScore == null) return -1;
            if (leftScore != null) {
                int scoreCompare = rightScore.compareTo(leftScore);
                if (scoreCompare != 0) return scoreCompare;
            }

            LocalDateTime leftPublishedAt = a.publishedAt();
            LocalDateTime rightPublishedAt = b.publishedAt();
            if (leftPublishedAt == null && rightPublishedAt != null) return 1;
            if (leftPublishedAt != null && rightPublishedAt == null) return -1;
            if (leftPublishedAt == null) return 0;
            return rightPublishedAt.compareTo(leftPublishedAt);
        };

        Map<LocalDate, List<NewsDto.ListItem>> grouped = newsRepository
                .findRecentNewsFeed(region, category, startInclusive, endExclusive).stream()
                .map(NewsDto.ListItem::from)
                .filter(item -> item.publishedAt() != null)
                .collect(java.util.stream.Collectors.groupingBy(item -> item.publishedAt().toLocalDate()));

        return grouped.entrySet().stream()
                .sorted(Map.Entry.<LocalDate, List<NewsDto.ListItem>>comparingByKey().reversed())
                .map(entry -> NewsDto.DailyGroup.builder()
                        .date(entry.getKey())
                        .items(entry.getValue().stream()
                                .sorted(itemComparator)
                                .toList())
                        .build())
                .toList();
    }

    public NewsDto.AvailableDates getAvailableDates(String region, String category) {
        List<LocalDate> dates = newsRepository.findAvailableDateStrings(region, category).stream()
                .map(LocalDate::parse)
                .toList();

        return NewsDto.AvailableDates.builder()
                .dates(dates)
                .count(dates.size())
                .startDate(dates.isEmpty() ? null : dates.get(dates.size() - 1))
                .endDate(dates.isEmpty() ? null : dates.get(0))
                .build();
    }

    public List<NewsDto.CompanyNewsGroup> getCompanyNews(String company, Integer limit) {
        int normalizedLimit = normalizeLimit(limit);

        if (company != null && !company.isBlank()) {
            String normalizedCompany = normalizeCompany(company);
            return List.of(toCompanyNewsGroup(normalizedCompany, normalizedLimit));
        }

        return SUPPORTED_COMPANIES.stream()
                .map(companyName -> toCompanyNewsGroup(companyName, normalizedLimit))
                .toList();
    }

    public NewsDto.Detail getNewsDetail(String articleId) {
        NewsItem item = newsRepository.findByArticleIdAndIsActiveTrue(articleId)
                .orElseThrow(() -> new EntityNotFoundException("뉴스를 찾을 수 없습니다: " + articleId));
        return NewsDto.Detail.from(item);
    }

    private NewsDto.CompanyNewsGroup toCompanyNewsGroup(String companyName, int limit) {
        List<NewsDto.ListItem> items = newsRepository.findCompanyNews(companyName, limit).stream()
                .map(NewsDto.ListItem::from)
                .toList();

        return NewsDto.CompanyNewsGroup.builder()
                .company(NewsDto.COMPANY_DISPLAY_NAMES.getOrDefault(companyName, companyName))
                .items(items)
                .build();
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null || limit < 1) {
            return MAX_COMPANY_NEWS_LIMIT;
        }
        return Math.min(limit, MAX_COMPANY_NEWS_LIMIT);
    }

    private String normalizeCompany(String company) {
        String normalized = company.trim().toLowerCase(Locale.ROOT);
        if (!SUPPORTED_COMPANIES.contains(normalized)) {
            throw new EntityNotFoundException("Unsupported company: " + company);
        }
        return normalized;
    }
}
