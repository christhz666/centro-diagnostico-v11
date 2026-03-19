import requests
import json
import sys

BASE_URL = "http://localhost:5000/api"

print("1. Iniciando sesion como admin...")
resp = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "admin@miesperanza.com",
    "password": "Admin123!"
})

if resp.status_code != 200:
    print("Error login:", resp.text)
    sys.exit(1)

token = resp.json().get("token")
print("Token obtenido.")

print("\n2. Creando usuario con datos de prueba...")
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Misma data que enviaria el frontend si email y username quedan vacios:
payload = {
    "nombre": "Test",
    "apellido": "User",
    "username": "testuser123", # Agregando este
    "password": "Password123!",
    "role": "recepcion",
    "telefono": "12345678"
}

print("Enviando Payload:", json.dumps(payload, indent=2))
resp = requests.post(f"{BASE_URL}/admin/usuarios", json=payload, headers=headers)

print(f"\nRespuesta {resp.status_code}:")
try:
    print(json.dumps(resp.json(), indent=2))
except:
    print(resp.text)
