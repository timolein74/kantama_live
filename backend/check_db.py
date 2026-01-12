import sqlite3
import os

DB_PATH = 'Kantama.db'

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

print("=== TABLES ===")
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
print([t[0] for t in tables])

if 'files' in [t[0] for t in tables]:
    print("\n=== FILES TABLE ===")
    c.execute("SELECT * FROM files ORDER BY created_at DESC LIMIT 10")
    for row in c.fetchall():
        print(row)

if 'applications' in [t[0] for t in tables]:
    print("\n=== APPLICATIONS ===")
    c.execute("SELECT id, company_name, business_id, status FROM applications ORDER BY created_at DESC LIMIT 10")
    for row in c.fetchall():
        print(row)

if 'application_files' in [t[0] for t in tables]:
    print("\n=== APPLICATION_FILES ===")
    c.execute("SELECT * FROM application_files ORDER BY id DESC LIMIT 10")
    for row in c.fetchall():
        print(row)

conn.close()
