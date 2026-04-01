FROM eclipse-temurin:17-jre

WORKDIR /app

COPY build/libs/Airadar.jar /app/app.jar

EXPOSE 8888

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
