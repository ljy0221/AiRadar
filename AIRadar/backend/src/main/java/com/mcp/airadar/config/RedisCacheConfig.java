package com.mcp.airadar.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;
import java.util.Map;

@Configuration
public class RedisCacheConfig {

    public static final String JOB_FORECAST_CURRENT_CACHE = "jobForecastCurrent";

    @Bean
    public CacheManager cacheManager(
            RedisConnectionFactory connectionFactory,
            ObjectMapper objectMapper,
            @Value("${job-forecast.cache.ttl:PT24H}") Duration jobForecastCacheTtl
    ) {
        RedisCacheConfiguration baseConfig = RedisCacheConfiguration.defaultCacheConfig()
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(
                        new GenericJackson2JsonRedisSerializer(objectMapper)
                ))
                .disableCachingNullValues();

        Map<String, RedisCacheConfiguration> cacheConfigs = Map.of(
                JOB_FORECAST_CURRENT_CACHE, baseConfig.entryTtl(jobForecastCacheTtl)
        );

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(baseConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }
}
