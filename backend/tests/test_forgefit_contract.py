import os

import pytest
import requests


BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL")


@pytest.fixture
def client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.mark.skipif(not BASE_URL, reason="EXPO_PUBLIC_BACKEND_URL is not configured")
def test_root_contract(client):
    response = client.get(f"{BASE_URL.rstrip('/')}/api/")
    assert response.status_code == 200
    assert response.json() == {"message": "ForgeFit API online"}


@pytest.mark.skipif(not BASE_URL, reason="EXPO_PUBLIC_BACKEND_URL is not configured")
@pytest.mark.parametrize("path", ["/api/auth/me", "/api/state", "/api/exercises"])
def test_protected_routes_require_bearer(client, path):
    response = client.get(f"{BASE_URL.rstrip('/')}{path}")
    assert response.status_code == 401
    assert "detail" in response.json()