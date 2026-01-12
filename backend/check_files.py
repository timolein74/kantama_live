import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'Kantama.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Tarkistetaan taulut
print('=== TAULUT KANNASSA ===')
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print([t[0] for t in tables])

print()
print('=== KAIKKI TIEDOSTOT ===')
try:
    cursor.execute('SELECT id, original_filename, file_path, file_size, application_id, created_at FROM files ORDER BY created_at DESC')
    files = cursor.fetchall()
    if files:
        for f in files:
            print(f'ID: {f[0]}, Nimi: {f[1]}, Polku: {f[2]}, Koko: {f[3]} bytes, App ID: {f[4]}, Luotu: {f[5]}')
    else:
        print('Ei tiedostoja files-taulussa')
except Exception as e:
    print(f'Virhe: {e}')

print()
print('=== HAKEMUKSET ===')
try:
    cursor.execute('SELECT id, company_name, status, created_at FROM applications ORDER BY created_at DESC')
    apps = cursor.fetchall()
    if apps:
        for app in apps:
            print(f'App ID: {app[0]}, Yritys: {app[1]}, Status: {app[2]}, Luotu: {app[3]}')
    else:
        print('Ei hakemuksia')
except Exception as e:
    print(f'Virhe: {e}')

print()
print('=== UPLOADS-KANSIO ===')
uploads_path = os.path.join(os.path.dirname(__file__), 'uploads')
if os.path.exists(uploads_path):
    files = os.listdir(uploads_path)
    print(f'Tiedostoja: {len(files)}')
    for f in files:
        fp = os.path.join(uploads_path, f)
        size = os.path.getsize(fp)
        print(f'  {f} ({size} bytes)')
else:
    print('Uploads-kansiota ei ole')

conn.close()
