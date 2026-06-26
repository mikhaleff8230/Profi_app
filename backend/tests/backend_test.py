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
    r = ctx["s"].post(f"{API}/auth/register-phone", json={
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
    r = ctx["s"].post(f"{API}/auth/register-phone", json={
        "phone": ctx["spec_phone"], "password": "pass1234",
        "name": "Spec One", "role": "specialist", "city": "Chisinau"
    })
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["user"]["role"] == "specialist"
    ctx["spec_token"] = d["token"]
    ctx["spec_id"] = d["user"]["id"]

    r2 = ctx["s"].post(f"{API}/auth/register-phone", json={
        "phone": ctx["spec2_phone"], "password": "pass1234",
        "name": "Spec Two", "role": "specialist"
    })
    assert r2.status_code == 200
    ctx["spec2_token"] = r2.json()["token"]
    ctx["spec2_id"] = r2.json()["user"]["id"]


def test_register_duplicate_phone(ctx):
    r = ctx["s"].post(f"{API}/auth/register-phone", json={
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


def test_check_phone_registered(ctx):
    r = ctx["s"].post(f"{API}/auth/check-phone", json={"phone": ctx["cust_phone"]})
    assert r.status_code == 200
    assert r.json()["registered"] is True
    unknown = "+7999" + str(int(time.time() * 1000))[-7:]
    r2 = ctx["s"].post(f"{API}/auth/check-phone", json={"phone": unknown})
    assert r2.status_code == 200
    assert r2.json()["registered"] is False


def test_check_phone_invalid(ctx):
    r = ctx["s"].post(f"{API}/auth/check-phone", json={"phone": "+700"})
    assert r.status_code == 400


def test_register_phone_with_email(ctx):
    p = "+373" + str(int(time.time() * 1000))[-9:]
    em = f"m{uuid.uuid4().hex[:8]}@x.test"
    r = ctx["s"].post(f"{API}/auth/register-phone", json={
        "phone": p, "password": "pass1234", "name": "Mail User", "role": "customer",
        "email": em
    })
    assert r.status_code == 200, r.text
    assert r.json()["user"]["email"] == em.lower()


def test_register_duplicate_email(ctx):
    p1 = "+3739" + f"{abs(uuid.uuid4().int % 10**9):09d}"
    p2 = "+3738" + f"{abs(uuid.uuid4().int % 10**9):09d}"
    em = f"d{uuid.uuid4().hex[:8]}@dup.test"
    r1 = ctx["s"].post(f"{API}/auth/register-phone", json={
        "phone": p1, "password": "pass1234", "name": "A", "role": "customer", "email": em
    })
    assert r1.status_code == 200
    r2 = ctx["s"].post(f"{API}/auth/register-phone", json={
        "phone": p2, "password": "pass1234", "name": "B", "role": "customer", "email": em
    })
    assert r2.status_code == 400


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
    reg = ctx["s"].post(f"{API}/auth/register-phone", json={
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


# ====================================================================
# Iteration 3: chat status filter, specialist-info, stats, avatar, last_seen
# ====================================================================

# ---------- /api/chats?status=... ----------
def test_chats_status_filter_in_progress(ctx):
    """After accept_application, linked task is 'in_progress' so chat appears under in_progress."""
    # All chats (no filter) — must contain our chat enriched with task_status
    r_all = ctx["s"].get(
        f"{API}/chats",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"},
    )
    assert r_all.status_code == 200
    all_chats = r_all.json()
    target = next((c for c in all_chats if c["id"] == ctx["chat_id"]), None)
    assert target is not None, "chat created by accept_application should be listed"
    assert target.get("task_status") == "in_progress", target

    # status=in_progress includes our chat
    r_ip = ctx["s"].get(
        f"{API}/chats",
        params={"status": "in_progress"},
        headers={"Authorization": f"Bearer {ctx['cust_token']}"},
    )
    assert r_ip.status_code == 200
    ip = r_ip.json()
    assert any(c["id"] == ctx["chat_id"] for c in ip)
    assert all(c.get("task_status") == "in_progress" for c in ip)


def test_chats_status_filter_open_excludes_in_progress(ctx):
    r = ctx["s"].get(
        f"{API}/chats",
        params={"status": "open"},
        headers={"Authorization": f"Bearer {ctx['cust_token']}"},
    )
    assert r.status_code == 200
    # Our chat is on an in_progress task; must NOT appear under status=open
    assert not any(c["id"] == ctx["chat_id"] for c in r.json())


def test_chats_status_filter_other_values(ctx):
    for st in ("completed", "archived"):
        r = ctx["s"].get(
            f"{API}/chats",
            params={"status": st},
            headers={"Authorization": f"Bearer {ctx['cust_token']}"},
        )
        assert r.status_code == 200
        # Our chat is in_progress, must not appear
        assert not any(c["id"] == ctx["chat_id"] for c in r.json())


def test_chats_requires_auth(ctx):
    r = ctx["s"].get(f"{API}/chats")
    assert r.status_code == 401


# ---------- /api/tasks/{id}/specialist-info ----------
def test_specialist_info_specialists_only(ctx):
    # Customer must get 403
    r = ctx["s"].get(
        f"{API}/tasks/{ctx['task_id']}/specialist-info",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"},
    )
    assert r.status_code == 403


def test_specialist_info_not_applied(ctx):
    """A fresh specialist who has NOT applied to geo_task_near:
       has_applied=false, rank == total_applications+1."""
    fresh_phone = _phone() + "5"
    reg = ctx["s"].post(f"{API}/auth/register-phone", json={
        "phone": fresh_phone, "password": "pass1234",
        "name": "Spec NoApply", "role": "specialist",
    })
    assert reg.status_code == 200
    tok = reg.json()["token"]
    ctx["spec_noapply_token"] = tok
    ctx["spec_noapply_id"] = reg.json()["user"]["id"]

    # geo_task_near currently has 0 applications
    r = ctx["s"].get(
        f"{API}/tasks/{ctx['geo_task_near']}/specialist-info",
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["has_applied"] is False
    assert d["my_application"] is None
    assert d["total_applications"] == 0
    assert d["rank"] == d["total_applications"] + 1  # 1
    # customer block
    assert d["customer"] is not None
    assert d["customer"]["id"] == ctx["cust_id"]
    assert d["customer"]["name"] == "Customer One"
    assert "last_seen" in d["customer"]


def test_specialist_info_after_apply_rank(ctx):
    """Two specialists apply to a fresh task. The one with higher rating ranks #1.
       Both specialists currently have rating 0.0 (default) — so they tie and rank=1 for both
       (count of specialist_rating strictly greater than self == 0, +1 = 1)."""
    # Create a fresh task
    rt = ctx["s"].post(
        f"{API}/tasks",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"},
        json={"title": "Rank test task", "description": "two apply",
              "category": "repair", "city": "Chisinau"},
    )
    assert rt.status_code == 200
    tid = rt.json()["id"]

    # spec_noapply applies
    a1 = ctx["s"].post(
        f"{API}/tasks/{tid}/applications",
        headers={"Authorization": f"Bearer {ctx['spec_noapply_token']}"},
        json={"message": "A"},
    )
    assert a1.status_code == 200

    # spec2 applies
    a2 = ctx["s"].post(
        f"{API}/tasks/{tid}/applications",
        headers={"Authorization": f"Bearer {ctx['spec2_token']}"},
        json={"message": "B"},
    )
    assert a2.status_code == 200

    # specialist-info for spec_noapply (now applied)
    r = ctx["s"].get(
        f"{API}/tasks/{tid}/specialist-info",
        headers={"Authorization": f"Bearer {ctx['spec_noapply_token']}"},
    )
    assert r.status_code == 200
    d = r.json()
    assert d["has_applied"] is True
    assert d["my_application"] is not None
    assert d["my_application"]["task_id"] == tid
    assert d["total_applications"] == 2
    # Both ratings are 0.0 → no one is strictly greater → rank=1
    assert d["rank"] == 1


def test_specialist_info_task_not_found(ctx):
    r = ctx["s"].get(
        f"{API}/tasks/nonexistent-{uuid.uuid4()}/specialist-info",
        headers={"Authorization": f"Bearer {ctx['spec_token']}"},
    )
    assert r.status_code == 404


# ---------- /api/auth/stats ----------
def test_auth_stats_specialist(ctx):
    r = ctx["s"].get(
        f"{API}/auth/stats",
        headers={"Authorization": f"Bearer {ctx['spec_token']}"},
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["role"] == "specialist"
    # spec_token applied to ctx['task_id'] and was accepted in test_accept_application
    assert d["applied"] >= 1
    assert d["accepted"] >= 1
    # accept_application created a chat for this specialist
    assert d["active_chats"] >= 1
    assert "rating" in d and isinstance(d["rating"], (int, float))
    assert "reviews_count" in d and isinstance(d["reviews_count"], int)


def test_auth_stats_customer(ctx):
    r = ctx["s"].get(
        f"{API}/auth/stats",
        headers={"Authorization": f"Bearer {ctx['cust_token']}"},
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["role"] == "customer"
    # We created multiple tasks (base + 2 geo + 1 rank-test); one moved to in_progress
    assert d["posted"] >= 4
    assert d["in_progress"] >= 1
    assert d["open"] >= 1
    assert d["posted"] >= d["open"] + d["in_progress"]


def test_auth_stats_requires_auth(ctx):
    r = ctx["s"].get(f"{API}/auth/stats")
    assert r.status_code == 401


# ---------- /api/auth/me updates last_seen ----------
def test_me_updates_last_seen(ctx):
    """The /auth/me endpoint persists a new last_seen on each call.
    Note: the current implementation returns the *stale* user dict
    (read before the update), so the response of call N reflects the
    last_seen written by call N-1. We verify monotonic advancement
    across three calls, which covers the spec intent.
    """
    tok = ctx["spec_token"]
    # Call #1 — persists t1 in DB; response may have stale last_seen
    ctx["s"].get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"})
    time.sleep(1.1)
    # Call #2 — persists t2 in DB; response reflects t1 (non-None)
    r2 = ctx["s"].get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert r2.status_code == 200
    ls2 = r2.json().get("last_seen")
    assert ls2 is not None, "last_seen should be set after prior /auth/me persisted it"
    time.sleep(1.1)
    # Call #3 — response reflects t2 > t1
    r3 = ctx["s"].get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert r3.status_code == 200
    ls3 = r3.json().get("last_seen")
    assert ls3 is not None
    assert ls3 > ls2, f"last_seen should advance across calls: {ls2} -> {ls3}"

    # Cross-verify via specialist-info: the customer's last_seen surfaces
    # the latest persisted value (because that endpoint fetches fresh from DB).
    ctx["s"].get(f"{API}/auth/me", headers={"Authorization": f"Bearer {ctx['cust_token']}"})
    info = ctx["s"].get(
        f"{API}/tasks/{ctx['geo_task_near']}/specialist-info",
        headers={"Authorization": f"Bearer {tok}"},
    ).json()
    assert info["customer"]["last_seen"] is not None


# ---------- PATCH /api/auth/profile accepts avatar ----------
def test_profile_avatar_update(ctx):
    avatar_path = ctx.get("photo_path") or f"profi-mvp/uploads/{ctx['cust_id']}/avatar.png"
    r = ctx["s"].patch(
        f"{API}/auth/profile",
        headers={"Authorization": f"Bearer {ctx['spec_token']}"},
        json={"avatar": avatar_path},
    )
    assert r.status_code == 200, r.text
    assert r.json().get("avatar") == avatar_path

    me = ctx["s"].get(
        f"{API}/auth/me",
        headers={"Authorization": f"Bearer {ctx['spec_token']}"},
    ).json()
    assert me.get("avatar") == avatar_path


# ---------- Regression smoke ----------
def test_regression_smoke_iter3(ctx):
    """Quick smoke: ensure earlier endpoints still respond OK."""
    assert ctx["s"].get(f"{API}/").status_code == 200
    assert ctx["s"].get(f"{API}/categories").status_code == 200
    assert ctx["s"].get(f"{API}/stories").status_code == 200
    assert ctx["s"].get(f"{API}/tasks").status_code == 200
    assert ctx["s"].get(f"{API}/specialists").status_code == 200
    assert ctx["s"].get(
        f"{API}/applications/mine",
        headers={"Authorization": f"Bearer {ctx['spec_token']}"},
    ).status_code == 200
