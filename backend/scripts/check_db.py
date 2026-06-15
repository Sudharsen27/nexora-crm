import psycopg2

conn = psycopg2.connect(dbname="nexora", user="postgres", password="2356", host="localhost")
cur = conn.cursor()
cur.execute("SELECT slug, name, status FROM tenants")
print("Tenants:", cur.fetchall())
cur.execute("SELECT slug FROM permissions WHERE slug LIKE 'lead%'")
print("Lead permissions:", cur.fetchall())
conn.close()
