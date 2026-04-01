FROM apache/spark:3.5.1

USER root

# 기본 패키지
RUN apt-get update && apt-get install -y \
    curl \
    vim \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/spark

# 참고: SparkSubmitOperator는 shadow JAR(shadowJar task)에 의존성이 포함되어 있어 --packages 불필요
# 이 변수는 standalone spark-submit 참고용이며 런타임에 자동 적용되지 않음
ENV SPARK_PACKAGES="org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0,\
io.delta:delta-spark_2.12:3.1.0,\
org.apache.hadoop:hadoop-aws:3.3.4,\
com.amazonaws:aws-java-sdk-bundle:1.12.262,\
org.postgresql:postgresql:42.7.3,\
com.redislabs:spark-redis_2.12:3.1.0"