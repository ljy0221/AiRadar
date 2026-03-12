FROM jenkins/jenkins:lts-jdk17

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends git openssh-client curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

USER jenkins
