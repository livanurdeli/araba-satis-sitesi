pipeline {
    agent any

    environment {
        APP_NAME = 'araba-satis-sitesi'
        DOCKER_IMAGE = "${APP_NAME}:${BUILD_NUMBER}"
    }

    stages {
        stage('1. Checkout') {
            steps {
                echo '📥 Proje kaynak kodları çekiliyor...'
                checkout scm
            }
        }

        stage('2. Docker ile Test & Derleme') {
            steps {
                echo '🐳 Docker üzerinde frontend ve backend test/derleme aşaması...'
                sh "docker build -t ${DOCKER_IMAGE} -t ${APP_NAME}:latest ."
            }
        }

        stage('3. Docker Compose ile Canlıya Alma') {
            steps {
                echo '🚀 Docker Compose servisleri güncelleniyor ve başlatılıyor...'
                sh """
                    docker compose -f docker-compose.prod.yml down --remove-orphans || true
                    docker compose -f docker-compose.prod.yml up -d --build
                """
            }
        }

        stage('4. Docker Health Check') {
            steps {
                echo '🩺 Servislerin sağlık durumu doğrulanıyor...'
                sh """
                    sleep 5
                    docker compose -f docker-compose.prod.yml ps
                """
            }
        }
    }

    post {
        success {
            echo '🎉 Tebrikler! Docker tabanlı CI/CD süreci başarıyla tamamlandı. Uygulama http://3.123.160.13 adresinde (Port: 80) aktif.'
        }
        failure {
            echo '❌ Hata oluştu! Lütfen derleme loglarını kontrol edin.'
        }
    }
}
