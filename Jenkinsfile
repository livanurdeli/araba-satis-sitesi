pipeline {
    agent any

    environment {
        APP_NAME = 'araba-satis-sitesi'
        DOCKER_IMAGE = "${APP_NAME}:${BUILD_NUMBER}"
        DOCKER_BUILDKIT = '0'
    }

    stages {
        stage('Docker ile Derleme & İmaj Oluşturma') {
            steps {
                echo '🐳 Docker üzerinde React Frontend ve Go Backend derleniyor...'
                sh "docker build -t ${DOCKER_IMAGE} -t ${APP_NAME}:latest ."
            }
        }

        stage('Docker Compose ile Canlıya Alma') {
            steps {
                echo '🚀 Docker Compose servisleri başlatılıyor...'
                sh """
                    docker compose -f docker-compose.prod.yml down --remove-orphans || true
                    docker compose -f docker-compose.prod.yml up -d
                """
            }
        }

        stage('Canlılık Doğrulaması (Health Check)') {
            steps {
                echo '🩺 Servislerin durumu kontrol ediliyor...'
                sh """
                    sleep 5
                    docker compose -f docker-compose.prod.yml ps
                """
            }
        }
    }

    post {
        success {
            echo '🎉 Tebrikler! Dağıtım tamamlandı. Uygulama http://3.123.160.13 adresinde yayında.'
        }
        failure {
            echo '❌ Hata oluştu! Lütfen logları kontrol edin.'
        }
    }
}
