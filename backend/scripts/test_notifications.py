"""Smoke test: create CRM events and verify notifications API.

Uses two users because notifications skip self-actions (actor == recipient).
"""

from __future__ import annotations

import json
import sys
import time
import uuid
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BASE = "http://127.0.0.1:8000/api/v1"


def api(method: str, path: str, body: dict | None = None, token: str | None = None) -> dict:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    req = Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw else {}
    except HTTPError as e:
        detail = e.read().decode()
        raise RuntimeError(f"{method} {path} -> {e.code}: {detail}") from e


def login(email: str, password: str) -> tuple[str, str]:
    data = api("POST", "/auth/login", {"email": email, "password": password})
    return data["access_token"], data["user"]["id"]


def main() -> int:
    print("=== Nexora Notification Center Smoke Test ===\n")

    owner_email = f"owner-{int(time.time())}@example.com"
    member_email = f"member-{int(time.time())}@example.com"
    password = "TestPass123!"
    slug = f"notif-test-{uuid.uuid4().hex[:8]}"

    # 1. Register owner + member
    print("1. Registering owner and member...")
    owner_reg = api("POST", "/auth/register", {
        "email": owner_email,
        "password": password,
        "full_name": "Notification Owner",
    })
    owner_token = owner_reg["access_token"]
    owner_id = owner_reg["user"]["id"]

    member_reg = api("POST", "/auth/register", {
        "email": member_email,
        "password": password,
        "full_name": "Notification Member",
    })
    member_token = member_reg["access_token"]
    member_id = member_reg["user"]["id"]
    print(f"   OK owner={owner_id[:8]}... member={member_id[:8]}...")

    # 2. Create tenant (owner)
    print(f"2. Creating tenant slug={slug}...")
    api("POST", "/tenants", {"name": "Notification Test Org", "slug": slug}, token=owner_token)
    prefix = f"/tenants/{slug}"

    # 3. Invite member
    print("3. Inviting member to tenant...")
    roles = api("GET", f"{prefix}/roles", token=owner_token)
    member_role = next((r for r in roles["items"] if r["slug"] == "member"), roles["items"][-1])
    api("POST", f"{prefix}/users", {
        "email": member_email,
        "role_id": member_role["id"],
    }, token=owner_token)
    print(f"   OK invited as role={member_role['slug']}")

    # 4. Owner creates lead, then assigns to member
    print("4. Owner creates lead and assigns to member...")
    lead = api("POST", f"{prefix}/leads", {
        "first_name": "Notify",
        "last_name": "Lead",
        "status": "new",
    }, token=owner_token)
    lead_id = lead["id"]
    api("PATCH", f"{prefix}/leads/{lead_id}", {"assigned_to_id": member_id}, token=owner_token)

    # 5. Owner creates deal assigned to member, then wins it
    print("5. Owner creates deal assigned to member...")
    deal = api("POST", f"{prefix}/deals", {
        "title": "Notification Test Deal",
        "stage": "new",
        "value": "5000",
        "assigned_to_id": member_id,
    }, token=owner_token)
    deal_id = deal["id"]
    print("6. Owner moves deal to won...")
    api("PATCH", f"{prefix}/deals/{deal_id}", {"stage": "won"}, token=owner_token)

    # 7. Owner creates task assigned to member
    print("7. Owner creates task assigned to member...")
    api("POST", f"{prefix}/tasks", {
        "title": "Notification test task",
        "status": "pending",
        "priority": "medium",
        "assigned_to_id": member_id,
        "entity_type": "lead",
        "entity_id": lead_id,
    }, token=owner_token)

    # 8. Owner creates company (notifies other members)
    print("8. Owner creates company...")
    api("POST", f"{prefix}/companies", {"company_name": "Notify Corp"}, token=owner_token)

    # 9. Member checks notifications
    print("9. Member fetches notifications...")
    notifs = api("GET", f"{prefix}/notifications?page_size=50", token=member_token)
    unread = api("GET", f"{prefix}/notifications/unread-count", token=member_token)

    items = notifs.get("items", [])
    print(f"\n=== RESULTS ===")
    print(f"Tenant slug: {slug}")
    print(f"Owner login: {owner_email} / {password}")
    print(f"Member login: {member_email} / {password}")
    print(f"Total notifications: {notifs.get('total', len(items))}")
    print(f"Unread count: {unread.get('unread_count', 0)}")
    print(f"Items returned: {len(items)}\n")

    if not items:
        print("FAIL: No notifications were created for member.")
        return 1

    types = [i["type"] for i in items]
    print("Notifications for member:")
    for i, n in enumerate(items, 1):
        read = "read" if n.get("read") else "UNREAD"
        print(f"  {i}. [{read}] {n['type']}: {n['title']}")

    expected = {"lead_assigned", "deal_created", "deal_won", "task_assigned", "user_invited"}
    found = set(types)
    missing = expected - found
    if missing:
        print(f"\nWARN: Expected types missing: {missing}")
    else:
        print(f"\nPASS: All core notification types present.")

    # 10. Mark all read as member
    print("\n10. Member marks all read...")
    result = api("POST", f"{prefix}/notifications/mark-all-read", {}, token=member_token)
    unread_after = api("GET", f"{prefix}/notifications/unread-count", token=member_token)
    print(f"   Marked {result.get('affected', 0)} as read")
    print(f"   Unread after: {unread_after.get('unread_count', 0)}")

    if unread_after.get("unread_count", 0) == 0:
        print("PASS: Mark all read works.")
    else:
        print("WARN: Unread count not zero after mark all read.")

    print(f"\nFrontend (member): http://localhost:3000/{slug}/notifications")
    print("=== Done ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
