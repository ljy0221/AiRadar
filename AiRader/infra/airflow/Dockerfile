FROM apache/airflow:2.8.3

USER root

# Spark 실행을 위한 Java 설치
RUN apt-get update && \
    apt-get install -y --no-install-recommends openjdk-17-jre-headless && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

USER airflow

# Airflow Spark Provider
RUN pip install apache-airflow-providers-apache-spark

# 추가 python 라이브러리
COPY requirements.txt /requirements.txt
RUN pip install --no-cache-dir -r /requirements.txt