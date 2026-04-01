package com.mcp.airadar;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class AiRadarApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiRadarApplication.class, args);
    }

}
