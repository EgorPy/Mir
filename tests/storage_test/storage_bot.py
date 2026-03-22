from aiogram import Dispatcher, executor
from telegram_interface import *

import config

bot = Bot(token=config.STORAGE_BOT_TOKEN)
dp = Dispatcher(bot)


@dp.message_handler()
async def test(message: types.Message):
    await answer(message, "Hello")
    print(message.text)
    print(await message.photo[-1].get_url())
    print()


@dp.message_handler(content_types=["photo", "video"])
async def on_media(message: types.Message):
    print(await message.photo[-1].get_url())


async def on_startup(dispatcher):
    """ On startup """

    print("Telegram Bot starting...")


if __name__ == '__main__':
    executor.start_polling(dp, skip_updates=True, on_startup=on_startup)

# https://api.telegram.org/file/bot8756729526:AAFK9E2mV5Aom4_LpBC4GlgEvY0hvgesV7o/photos/file_0.jpg
# https://api.telegram.org/file/bot8756729526:AAFK9E2mV5Aom4_LpBC4GlgEvY0hvgesV7o/photos/file_1.jpg
