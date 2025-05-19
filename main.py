# main.py
import asyncio
import logging
from aiogram import Bot, Dispatcher
from config import TOKEN


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)

from aiogram import Bot, Dispatcher
from handlers.profile import profile_router
from handlers.reminders import reminders_router, check_reminders
from handlers.auth import auth_router
from handlers.tiktok import tiktok_router
from handlers.admin import admin_router
from handlers.weather import weather_router
from handlers.rating import rating_router
from keyboards.auth_menu import auth_menu_keyboard

async def main():
    bot = Bot(token=TOKEN)
    dp = Dispatcher()

    dp.include_router(admin_router)
    dp.include_router(profile_router)
    dp.include_router(rating_router)
    dp.include_router(weather_router)
    dp.include_router(reminders_router)
    dp.include_router(auth_router)
    dp.include_router(tiktok_router)
    

    # Запуск фоновой задачи
    asyncio.create_task(check_reminders(bot))

    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())