import sys
import pathlib
from copy import deepcopy
from urllib.parse import quote

# Make sure we can import the app module in `src/app.py`
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from fastapi.testclient import TestClient
from app import app, activities

client = TestClient(app)


import pytest


@pytest.fixture(autouse=True)
def reset_activities():
    # keep a deep copy of original activities and restore after each test
    original = deepcopy(activities)
    yield
    activities.clear()
    activities.update(original)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # check a known activity exists
    assert "Chess Club" in data


def test_signup_and_prevent_duplicate():
    email = "teststudent@mergington.edu"
    activity = "Chess Club"
    path = f"/activities/{quote(activity, safe='')}/signup?email={quote(email, safe='')}"

    resp = client.post(path)
    assert resp.status_code == 200
    assert email in activities[activity]["participants"]

    # signing up again should fail
    resp2 = client.post(path)
    assert resp2.status_code == 400


def test_unregister_flow():
    email = "unreg@mergington.edu"
    activity = "Programming Class"

    signup_path = f"/activities/{quote(activity, safe='')}/signup?email={quote(email, safe='')}"
    resp = client.post(signup_path)
    assert resp.status_code == 200
    assert email in activities[activity]["participants"]

    unregister_path = f"/activities/{quote(activity, safe='')}/unregister?email={quote(email, safe='')}"
    resp2 = client.post(unregister_path)
    assert resp2.status_code == 200
    assert email not in activities[activity]["participants"]

    # unregistering a non-signed student returns 400
    resp3 = client.post(f"/activities/{quote(activity, safe='')}/unregister?email={quote('noone@here.edu', safe='')}" )
    assert resp3.status_code == 400
