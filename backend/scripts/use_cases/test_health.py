import pytest


@pytest.mark.asyncio
class TestHealthEndpoint:
    async def test_ping(self, client):
        response = await client.get("/ping")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    async def test_health(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["db"] == "ok"
