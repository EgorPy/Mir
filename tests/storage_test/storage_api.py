from fastapi import FastAPI
from pydantic import BaseModel
from telegram_interface import *

from storage_bot import bot

import uvicorn
import config

app = FastAPI()


class StorageModel(BaseModel):
    text: str


@app.post("/storage")
async def storage(data: StorageModel):
    # print(data)
    message = await send_message(bot, config.STORAGE_GROUP_ID, data.text)
    # print(await message.photo[-1].get_url())
    print(message.url)


def run():
    uvicorn.run(app, host=config.HOST, port=config.PORT)


if __name__ == '__main__':
    run()
