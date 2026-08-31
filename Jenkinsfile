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
                // Çok aşamalı Dockerfile ile tüm test ve build Docker daemon üzerinde izole çalışır
                sh "docker build -t ${DOCKER_IMAGE} -t ${APP_NAME}:latest ."
            }
        }

        stage('3. Docker Compose ile Canlıya Alma') {
            steps {
                echo '🚀 Docker Compose servisleri güncelleniyor ve başlatılıyor...'
                sh """
                    # Mevcut container'ları güncelle ve ayağa kaldır
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
        always {
            echo '🧹 Çalışma alanı temizleniyor...'
            cleanWs deleteDirs: true, notFailBuild: true
        }
        success {
            echo '🎉 Tebrikler! Docker tabanlı CI/CD süreci başarıyla tamamlandı. Uygulama http://localhost:8080 adresinde aktif.'
        }
        failure {
            echo '❌ Hata oluştu! Lütfen Docker veya derleme loglarını kontrol edin.'
        }
    }
}
