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
                echo '🐳 Docker üzerinde React Frontend, Go Backend ve Caddy Reverse Proxy derleniyor...'
                sh "docker build -t ${DOCKER_IMAGE} -t ${APP_NAME}:latest ."
                sh "docker build -f Dockerfile.caddy -t araba-satis-sitesi-caddy:${BUILD_NUMBER} -t araba-satis-sitesi-caddy:latest ."
            }
        }

        stage('Konteynerleri Canlıya Alma') {
            steps {
                echo '🚀 Uygulama, PostgreSQL ve Caddy Reverse Proxy yayına alınıyor...'
                sh '''
                    # Docker ağı oluştur
                    docker network create araba_app_network || true

                    # Eski çalışan konteynerleri temizle
                    docker stop araba-sitesi-caddy araba-sitesi-app araba-sitesi-postgres || true
                    docker rm araba-sitesi-caddy araba-sitesi-app araba-sitesi-postgres || true

                    # 1. PostgreSQL Veritabanını Başlat (İç Ağ)
                    docker run -d \
                      --name araba-sitesi-postgres \
                      --restart always \
                      --network araba_app_network \
                      -e POSTGRES_USER=postgres \
                      -e POSTGRES_PASSWORD=sifre123 \
                      -e POSTGRES_DB=araba_sitesi \
                      -v postgres_prod_data:/var/lib/postgresql/data \
                      -v $(pwd)/backend/db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro \
                      postgres:16-alpine

                    # Veritabanının hazır olması için 4 saniye bekle
                    sleep 4

                    # 2. Go + React Uygulamasını Başlat (Sadece İç Docker Ağında, Port 8080)
                    docker run -d \
                      --name araba-sitesi-app \
                      --restart always \
                      --network araba_app_network \
                      -e PORT=8080 \
                      -e DB_DSN="postgres://postgres:sifre123@araba-sitesi-postgres:5432/araba_sitesi?sslmode=disable" \
                      -e JWT_SECRET=super_gizli_anahtar_123 \
                      -v uploads_prod_data:/app/uploads \
                      ${APP_NAME}:latest

                    # 3. Caddy Reverse Proxy Başlat (Caddyfile imajın içine gömülüdür, host mount gerekmez)
                    docker run -d \
                      --name araba-sitesi-caddy \
                      --restart always \
                      --network araba_app_network \
                      -p 80:80 \
                      -p 443:443 \
                      -v caddy_prod_data:/data \
                      -v caddy_prod_config:/config \
                      araba-satis-sitesi-caddy:latest
                '''
            }
        }

        stage('Canlılık Doğrulaması (Health Check)') {
            steps {
                echo '🩺 Servislerin durumu kontrol ediliyor...'
                sh 'docker ps --filter "name=araba-sitesi"'
            }
        }
    }

    post {
        success {
            echo '🎉 Tebrikler! Dağıtım %100 başarıyla tamamlandı. Uygulama http://3.123.160.13 adresinde yayında.'
        }
        failure {
            echo '❌ Hata oluştu! Lütfen logları kontrol edin.'
        }
    }
}
