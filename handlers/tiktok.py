import re
import aiohttp
from aiogram import F, Router
from aiogram.types import Message, BufferedInputFile
from keyboards.tiktok import tiktok_keyboard
from keyboards.main_menu import main_menu_keyboard
from handlers.admin import ADMIN_IDS
from database import Database

tiktok_router = Router()
db = Database()

TIKTOK_URL_RE = re.compile(r'(https?://[^\s]+tiktok\.com[^\s]*)')

@tiktok_router.message(F.text == "📱 Тик Ток")
async def tiktok_menu(message: Message):
    await message.answer(
        "Пришли ссылку на TikTok, и я отправлю тебе видео без водяного знака.",
        reply_markup=tiktok_keyboard()
    )

@tiktok_router.message(F.text == "⬅️ В меню")
async def back_to_main_menu(message: Message):
    user = db.get_user_by_telegram_id(message.from_user.id)
    is_admin = user and user.get('telegram_id') in ADMIN_IDS
    await message.answer("🏠 Главное меню", reply_markup=main_menu_keyboard(is_admin=is_admin))

@tiktok_router.message()
async def tiktok_link_handler(message: Message):
    match = TIKTOK_URL_RE.search(message.text or "")
    if not match:
        return

    url = match.group(1)
    await message.answer("⏳ Скачиваю видео...")

    api_url = f"https://tikwm.com/api/"
    params = {"url": url}

    async with aiohttp.ClientSession() as session:
        async with session.get(api_url, params=params) as resp:
            if resp.status != 200:
                await message.reply("❌ Не удалось получить видео.")
                return
            result = await resp.json()
            video_url = result.get("data", {}).get("play")
            if not video_url:
                await message.reply("❌ Не удалось найти видео без водяного знака.")
                return

        async with session.get(video_url) as video_resp:
            if video_resp.status != 200:
                await message.reply("❌ Не удалось скачать видео.")
                return
            video_bytes = await video_resp.read()
            video_file = BufferedInputFile(video_bytes, filename="tiktok.mp4")
            await message.reply_video(video=video_file, caption="Вот твоё видео без водяного знака!", reply_to_message_id=message.message_id)