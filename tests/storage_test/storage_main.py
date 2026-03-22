from storage_api import app
from storage_bot import dp, on_startup

import asyncio
import uvicorn
import config


async def run_api():
    server_config = uvicorn.Config(app, host=config.HOST, port=config.PORT)
    server = uvicorn.Server(server_config)
    await server.serve()


async def run_bot():
    await on_startup(dp)
    await dp.start_polling(dp)


async def main():
    await asyncio.gather(
        run_api(),
        run_bot(),
    )


if __name__ == '__main__':
    asyncio.run(main())
