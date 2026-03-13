import groovy.json.JsonOutput

def sendDiscordNotification(scriptContext, String status, int color, String credentialId) {
  try {
    scriptContext.withCredentials([scriptContext.string(credentialsId: credentialId, variable: 'DISCORD_WEBHOOK_URL')]) {
      def fields = [
        [name: 'Job', value: scriptContext.env.JOB_NAME ?: '-', inline: true],
        [name: 'Build', value: "#${scriptContext.env.BUILD_NUMBER ?: '-'}", inline: true],
        [name: 'Branch', value: scriptContext.params.DEPLOY_BRANCH ?: '-', inline: true],
        [name: 'Target', value: scriptContext.params.DEPLOY_TARGET ?: '-', inline: true],
        [name: 'Result', value: status, inline: true],
        [name: 'URL', value: scriptContext.env.BUILD_URL ?: '-', inline: false],
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
  }

  parameters {
    choice(
      name: 'DEPLOY_TARGET',
      choices: ['server2', 'server1', 'all'],
      description: '배포 대상 서버'
    )
    string(
      name: 'DEPLOY_BRANCH',
      defaultValue: 'develop',
      trim: true,
      description: '배포할 Git 브랜치'
    )
  }

  environment {
    REPO_URL = 'https://lab.ssafy.com/s14-bigdata-dist-sub1/S14P21B104.git'
    GIT_CREDENTIAL = 'gitlab-http-token'
    REPO_DIR = '~/S14P21B104'
    SERVER1_HOST = 'ubuntu@j14b104.p.ssafy.io'
    SERVER2_HOST = 'ubuntu@j14b104a.p.ssafy.io'
    SERVER1_SSH_CREDENTIAL = 'airadar-server1-ssh'
    SERVER2_SSH_CREDENTIAL = 'airadar-server2-ssh'
    DISCORD_SUCCESS_WEBHOOK_CREDENTIAL = 'airadar-discord-webhook-success'
    DISCORD_FAILURE_WEBHOOK_CREDENTIAL = 'airadar-discord-webhook-failure'
  }

  stages {
    stage('Checkout') {
      steps {
        deleteDir()
        git branch: params.DEPLOY_BRANCH, credentialsId: env.GIT_CREDENTIAL, url: env.REPO_URL
      }
    }

    stage('Build Backend') {
      steps {
        dir('AIRadar/backend') {
          sh '''
            chmod +x ./gradlew
            ./gradlew shadowJar --no-daemon
          '''
        }
      }
    }

    stage('Validate Files') {
      steps {
        script {
          def files = [
            'AIRadar/infra/docker-compose.server1.yml',
            'AIRadar/infra/docker-compose.server2.yml',
            'AIRadar/infra/scripts/deploy-server1.sh',
            'AIRadar/infra/scripts/deploy-server2.sh',
            'AIRadar/backend/build/libs'
          ]
          for (file in files) {
            if (!fileExists(file)) {
              error("Required file missing: ${file}")
            }
          }
        }
      }
    }

    stage('Deploy Server2') {
      when {
        anyOf {
          expression { params.DEPLOY_TARGET == 'server2' }
          expression { params.DEPLOY_TARGET == 'all' }
        }
      }
      steps {
        sshagent(credentials: [env.SERVER2_SSH_CREDENTIAL]) {
          sh """
            tar --exclude=.git -czf - . | ssh -o StrictHostKeyChecking=no ${SERVER2_HOST} '
              set -e
              mkdir -p ${REPO_DIR}
              sudo rm -rf ${REPO_DIR}/AIRadar/backend/build
              tar -xzf - -C ${REPO_DIR}
              cd ${REPO_DIR}
              bash AIRadar/infra/scripts/deploy-server2.sh
            '
          """
        }
      }
    }

    stage('Deploy Server1') {
      when {
        anyOf {
          expression { params.DEPLOY_TARGET == 'server1' }
          expression { params.DEPLOY_TARGET == 'all' }
        }
      }
      steps {
        sshagent(credentials: [env.SERVER1_SSH_CREDENTIAL]) {
          sh """
            tar --exclude=.git -czf - . | ssh -o StrictHostKeyChecking=no ${SERVER1_HOST} '
              set -e
              mkdir -p ${REPO_DIR}
              sudo rm -rf ${REPO_DIR}/AIRadar/backend/build
              tar -xzf - -C ${REPO_DIR}
              cd ${REPO_DIR}
              bash AIRadar/infra/scripts/deploy-server1.sh
            '
          """
        }
      }
    }
  }

  post {
    success {
      echo 'Jenkins deployment pipeline completed successfully.'
      script {
        sendDiscordNotification(this, 'SUCCESS', 5763719, env.DISCORD_SUCCESS_WEBHOOK_CREDENTIAL)
      }
    }
    failure {
      echo 'Jenkins deployment pipeline failed. Check the stage logs.'
      script {
        sendDiscordNotification(this, 'FAILURE', 15548997, env.DISCORD_FAILURE_WEBHOOK_CREDENTIAL)
      }
    }
  }
}
