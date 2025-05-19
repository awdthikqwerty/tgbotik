from aiogram import F, Router, types
from database import Database
from keyboards.main_menu import main_menu_keyboard
from keyboards.auth_menu import auth_menu_keyboard

rating_router = Router()
db = Database()

def format_rating(top_users):
    medals = ["👑", "🥈", "🥉"] + ["🔹"] * 7
    text = "🏆 ТОП-10 самых активных пользователей:\n\n"
    for i, (username, rem, photos, weather, total) in enumerate(top_users, 1):
        text += (
            f"{i}. {medals[i-1]} {username} – {total} очков "
            f"(📅 {rem} напом., 📸 {photos} фото, ☀️ {weather} проверок)\n"
        )
    return text

@rating_router.message(F.text.in_({"🏆 Рейтинг", "/rating"}))
async def show_rating(message: types.Message):
    user = db.get_user_by_telegram_id(message.from_user.id)
    if not user or not user.get('is_logged_in'):
        await message.answer("❌ Сначала войдите в систему!", reply_markup=auth_menu_keyboard())
        return
    top_users = db.get_top_users()
    if not top_users:
        await message.answer("Нет данных для рейтинга.")
        return
    await message.answer(format_rating(top_users), reply_markup=main_menu_keyboard())