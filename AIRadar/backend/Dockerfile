FROM gradle:8.10.2-jdk17 AS builder

WORKDIR /workspace

COPY build.gradle settings.gradle gradlew ./
COPY gradle ./gradle

ARG CACHEBUST=1
COPY src ./src

RUN chmod +x gradlew && ./gradlew bootJar --no-daemon

FROM eclipse-temurin:17-jre

WORKDIR /app

COPY --from=builder /workspace/build/libs/*.jar /app/app.jar

EXPOSE 8888

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
