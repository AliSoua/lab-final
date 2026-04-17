docker run -d --name dev-keycloak -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:24.0.3 start-dev

docker stop dev-keycloak
docker rm dev-keycloak



pip install -r .\requirements.txt

uvicorn app.main:app --reload



docker run -d --name db-lab-platform -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=lab_platform -p 5432:5432 -v pgdata_lab_platform:/var/lib/postgresql/data postgres:15-alpine

docker run -d --name redis -p 6379:6379 --restart unless-stopped redis:7-alpine

celery -A app.core.celery worker --loglevel=info --queues=lab.provisioning,lab.cleanup,lab.monitoring,default --concurrency=4

celery -A app.core.celery beat --loglevel=info

celery -A app.core.celery flower --port=5555

celery -A app.core.celery worker --loglevel=info -P threads -c 4


docker exec -it fastapi-backend python /app/app/scripts/setup_keycloak.py

docker exec -it fastapi-backend python /app/app/scripts/secret_keycloak.py




docker stop dev-keycloak
docker rm dev-keycloak

docker run -d --name dev-keycloak -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin -e KC_HOSTNAME=localhost -e KC_HOSTNAME_STRICT=false -e KC_HOSTNAME_STRICT_HTTPS=false -e KC_HTTP_ENABLED=true keycloak/keycloak:24.0.3 start-dev


docker run -d --name dev-keycloak -p 127.0.0.1:8080:8080 -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin keycloak/keycloak:26.6.1 start-dev


docker run -d --name dev-keycloak -p 8080:8080 -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin -e KC_HOSTNAME=localhost:8080 -e KC_HOSTNAME_DEBUG=true keycloak/keycloak:26.6.1 start-dev 