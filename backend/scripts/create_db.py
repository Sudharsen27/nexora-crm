import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

conn = psycopg2.connect(
    dbname="postgres",
    user="postgres",
    password="2356",
    host="localhost",
    port=5432,
)
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()
cur.execute("SELECT 1 FROM pg_database WHERE datname = 'nexora'")
if cur.fetchone():
    print("Database nexora already exists")
else:
    cur.execute("CREATE DATABASE nexora")
    print("Database nexora created successfully")
cur.close()
conn.close()
