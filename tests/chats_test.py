import requests


def get_chats():
    response = requests.get("http://127.0.0.1:8000/chats/list")
    d = response.json()
    for chat_id in d:
        print(d[chat_id])


def create_chat(chat_name: str):
    data = {
        "title": chat_name
    }
    response = requests.post("http://127.0.0.1:8000/chats/create", json=data)
    print(response)


create_chat("Chat created with requests")

"""
const response = await fetch(`${window.BACKEND_URL || ''}/chats/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title })
        });
"""
