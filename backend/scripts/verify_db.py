import psycopg2

conn = psycopg2.connect(
    dbname="postgres",
    user="postgres",
    password="2356",
    host="localhost",
)
cur = conn.cursor()
cur.execute("SELECT datname FROM pg_database WHERE datname = 'nexora'")
exists = cur.fetchone() is not None
print(f"Database 'nexora' exists in PostgreSQL: {exists}")

if exists:
    conn2 = psycopg2.connect(
        dbname="nexora",
        user="postgres",
        password="2356",
        host="localhost",
    )
    cur2 = conn2.cursor()
    cur2.execute(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'public' ORDER BY table_name"
    )
    tables = [row[0] for row in cur2.fetchall()]
    print(f"Tables created ({len(tables)}):")
    for table in tables:
        print(f"  - {table}")
    cur2.close()
    conn2.close()

cur.close()
conn.close()
