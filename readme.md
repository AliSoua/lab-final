docker run -d --name dev-keycloak -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin keycloak/keycloak:24.0.3 start-dev

docker stop dev-keycloak
docker rm dev-keycloak



pip install -r .\requirements.txt

uvicorn app.main:app --reload



docker run -d --name db-lab-platform -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=lab_platform -p 5432:5432 -v pgdata_lab_platform:/var/lib/postgresql/data postgres:15-alpine