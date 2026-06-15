import json
import urllib.error
import urllib.request

base = "http://localhost:8000/api/v1"
email = "phase1test@example.com"
slug = "test-org-phase1"

req = urllib.request.Request(
    base + "/auth/login",
    data=json.dumps({"email": email, "password": "password123"}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
r = urllib.request.urlopen(req)
token = json.loads(r.read())["access_token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

req = urllib.request.Request(
    base + f"/tenants/{slug}/leads",
    data=json.dumps(
        {
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane@acme.com",
            "status": "new",
            "source": "website",
            "company": "Acme",
        }
    ).encode(),
    headers=headers,
    method="POST",
)
r = urllib.request.urlopen(req)
lead = json.loads(r.read())
print("CREATE:", lead["first_name"], lead["id"])

req = urllib.request.Request(
    base + f"/tenants/{slug}/leads?q=jane&status=new&page=1&page_size=10",
    headers=headers,
)
r = urllib.request.urlopen(req)
data = json.loads(r.read())
print("SEARCH:", data["total"], "results")

lead_id = lead["id"]
req = urllib.request.Request(
    base + f"/tenants/{slug}/leads/{lead_id}",
    data=json.dumps({"status": "qualified"}).encode(),
    headers=headers,
    method="PATCH",
)
r = urllib.request.urlopen(req)
print("UPDATE:", json.loads(r.read())["status"])
print("LEADS MODULE API: OK")
