import groovy.json.JsonOutput

def sendDiscordNotification(scriptContext, String status, int color, String credentialId) {
  try {
    scriptContext.withCredentials([scriptContext.string(credentialsId: credentialId, variable: 'DISCORD_WEBHOOK_URL')]) {
      def fields = [
        [name: 'Job',    value: scriptContext.env.JOB_NAME ?: '-',              inline: true],
        [name: 'Build',  value: "#${scriptContext.env.BUILD_NUMBER ?: '-'}",     inline: true],
        [name: 'Branch', value: scriptContext.params.DEPLOY_BRANCH ?: '-',       inline: true],
        [name: 'Target', value: scriptContext.params.DEPLOY_TARGET ?: '-',       inline: true],
        [name: 'Result', value: status,                                           inline: true],
        [name: 'URL',    value: scriptContext.env.BUILD_URL ?: '-',              inline: false],
      ]
      def payload = JsonOutput.toJson([
        username: 'Jenkins',
        embeds: [[
          title      : "AIRadar Deploy ${status}",
          description: "Jenkins deployment pipeline ${status.toLowerCase()}.",
          color      : color,
          fields     : fields,
          timestamp  : new Date().format("yyyy-MM-dd'T'HH:mm:ssXXX", TimeZone.getTimeZone('Asia/Seoul')),
        ]]
      ])
      scriptContext.writeFile file: 'discord-webhook-payload.json', text: payload
      scriptContext.sh '''
        curl -sS -H "Content-Type: application/json" \
          -X POST \
          --data @discord-webhook-payload.json \
          "$DISCORD_WEBHOOK_URL" >/dev/null
      '''
    }
  } catch (err) {
    scriptContext.echo "Discord notification failed: ${err.getMessage()}"
  }
}

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 45, unit: 'MINUTES')
  }

  triggers {
    gitlab(
      triggerOnPush: true,
      triggerOnMergeRequest: false,
      branchFilterType: 'NameBasedFilter',
      includeBranchesSpec: 'develop'
    )
  }

  parameters {
    choice(
      name: 'DEPLOY_TARGET',
      choices: ['all', 'server1', 'server2'],
      description: '배포 대상 서버 (자동 트리거 시 all)'
    )
    string(
      name: 'DEPLOY_BRANCH',
      defaultValue: 'develop',
      trim: true,
      description: '배포할 Git 브랜치'
    )
  }

  environment {
    REPO_URL                           = 'https://lab.ssafy.com/s14-bigdata-dist-sub1/S14P21B104.git'
    GIT_CREDENTIAL                     = 'gitlab-http-token'
    REPO_DIR                           = '~/S14P21B104'
    SERVER1_HOST                       = 'ubuntu@j14b104.p.ssafy.io'
    SERVER2_HOST                       = 'ubuntu@j14b104a.p.ssafy.io'
    SERVER1_SSH_CREDENTIAL             = 'airadar-server1-ssh'
    SERVER2_SSH_CREDENTIAL             = 'airadar-server2-ssh'
    DISCORD_SUCCESS_WEBHOOK_CREDENTIAL = 'airadar-discord-webhook-success'
    DISCORD_FAILURE_WEBHOOK_CREDENTIAL = 'airadar-discord-webhook-failure'
    HEALTH_CHECK_URL                   = 'http://j14b104a.p.ssafy.io:18888/api/health'
  }

  stages {

    stage('Checkout') {
      steps {
        deleteDir()
        git branch: params.DEPLOY_BRANCH,
            credentialsId: env.GIT_CREDENTIAL,
            url: env.REPO_URL
      }
    }

    stage('Build') {
      steps {
        dir('AIRadar/backend') {
          sh '''
            chmod +x ./gradlew
            ./gradlew clean test shadowJar bootJar --no-daemon \
              -Dorg.gradle.caching=true \
              2>&1 | tee build-output.log
          '''
        }
      }
      post {
        always {
          junit allowEmptyResults: true,
                testResults: 'AIRadar/backend/build/test-results/**/*.xml'
        }
      }
    }

    stage('Validate') {
      steps {
        script {
          def files = [
            'AIRadar/infra/docker-compose.server1.yml',
            'AIRadar/infra/docker-compose.server2.yml',
            'AIRadar/infra/scripts/deploy-server1.sh',
            'AIRadar/infra/scripts/deploy-server2.sh',
            'AIRadar/backend/build/libs/airadar-spark.jar'
          ]
          for (f in files) {
            if (!fileExists(f)) {
              error("Required file missing: ${f}")
            }
          }
        }
      }
    }

    stage('Deploy') {
      steps {
        script {
          def deployStages = [:]

          if (params.DEPLOY_TARGET == 'server2' || params.DEPLOY_TARGET == 'all') {
            deployStages['Deploy Server2'] = {
              sshagent(credentials: [env.SERVER2_SSH_CREDENTIAL]) {
                sh """
                  # JAR 및 변경된 설정 파일만 전송 (전체 소스 tar 금지 — Jenkins OOM 유발)
                  ssh -o StrictHostKeyChecking=no ${SERVER2_HOST} 'mkdir -p ${REPO_DIR}/AIRadar/backend/build/libs ${REPO_DIR}/AIRadar/infra'
                  scp -o StrictHostKeyChecking=no AIRadar/backend/build/libs/airadar-spark.jar ${SERVER2_HOST}:${REPO_DIR}/AIRadar/backend/build/libs/
                  scp -o StrictHostKeyChecking=no AIRadar/infra/docker-compose.server2.yml ${SERVER2_HOST}:${REPO_DIR}/AIRadar/infra/
                  scp -o StrictHostKeyChecking=no AIRadar/infra/scripts/deploy-server2.sh ${SERVER2_HOST}:${REPO_DIR}/AIRadar/infra/scripts/
                  ssh -o StrictHostKeyChecking=no ${SERVER2_HOST} '
                    set -e
                    cd ${REPO_DIR}
                    bash AIRadar/infra/scripts/deploy-server2.sh
                  '
                """
              }
            }
          }

          if (params.DEPLOY_TARGET == 'server1' || params.DEPLOY_TARGET == 'all') {
            deployStages['Deploy Server1'] = {
              sshagent(credentials: [env.SERVER1_SSH_CREDENTIAL]) {
                sh """
                  # JAR 및 변경된 설정 파일만 전송 (전체 소스 tar 금지 — Jenkins OOM 유발)
                  ssh -o StrictHostKeyChecking=no ${SERVER1_HOST} 'mkdir -p ${REPO_DIR}/AIRadar/backend/build/libs ${REPO_DIR}/AIRadar/infra ${REPO_DIR}/AIRadar/airflow/dags'
                  scp -o StrictHostKeyChecking=no AIRadar/backend/build/libs/airadar-spark.jar ${SERVER1_HOST}:${REPO_DIR}/AIRadar/backend/build/libs/
                  scp -o StrictHostKeyChecking=no AIRadar/infra/docker-compose.server1.yml ${SERVER1_HOST}:${REPO_DIR}/AIRadar/infra/
                  scp -o StrictHostKeyChecking=no AIRadar/infra/scripts/deploy-server1.sh ${SERVER1_HOST}:${REPO_DIR}/AIRadar/infra/scripts/
                  scp -o StrictHostKeyChecking=no AIRadar/airflow/dags/*.py ${SERVER1_HOST}:${REPO_DIR}/AIRadar/airflow/dags/
                  ssh -o StrictHostKeyChecking=no ${SERVER1_HOST} '
                    set -e
                    cd ${REPO_DIR}
                    bash AIRadar/infra/scripts/deploy-server1.sh
                  '
                """
              }
            }
          }

          parallel deployStages
        }
      }
    }

    stage('Health Check') {
      when {
        anyOf {
          expression { params.DEPLOY_TARGET == 'server2' }
          expression { params.DEPLOY_TARGET == 'all' }
        }
      }
      steps {
        script {
          def maxRetries = 20
          def retryInterval = 20
          def healthy = false

          for (int i = 1; i <= maxRetries; i++) {
            echo "Health check attempt ${i}/${maxRetries}..."
            def result = sh(
              script: "curl -sf --max-time 5 ${env.HEALTH_CHECK_URL} -o /dev/null && echo OK || echo FAIL",
              returnStdout: true
            ).trim()

            if (result == 'OK') {
              echo "Health check passed on attempt ${i}"
              healthy = true
              break
            }
            if (i < maxRetries) {
              sleep(retryInterval)
            }
          }

          if (!healthy) {
            error("Health check failed after ${maxRetries} attempts. Triggering rollback.")
          }
        }
      }
    }

    stage('Rollback') {
      when {
        expression { currentBuild.result == 'FAILURE' }
      }
      steps {
        echo "Deployment failed. Rolling back to previous version..."
        script {
          if (params.DEPLOY_TARGET == 'server2' || params.DEPLOY_TARGET == 'all') {
            sshagent(credentials: [env.SERVER2_SSH_CREDENTIAL]) {
              sh """
                ssh -o StrictHostKeyChecking=no ${SERVER2_HOST} '
                  cd ${REPO_DIR}
                  bash AIRadar/infra/scripts/deploy-server2.sh --rollback
                '
              """
            }
          }
          if (params.DEPLOY_TARGET == 'server1' || params.DEPLOY_TARGET == 'all') {
            sshagent(credentials: [env.SERVER1_SSH_CREDENTIAL]) {
              sh """
                ssh -o StrictHostKeyChecking=no ${SERVER1_HOST} '
                  cd ${REPO_DIR}
                  bash AIRadar/infra/scripts/deploy-server1.sh --rollback
                '
              """
            }
          }
        }
      }
    }
  }

  post {
    success {
      echo 'Deployment completed successfully.'
      script {
        sendDiscordNotification(this, 'SUCCESS', 5763719, env.DISCORD_SUCCESS_WEBHOOK_CREDENTIAL)
      }
    }
    failure {
      echo 'Deployment failed. Check stage logs.'
      script {
        sendDiscordNotification(this, 'FAILURE', 15548997, env.DISCORD_FAILURE_WEBHOOK_CREDENTIAL)
      }
    }
  }
}
