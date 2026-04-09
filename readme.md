docker run -d --name dev-keycloak -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin keycloak/keycloak:24.0.3 start-dev

docker stop dev-keycloak
docker rm dev-keycloak


pip install -r .\requirements.txt

uvicorn app.main:app --reload