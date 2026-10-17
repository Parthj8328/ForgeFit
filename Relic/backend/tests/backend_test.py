"""Backend tests for Relic vault app."""
import os
import io
import uuid
import time
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE:
    # Fallback to reading from frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE}/api"

UNIQ = uuid.uuid4().hex[:8]
VAULT_A = f"TEST_Vault_A_{UNIQ}"
VAULT_B = f"TEST_Vault_B_{UNIQ}"
PASS = "starlight-test"


@pytest.fixture(scope="module")
def tokens():
    # Create vault A
    r = requests.post(f"{API}/vaults", json={"name": VAULT_A, "passcode": PASS})
    assert r.status_code == 200, r.text
    j = r.json()
    assert "token" in j and "vault" in j
    tok_a = j["token"]

    # Duplicate returns 409
    r2 = requests.post(f"{API}/vaults", json={"name": VAULT_A, "passcode": PASS})
    assert r2.status_code == 409

    # Vault B
    r = requests.post(f"{API}/vaults", json={"name": VAULT_B, "passcode": PASS})
    assert r.status_code == 200
    tok_b = r.json()["token"]

    return {"a": tok_a, "b": tok_b}


def auth(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------------- Vault auth ----------------
def test_enter_vault_correct(tokens):
    r = requests.post(f"{API}/vaults/enter", json={"name": VAULT_A, "passcode": PASS})
    assert r.status_code == 200
    assert "token" in r.json()


def test_enter_vault_wrong_passcode(tokens):
    r = requests.post(f"{API}/vaults/enter", json={"name": VAULT_A, "passcode": "wrong"})
    assert r.status_code == 401


def test_enter_unknown_vault():
    r = requests.post(f"{API}/vaults/enter", json={"name": f"nope_{UNIQ}", "passcode": "x"})
    assert r.status_code == 401


def test_vault_me(tokens):
    r = requests.get(f"{API}/vault/me", headers=auth(tokens["a"]))
    assert r.status_code == 200
    assert r.json()["name"] == VAULT_A


def test_vault_me_no_auth():
    r = requests.get(f"{API}/vault/me")
    assert r.status_code == 401


def test_vault_me_invalid_token():
    r = requests.get(f"{API}/vault/me", headers={"Authorization": "Bearer bogus"})
    assert r.status_code == 401


# ---------------- Memory CRUD ----------------
@pytest.mark.parametrize("mtype", ["letter", "polaroid", "milestone", "capsule"])
def test_create_memory_types(tokens, mtype):
    payload = {"title": f"TEST_{mtype}", "memory_type": mtype, "content": "hello", "author_name": "A"}
    if mtype == "capsule":
        payload["unlock_at"] = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    r = requests.post(f"{API}/memories", json=payload, headers=auth(tokens["a"]))
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["memory_type"] == mtype
    # non-zero 3D coords
    assert j["coord_x"] != 0 or j["coord_y"] != 0 or j["coord_z"] != 0
    assert "id" in j


def test_create_memory_invalid_type(tokens):
    r = requests.post(f"{API}/memories", json={"title": "x", "memory_type": "bogus"}, headers=auth(tokens["a"]))
    assert r.status_code == 400


def test_capsule_future_masked(tokens):
    unlock = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    r = requests.post(f"{API}/memories", json={
        "title": "TEST_future_capsule", "memory_type": "capsule",
        "content": "SECRET", "caption": "SECRETCAP", "media_url": "x", "audio_url": "y",
        "unlock_at": unlock,
    }, headers=auth(tokens["a"]))
    assert r.status_code == 200
    mid = r.json()["id"]
    # Response of create is also masked
    assert r.json()["is_locked"] is True
    assert r.json()["content"] is None
    assert r.json()["caption"] is None
    assert r.json()["media_url"] is None
    assert r.json()["audio_url"] is None

    # GET single
    r2 = requests.get(f"{API}/memories/{mid}", headers=auth(tokens["a"]))
    assert r2.status_code == 200
    j = r2.json()
    assert j["is_locked"] is True
    assert j["content"] is None and j["caption"] is None and j["media_url"] is None and j["audio_url"] is None

    # List
    r3 = requests.get(f"{API}/memories", headers=auth(tokens["a"]))
    assert r3.status_code == 200
    found = [m for m in r3.json() if m["id"] == mid]
    assert found and found[0]["is_locked"] is True and found[0]["content"] is None


def test_capsule_past_unmasked(tokens):
    unlock = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    r = requests.post(f"{API}/memories", json={
        "title": "TEST_past_capsule", "memory_type": "capsule",
        "content": "REVEALED", "caption": "cap", "unlock_at": unlock,
    }, headers=auth(tokens["a"]))
    assert r.status_code == 200
    j = r.json()
    assert j["is_locked"] is False
    assert j["content"] == "REVEALED"


def test_patch_memory_scratched(tokens):
    r = requests.post(f"{API}/memories", json={"title": "TEST_letter", "memory_type": "letter", "content": "hi"}, headers=auth(tokens["a"]))
    mid = r.json()["id"]
    r2 = requests.patch(f"{API}/memories/{mid}", json={"is_scratched": True}, headers=auth(tokens["a"]))
    assert r2.status_code == 200
    assert r2.json()["is_scratched"] is True
    # persistence
    r3 = requests.get(f"{API}/memories/{mid}", headers=auth(tokens["a"]))
    assert r3.json()["is_scratched"] is True


def test_delete_memory(tokens):
    r = requests.post(f"{API}/memories", json={"title": "TEST_del", "memory_type": "letter"}, headers=auth(tokens["a"]))
    mid = r.json()["id"]
    r2 = requests.delete(f"{API}/memories/{mid}", headers=auth(tokens["a"]))
    assert r2.status_code == 200
    r3 = requests.get(f"{API}/memories/{mid}", headers=auth(tokens["a"]))
    assert r3.status_code == 404
    lst = requests.get(f"{API}/memories", headers=auth(tokens["a"])).json()
    assert not any(m["id"] == mid for m in lst)


def test_vault_isolation(tokens):
    r = requests.post(f"{API}/memories", json={"title": "TEST_iso", "memory_type": "letter"}, headers=auth(tokens["a"]))
    mid = r.json()["id"]
    # B cannot see A's memory
    r2 = requests.get(f"{API}/memories/{mid}", headers=auth(tokens["b"]))
    assert r2.status_code == 404
    lst_b = requests.get(f"{API}/memories", headers=auth(tokens["b"])).json()
    assert not any(m["id"] == mid for m in lst_b)


# ---------------- File upload ----------------
def test_file_upload_and_download(tokens):
    # tiny PNG
    png = (b"\x89PNG\r\n\x1a\n" + b"\x00" * 20)
    files = {"file": ("t.png", io.BytesIO(png), "image/png")}
    r = requests.post(f"{API}/upload", files=files, headers=auth(tokens["a"]))
    if r.status_code != 200:
        pytest.skip(f"Object storage unavailable: {r.status_code} {r.text[:200]}")
    path = r.json()["path"]
    # Download without auth
    r2 = requests.get(f"{API}/files/{path}")
    assert r2.status_code == 401
    # With auth query
    r3 = requests.get(f"{API}/files/{path}", params={"auth": tokens["a"]})
    assert r3.status_code == 200
    assert r3.headers.get("content-type", "").startswith("image/")
