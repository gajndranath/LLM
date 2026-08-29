from locust import HttpUser, task, between

class EnterpriseLoadTestUser(HttpUser):
    wait_time = between(0.1, 0.5)

    @task(3)
    def test_backend_health(self):
        self.client.get("http://127.0.0.1:3001/api/health")

    @task(1)
    def test_ai_service_health(self):
        self.client.get("http://127.0.0.1:8000/health")
