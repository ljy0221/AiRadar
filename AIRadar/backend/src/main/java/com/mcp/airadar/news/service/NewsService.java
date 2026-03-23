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

    public List<NewsDto.DailyGroup> getNewsList(String region, String category, LocalDate date) {
        LocalDate baseDate = date != null ? date : LocalDate.now();
        LocalDateTime startInclusive = date != null
                ? baseDate.atStartOfDay()
                : baseDate.minusDays(3).atStartOfDay();
        LocalDateTime endExclusive = baseDate.plusDays(1).atStartOfDay();

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
        List<NewsDto.ListItem> items = newsRepository.findCompanyNews(toPostgresTextArray(companyAliases(companyName)), limit).stream()
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

    private List<String> companyAliases(String companyName) {
        return switch (companyName) {
            case "openai" -> List.of("openai", "OpenAI");
            case "microsoft" -> List.of("microsoft", "Microsoft");
            case "google" -> List.of("google", "Google", "deepmind", "DeepMind");
            case "naver" -> List.of("naver", "Naver", "NAVER");
            case "kakao" -> List.of("kakao", "Kakao", "KAKAO");
            default -> List.of(companyName);
        };
    }

    private String toPostgresTextArray(List<String> values) {
        return "{" + values.stream()
                .map(value -> "\"" + value.replace("\"", "\\\"") + "\"")
                .collect(java.util.stream.Collectors.joining(",")) + "}";
    }
}
