FROM apache/airflow:2.8.3

USER root

# Spark 실행을 위한 Java 설치
RUN apt-get update && \
    apt-get install -y --no-install-recommends openjdk-17-jre-headless curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Spark 3.5.1 명시 설치 (Worker와 버전 통일)
ENV SPARK_VERSION=3.5.1
ENV SPARK_HOME=/opt/spark
RUN curl -sL https://archive.apache.org/dist/spark/spark-${SPARK_VERSION}/spark-${SPARK_VERSION}-bin-hadoop3.tgz \
    | tar -xz -C /opt && \
    mv /opt/spark-${SPARK_VERSION}-bin-hadoop3 /opt/spark
ENV PATH="$SPARK_HOME/bin:$PATH"

USER airflow

# Airflow Spark Provider
RUN pip install apache-airflow-providers-apache-spark

# 추가 python 라이브러리
COPY requirements.txt /requirements.txt
RUN pip install --no-cache-dir -r /requirements.txt