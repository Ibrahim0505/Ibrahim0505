"""
Backend regression tests for CARI KROTO API.
Covers locations CRUD, visits CRUD + aggregation, photo upload/serve/delete.
"""
import io
import os
import time
from datetime import datetime, timezone, timedelta

import pytest
import requests


# ------------------------- Health / root -------------------------
def test_root(api_client, base_url):
    r = api_client.get(f"{base_url}/api/")
    assert r.status_code == 200
    assert r.json().get("message") == "CARI KROTO API"


# ------------------------- Location CRUD -------------------------
@pytest.fixture(scope="module")
def created_location(base_url):
    s = requests.Session()
    payload = {
        "name": "TEST_Pohon_Kroto_A",
        "notes": "regression test",
        "latitude": -6.21,
        "longitude": 106.85,
        "harvest_interval_days": 14,
        "photos": [],
    }
    r = s.post(f"{base_url}/api/locations", json=payload)
    assert r.status_code == 200, r.text
    loc = r.json()
    yield loc
    # cleanup
    s.delete(f"{base_url}/api/locations/{loc['id']}")


def test_create_location_returns_ready_status(created_location):
    assert created_location["name"] == "TEST_Pohon_Kroto_A"
    assert created_location["status"] == "ready"
    assert created_location["next_harvest_at"] is not None
    assert created_location["visit_count"] == 0
    assert created_location["total_harvest_kg"] == 0
    assert "id" in created_location
    assert "_id" not in created_location


def test_list_locations_contains_created(api_client, base_url, created_location):
    r = api_client.get(f"{base_url}/api/locations")
    assert r.status_code == 200
    ids = [l["id"] for l in r.json()]
    assert created_location["id"] in ids


def test_get_location_detail(api_client, base_url, created_location):
    r = api_client.get(f"{base_url}/api/locations/{created_location['id']}")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == created_location["id"]
    assert body["latitude"] == -6.21
    assert body["longitude"] == 106.85


def test_get_location_404(api_client, base_url):
    r = api_client.get(f"{base_url}/api/locations/507f1f77bcf86cd799439011")
    assert r.status_code == 404


def test_update_location(api_client, base_url, created_location):
    r = api_client.put(
        f"{base_url}/api/locations/{created_location['id']}",
        json={"name": "TEST_Pohon_Kroto_A_updated", "notes": "edited", "harvest_interval_days": 10},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "TEST_Pohon_Kroto_A_updated"
    assert body["notes"] == "edited"
    assert body["harvest_interval_days"] == 10
    # verify GET persistence
    g = api_client.get(f"{base_url}/api/locations/{created_location['id']}")
    assert g.json()["harvest_interval_days"] == 10


# ------------------------- Visits & aggregation -------------------------
def test_create_visit_updates_aggregates_and_status(api_client, base_url, created_location):
    lid = created_location["id"]
    visited_at = datetime.now(timezone.utc).isoformat()
    r = api_client.post(
        f"{base_url}/api/locations/{lid}/visits",
        json={"visited_at": visited_at, "amount_kg": 2.5, "notes": "TEST harvest"},
    )
    assert r.status_code == 200, r.text
    visit = r.json()
    assert visit["amount_kg"] == 2.5
    assert visit["location_id"] == lid

    # location aggregates updated
    loc = api_client.get(f"{base_url}/api/locations/{lid}").json()
    assert loc["visit_count"] == 1
    assert abs(loc["total_harvest_kg"] - 2.5) < 1e-6
    assert loc["last_visit_at"] == visited_at
    # next_harvest_at = visited_at + interval (10 days as updated above)
    nh = datetime.fromisoformat(loc["next_harvest_at"])
    base = datetime.fromisoformat(visited_at)
    assert abs((nh - base).days - 10) <= 1
    # since next_harvest is in the future, status should flip to cooldown
    assert loc["status"] == "cooldown"
    return visit


def test_list_visits(api_client, base_url, created_location):
    lid = created_location["id"]
    r = api_client.get(f"{base_url}/api/locations/{lid}/visits")
    assert r.status_code == 200
    visits = r.json()
    assert len(visits) >= 1
    assert visits[0]["location_id"] == lid


def test_update_visit_adjusts_location_total(api_client, base_url, created_location):
    lid = created_location["id"]
    visits = api_client.get(f"{base_url}/api/locations/{lid}/visits").json()
    vid = visits[0]["id"]
    before = api_client.get(f"{base_url}/api/locations/{lid}").json()["total_harvest_kg"]

    r = api_client.put(f"{base_url}/api/visits/{vid}", json={"amount_kg": 5.0, "notes": "TEST updated"})
    assert r.status_code == 200
    assert r.json()["amount_kg"] == 5.0

    after = api_client.get(f"{base_url}/api/locations/{lid}").json()["total_harvest_kg"]
    assert abs(after - (before + (5.0 - 2.5))) < 1e-6


def test_delete_visit_adjusts_totals(api_client, base_url, created_location):
    lid = created_location["id"]
    visits = api_client.get(f"{base_url}/api/locations/{lid}/visits").json()
    vid = visits[0]["id"]
    before = api_client.get(f"{base_url}/api/locations/{lid}").json()
    r = api_client.delete(f"{base_url}/api/visits/{vid}")
    assert r.status_code == 200
    after = api_client.get(f"{base_url}/api/locations/{lid}").json()
    assert after["visit_count"] == before["visit_count"] - 1
    assert abs(after["total_harvest_kg"] - (before["total_harvest_kg"] - 5.0)) < 1e-6
    # verify visit soft deleted (not returned)
    remaining = api_client.get(f"{base_url}/api/locations/{lid}/visits").json()
    assert vid not in [v["id"] for v in remaining]


# ------------------------- Upload / serve / delete photo -------------------------
def _tiny_jpeg_bytes():
    # 1x1 red JPEG (valid)
    return bytes.fromhex(
        "ffd8ffe000104a46494600010101006000600000ffdb004300080606070605080707"
        "070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c"
        "1c2837292c30313434341f27393d38323c2e333432ffdb0043010909090c0b0c180d"
        "0d1832211c213232323232323232323232323232323232323232323232323232323232"
        "3232323232323232323232323232323232323232323232323232ffc00011080001000103"
        "012200021101031101ffc4001f0000010501010101010100000000000000000102030405"
        "060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131"
        "410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445"
        "464748494a535455565758595a636465666768696a737475767778797a838485868788898a92"
        "939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5"
        "d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f01000301010101010101"
        "01010100000000000001020304050607080910110bffc400b5110002010204040304070504040001"
        "0277000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434"
        "e125f11718191a262728292a35363738393a434445464748494a535455565758595a636465666768696a"
        "737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9b"
        "ac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002"
        "11031100003f00fbfcffd9"
    )


def test_upload_serve_and_delete_photo(base_url):
    files = {"file": ("test.jpg", io.BytesIO(_tiny_jpeg_bytes()), "image/jpeg")}
    r = requests.post(f"{base_url}/api/upload", files=files, timeout=60)
    if r.status_code == 402:
        pytest.skip("Storage quota exceeded")
    assert r.status_code == 200, r.text
    path = r.json().get("path")
    assert path and "cari-kroto/uploads" in path

    # serve
    r2 = requests.get(f"{base_url}/api/files/{path}", timeout=60)
    assert r2.status_code == 200
    assert r2.headers.get("content-type", "").startswith("image/")
    assert len(r2.content) > 100

    # attach + remove via location
    s = requests.Session()
    loc = s.post(
        f"{base_url}/api/locations",
        json={"name": "TEST_Photo_Loc", "latitude": 0.0, "longitude": 0.0, "photos": [path]},
    ).json()
    lid = loc["id"]
    assert path in loc["photos"]

    d = s.delete(f"{base_url}/api/locations/{lid}/photos", params={"path": path})
    assert d.status_code == 200
    assert path not in d.json()["photos"]

    s.delete(f"{base_url}/api/locations/{lid}")


# ------------------------- Soft delete cascade -------------------------
def test_delete_location_cascades_visits(base_url):
    s = requests.Session()
    loc = s.post(
        f"{base_url}/api/locations",
        json={"name": "TEST_Cascade", "latitude": 1.0, "longitude": 2.0},
    ).json()
    lid = loc["id"]
    s.post(f"{base_url}/api/locations/{lid}/visits", json={"amount_kg": 1})
    d = s.delete(f"{base_url}/api/locations/{lid}")
    assert d.status_code == 200

    # location no longer returned
    g = s.get(f"{base_url}/api/locations/{lid}")
    assert g.status_code == 404
    # visits list returns empty
    v = s.get(f"{base_url}/api/locations/{lid}/visits").json()
    assert v == []
