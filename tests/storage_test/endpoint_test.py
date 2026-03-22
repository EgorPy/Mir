import requests
import config

data = {"text": "Nigger"}
response = requests.post(f"http://{config.HOST}:{config.PORT}/storage", json=data)

print(response)
