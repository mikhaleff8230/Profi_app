"""End-to-end backend tests for Profi-like marketplace MVP."""
import os
import time
import uuid
import requests
import pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE}/api"


def _phone():
    return "+373" + str(int(time.time() * 1000))[-9:] + str(uuid.uuid4().int)[:2]


@pytest.fixture(scope="module")
def ctx():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    cust_phone = _phone()
    spec_phone = _phone() + "9"
    spec2_phone = _phone() + "8"
    return {"s": s, "cust_phone": cust_phone, "spec_phone": spec_phone, "spec2_phone": spec2_phone}


# ---------- Health & Categories ----------
def test_health(ctx):
    r = ctx["s"].get(f"{API}/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_categories(ctx):
    r = ctx["s"].get(f"{API}/categories")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 12
    for c in data:
        assert "name_ru" in c and "name_ro" in c and "id" in c


# ---------- Auth ----------
def test_register_customer(ctx):
    r = ctx["s"].post(f"{API}/auth/register", json={
        "phone": ctx["cust_phone"], "password": "pass1234",
        "name": "Customer One", "role": "customer", "city": "Chisinau"
    })
    assert r.status_code == 200, r.text
    d = r.json()
    assert "token" in d and d["user"]["role"] == "customer"
    assert d["user"]["name"] == "Customer One"
    ctx["cust_token"] = d["token"]
    ctx["cust_id"] = d["user"]["id"]


def test_register_specialist(ctx):
    r = ctx["s"].post(f"{API}/auth/register", json={
        "phone": ctx["spec_phone"], "password": "pass1234",
        "name": "Spec One", "role": "specialist", "city": "Chisinau"
    })
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["user"]["role"] == "specialist"
    ctx["spec_token"] = d["token"]
    ctx["spec_id"] = d["user"]["id"]

    r2 = ctx["s"].post(f"{API}/auth/register", json={
        "phone": ctx["spec2_phone"], "password": "pass1234",
        "name": "Spec Two", "role": "specialist"
    })
    assert r2.status_code == 200
    ctx["spec2_token"] = r2.json()["token"]
    ctx["spec2_id"] = r2.json()["user"]["id"]


def test_register_duplicate_phone(ctx):
    r = ctx["s"].post(f"{API}/auth/register", json={
        "phone": ctx["cust_phone"], "password": "pass1234",
        "name": "Dup", "role": "customer"
    })
    assert r.status_code == 400


def test_login_success(ctx):
    r = ctx["s"].post(f"{API}/auth/login", json={
        "phone": ctx["cust_phone"], "password": "pass1234"
    })
    assert r.status_code == 200
    assert "token" in r.json()


def test_login_wrong_password(ctx):
    r = ctx["s"].post(f"{API}/auth/login", json={
        "phone": ctx["cust_phone"], "password": "wrong"
    })
    assert r.status_code == 401


def test_me(ctx):
    r = ctx["s"].get(f"{API}/auth/me", headers={"Authorization": f"Bearer {ctx['cust_token']}"})
    assert r.status_code == 200
    assert r.json()["id"] == ctx["cust_id"]


def test_me_unauth(ctx):
    r = ctx["s"].get(f"{API}/auth/me")
    assert r.status_code == 401


# ---------- Tasks ----------
def test_create_task_as_customer(ctx):
    r = ctx["s"].post(f"{API}/tasks",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"},
        json={"title": "Fix kitchen sink", "description": "Leaking pipe under sink",
              "category": "repair", "city": "Chisinau", "budget": 500})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["customer_name"] == "Customer One"
    assert d["applications_count"] == 0
    assert d["status"] == "open"
    ctx["task_id"] = d["id"]


def test_create_task_specialist_forbidden(ctx):
    r = ctx["s"].post(f"{API}/tasks",
        headers={"Authorization": f"Bearer {ctx['spec_token']}"},
        json={"title": "x", "description": "y", "category": "repair", "city": "C"})
    assert r.status_code == 403


def test_list_tasks_public_and_filters(ctx):
    r = ctx["s"].get(f"{API}/tasks")
    assert r.status_code == 200
    assert any(t["id"] == ctx["task_id"] for t in r.json())

    r2 = ctx["s"].get(f"{API}/tasks", params={"category": "repair"})
    assert r2.status_code == 200
    assert all(t["category"] == "repair" for t in r2.json())

    r3 = ctx["s"].get(f"{API}/tasks", params={"q": "kitchen"})
    assert r3.status_code == 200
    assert any(t["id"] == ctx["task_id"] for t in r3.json())


def test_get_task_by_id(ctx):
    r = ctx["s"].get(f"{API}/tasks/{ctx['task_id']}")
    assert r.status_code == 200
    assert r.json()["id"] == ctx["task_id"]


def test_get_my_tasks(ctx):
    r = ctx["s"].get(f"{API}/tasks/mine",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"})
    assert r.status_code == 200
    ids = [t["id"] for t in r.json()]
    assert ctx["task_id"] in ids


# ---------- Applications ----------
def test_apply_as_specialist(ctx):
    r = ctx["s"].post(f"{API}/tasks/{ctx['task_id']}/applications",
        headers={"Authorization": f"Bearer {ctx['spec_token']}"},
        json={"message": "I can fix it", "price": 400})
    assert r.status_code == 200, r.text
    ctx["app_id"] = r.json()["id"]

    # specialist 2 also applies
    r2 = ctx["s"].post(f"{API}/tasks/{ctx['task_id']}/applications",
        headers={"Authorization": f"Bearer {ctx['spec2_token']}"},
        json={"message": "Me too"})
    assert r2.status_code == 200
    ctx["app2_id"] = r2.json()["id"]


def test_apply_customer_forbidden(ctx):
    r = ctx["s"].post(f"{API}/tasks/{ctx['task_id']}/applications",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"},
        json={"message": "x"})
    assert r.status_code == 403


def test_duplicate_application(ctx):
    r = ctx["s"].post(f"{API}/tasks/{ctx['task_id']}/applications",
        headers={"Authorization": f"Bearer {ctx['spec_token']}"},
        json={"message": "again"})
    assert r.status_code == 400


def test_list_apps_owner_only(ctx):
    r = ctx["s"].get(f"{API}/tasks/{ctx['task_id']}/applications",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"})
    assert r.status_code == 200
    assert len(r.json()) >= 2

    r2 = ctx["s"].get(f"{API}/tasks/{ctx['task_id']}/applications",
        headers={"Authorization": f"Bearer {ctx['spec_token']}"})
    assert r2.status_code == 403


def test_applications_mine(ctx):
    r = ctx["s"].get(f"{API}/applications/mine",
        headers={"Authorization": f"Bearer {ctx['spec_token']}"})
    assert r.status_code == 200
    assert any(a["id"] == ctx["app_id"] for a in r.json())


def test_accept_application(ctx):
    r = ctx["s"].post(f"{API}/applications/{ctx['app_id']}/accept",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"})
    assert r.status_code == 200

    # task should be in_progress
    t = ctx["s"].get(f"{API}/tasks/{ctx['task_id']}").json()
    assert t["status"] == "in_progress"
    assert t["accepted_specialist_id"] == ctx["spec_id"]

    # other apps rejected
    apps = ctx["s"].get(f"{API}/tasks/{ctx['task_id']}/applications",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"}).json()
    by_id = {a["id"]: a for a in apps}
    assert by_id[ctx["app_id"]]["status"] == "accepted"
    assert by_id[ctx["app2_id"]]["status"] == "rejected"


def test_apply_to_non_open_task(ctx):
    r = ctx["s"].post(f"{API}/tasks/{ctx['task_id']}/applications",
        headers={"Authorization": f"Bearer {ctx['spec2_token']}"},
        json={"message": "late"})
    # spec2 already applied — duplicate triggers 400 first. Use spec_token but it's already applied too.
    # So register a fresh specialist to truly test the non-open branch.
    fresh_phone = _phone() + "7"
    reg = ctx["s"].post(f"{API}/auth/register", json={
        "phone": fresh_phone, "password": "pass1234",
        "name": "Spec Fresh", "role": "specialist"
    })
    fresh_token = reg.json()["token"]
    r2 = ctx["s"].post(f"{API}/tasks/{ctx['task_id']}/applications",
        headers={"Authorization": f"Bearer {fresh_token}"},
        json={"message": "late"})
    assert r2.status_code == 400


# ---------- Chats ----------
def test_chats_after_accept(ctx):
    rc = ctx["s"].get(f"{API}/chats",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"})
    assert rc.status_code == 200
    chats_c = rc.json()
    assert len(chats_c) >= 1
    ctx["chat_id"] = chats_c[0]["id"]

    rs = ctx["s"].get(f"{API}/chats",
        headers={"Authorization": f"Bearer {ctx['spec_token']}"})
    assert rs.status_code == 200
    assert any(c["id"] == ctx["chat_id"] for c in rs.json())


def test_messages_empty_then_send(ctx):
    r = ctx["s"].get(f"{API}/chats/{ctx['chat_id']}/messages",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"})
    assert r.status_code == 200
    assert r.json() == []

    s1 = ctx["s"].post(f"{API}/chats/{ctx['chat_id']}/messages",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"},
        json={"text": "Hello"})
    assert s1.status_code == 200

    s2 = ctx["s"].post(f"{API}/chats/{ctx['chat_id']}/messages",
        headers={"Authorization": f"Bearer {ctx['spec_token']}"},
        json={"text": "Hi"})
    assert s2.status_code == 200

    msgs = ctx["s"].get(f"{API}/chats/{ctx['chat_id']}/messages",
        headers={"Authorization": f"Bearer {ctx['spec_token']}"}).json()
    assert len(msgs) == 2
    assert msgs[0]["text"] == "Hello"
    assert msgs[1]["text"] == "Hi"

    chats = ctx["s"].get(f"{API}/chats",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"}).json()
    chat = next(c for c in chats if c["id"] == ctx["chat_id"])
    assert chat["last_message"] == "Hi"
    assert chat["last_message_at"] is not None


# ---------- Specialist profile + update ----------
def test_get_specialist_profile(ctx):
    r = ctx["s"].get(f"{API}/specialists/{ctx['spec_id']}")
    assert r.status_code == 200
    assert r.json()["id"] == ctx["spec_id"]


def test_update_profile(ctx):
    r = ctx["s"].patch(f"{API}/auth/profile",
        headers={"Authorization": f"Bearer {ctx['spec_token']}"},
        json={"bio": "Experienced plumber", "services": ["plumbing", "electrical"], "city": "Balti"})
    assert r.status_code == 200
    d = r.json()
    assert d["bio"] == "Experienced plumber"
    assert d["services"] == ["plumbing", "electrical"]
    assert d["city"] == "Balti"


# ---------- Delete task ----------
def test_delete_task_owner_only(ctx):
    # create a fresh task to delete
    r = ctx["s"].post(f"{API}/tasks",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"},
        json={"title": "To delete", "description": "x", "category": "other", "city": "C"})
    tid = r.json()["id"]

    # non-owner forbidden
    rf = ctx["s"].delete(f"{API}/tasks/{tid}",
        headers={"Authorization": f"Bearer {ctx['spec_token']}"})
    assert rf.status_code == 403

    rd = ctx["s"].delete(f"{API}/tasks/{tid}",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"})
    assert rd.status_code == 200

    rg = ctx["s"].get(f"{API}/tasks/{tid}")
    assert rg.status_code == 404


# ====================================================================
# Iteration 2: stories, uploads/files, geolocation, photos, distance
# ====================================================================

# 1x1 transparent PNG bytes
TINY_PNG = bytes.fromhex(
    "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C489"
    "0000000D49444154789C63F80F040001010100"
    "1BB6EE5600000000"
    "49454E44AE426082"
)


# ---------- Stories ----------
def test_stories_endpoint(ctx):
    r = ctx["s"].get(f"{API}/stories")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 4
    for s in data:
        assert "id" in s
        assert "title_ru" in s and isinstance(s["title_ru"], str) and len(s["title_ru"]) > 0
        assert "title_ro" in s and isinstance(s["title_ro"], str) and len(s["title_ro"]) > 0
        assert "color" in s and s["color"].startswith("#")
        assert "icon" in s and isinstance(s["icon"], str)


# ---------- Profile lat/lng update ----------
def test_profile_lat_lng_update(ctx):
    r = ctx["s"].patch(
        f"{API}/auth/profile",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"},
        json={"lat": 55.7558, "lng": 37.6173},
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["lat"] == 55.7558
    assert d["lng"] == 37.6173

    # verify GET /me reflects it
    me = ctx["s"].get(
        f"{API}/auth/me",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"},
    ).json()
    assert me["lat"] == 55.7558
    assert me["lng"] == 37.6173


# ---------- Photo upload + download ----------
def test_upload_photo_requires_auth(ctx):
    # No auth header -> 401
    r = requests.post(
        f"{API}/uploads",
        files={"file": ("test.png", TINY_PNG, "image/png")},
    )
    assert r.status_code == 401


def test_upload_photo_unsupported_type(ctx):
    r = requests.post(
        f"{API}/uploads",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"},
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert r.status_code == 400


def test_upload_and_download_photo(ctx):
    # Upload a tiny PNG with auth
    r = requests.post(
        f"{API}/uploads",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"},
        files={"file": ("tiny.png", TINY_PNG, "image/png")},
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert "id" in d
    assert "path" in d and len(d["path"]) > 0
    assert "url" in d and d["url"].startswith("/api/files/")
    ctx["photo_path"] = d["path"]
    ctx["photo_url"] = d["url"]

    # Persisted in db.files (verify via download which queries db.files w/ is_deleted=false)
    r2 = requests.get(f"{BASE}{d['url']}")
    assert r2.status_code == 200, r2.text
    ct = r2.headers.get("Content-Type", "")
    assert "image/png" in ct
    # Content should be bytes (non-empty)
    assert len(r2.content) > 0


def test_download_missing_file_404(ctx):
    r = requests.get(f"{API}/files/profi-mvp/uploads/nonexistent-{uuid.uuid4()}.png")
    assert r.status_code == 404


# ---------- Tasks with lat/lng + photos ----------
def test_create_task_with_geo_and_photos(ctx):
    photo_path = ctx.get("photo_path") or "profi-mvp/uploads/dummy.png"
    r = ctx["s"].post(
        f"{API}/tasks",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"},
        json={
            "title": "Repair near Red Square",
            "description": "Pipe leak near center",
            "category": "repair",
            "city": "Moscow",
            "budget": 1200,
            "lat": 55.7539,   # near Red Square
            "lng": 37.6208,
            "photos": [photo_path],
        },
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["lat"] == 55.7539
    assert d["lng"] == 37.6208
    assert d["photos"] == [photo_path]
    ctx["geo_task_near"] = d["id"]

    # A far task (St. Petersburg coords)
    r2 = ctx["s"].post(
        f"{API}/tasks",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"},
        json={
            "title": "Far task in SPB",
            "description": "Far away job",
            "category": "repair",
            "city": "Saint Petersburg",
            "lat": 59.9343,
            "lng": 30.3351,
            "photos": [],
        },
    )
    assert r2.status_code == 200
    ctx["geo_task_far"] = r2.json()["id"]


def test_get_task_with_distance(ctx):
    # User at Moscow center; near task should be < 5km
    r = ctx["s"].get(
        f"{API}/tasks/{ctx['geo_task_near']}",
        params={"lat": 55.7558, "lng": 37.6173},
    )
    assert r.status_code == 200
    d = r.json()
    assert d["distance_km"] is not None
    assert d["distance_km"] < 5.0
    # photos preserved
    assert isinstance(d["photos"], list)
    assert d["lat"] == 55.7539
    assert d["lng"] == 37.6208


def test_list_tasks_default_distance_sort_when_geo_provided(ctx):
    r = ctx["s"].get(
        f"{API}/tasks",
        params={"lat": 55.7558, "lng": 37.6173, "category": "repair"},
    )
    assert r.status_code == 200
    tasks = r.json()
    # Both our geo tasks should appear and have distance_km computed
    geo_tasks = [t for t in tasks if t["id"] in (ctx["geo_task_near"], ctx["geo_task_far"])]
    assert len(geo_tasks) == 2
    for t in geo_tasks:
        assert t["distance_km"] is not None
    # Find them in the list
    near_idx = next(i for i, t in enumerate(tasks) if t["id"] == ctx["geo_task_near"])
    far_idx = next(i for i, t in enumerate(tasks) if t["id"] == ctx["geo_task_far"])
    # Near (Moscow) should come before far (SPB)
    assert near_idx < far_idx
    near_t = tasks[near_idx]
    far_t = tasks[far_idx]
    assert near_t["distance_km"] < far_t["distance_km"]
    # Sanity check on haversine: SPB-Moscow ~635 km
    assert 600 < far_t["distance_km"] < 750


def test_list_tasks_explicit_distance_sort(ctx):
    r = ctx["s"].get(
        f"{API}/tasks",
        params={"lat": 55.7558, "lng": 37.6173, "sort": "distance"},
    )
    assert r.status_code == 200
    tasks = r.json()
    distances = [t["distance_km"] for t in tasks if t["distance_km"] is not None]
    # distances should be in ascending order
    assert distances == sorted(distances)


def test_list_tasks_without_geo_no_distance(ctx):
    r = ctx["s"].get(f"{API}/tasks", params={"category": "repair"})
    assert r.status_code == 200
    tasks = r.json()
    # distance_km should be None when no lat/lng provided
    for t in tasks:
        assert t["distance_km"] is None
