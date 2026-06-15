import json
import urllib.error
import urllib.request

base = "http://localhost:8000/api/v1"
slug = "new-company"

# Check openapi for leads routes
try:
    r = urllib.request.urlopen(f"{base.replace('/api/v1', '')}/openapi.json")
    spec = json.loads(r.read())
    lead_paths = [p for p in spec.get("paths", {}) if "leads" in p]
    print("OpenAPI lead paths:", lead_paths or "NONE - server needs restart")
except Exception as e:
    print("OpenAPI error:", e)

# Try without auth to see 401 vs 404
for path in [f"/tenants/{slug}/leads/meta", f"/tenants/{slug}/leads", f"/tenants/{slug}"]:
    try:
        req = urllib.request.Request(base + path)
        urllib.request.urlopen(req)
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"{path} -> {e.code}: {body[:120]}")
