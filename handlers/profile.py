import os
from datetime import datetime
from aiogram import types
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, InputFile, ReplyKeyboardMarkup, KeyboardButton, FSInputFile
from config import IMAGES_DIR
from aiogram import F, Router
from aiogram.types import Message, CallbackQuery
from database import Database
from keyboards.profile import profile_keyboard
from keyboards.main_menu import main_menu_keyboard
from keyboards.auth_menu import auth_menu_keyboard
from handlers.admin import ADMIN_IDS
from time import time

profile_router = Router()
db = Database()

def Bold(text):
    return f"<b>{text}</b>"

def as_list(*args):
    class Dummy:
        def as_kwargs(self):
            return {"text": "\n".join(args), "parse_mode": "HTML"}
    return Dummy()


async def check_mute(message):
    user = db.get_user_by_telegram_id(message.from_user.id)
    if not user:
        return False  # Не найден пользователь, пусть обработка продолжается
    mute = db.get_mute(user['id'])
    if mute:
        now = int(time())
        if mute['until'] > now:
            minutes_left = int((mute['until'] - now) / 60) + 1
            await message.answer(
                f"⛔️ У вас мут!\n"
                f"Причина: {mute['reason']}\n"
                f"До разблокировки: {minutes_left} мин."
            )
            return True  # Мут активен, обработку останавливаем
        else:
            db.remove_mute(user['id'])
    return False  # Мута нет, обработка продолжается


def get_start_menu():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="👤 Профиль"), KeyboardButton(text="🔔 Напоминания")]
        ],
        resize_keyboard=True
    )

@profile_router.message(F.text == "/start")
async def start_menu(message: Message):
    user = db.get_user_by_telegram_id(message.from_user.id)
    is_admin = user and user.get('telegram_id') in ADMIN_IDS
    if user and user.get('is_logged_in'):
        await message.answer(
            "🏠 Вы в главном меню.",
            reply_markup=main_menu_keyboard(is_admin=is_admin)
        )
    else:
        await message.answer(
            "🔑 Пожалуйста, войдите или зарегистрируйтесь для доступа к функциям.",
            reply_markup=auth_menu_keyboard()
        )

@profile_router.message(F.text == "👤 Профиль")
async def show_profile(message: Message):
    if await check_mute(message):
        return
    user = db.get_user_by_telegram_id(message.from_user.id)
    if not user or not user.get('is_logged_in'):
        await message.answer("❌ Сначала войдите в систему!")
        return

    photos = db.get_user_photos(message.from_user.id)
    for idx, photo_path in enumerate(photos, 1):
        await message.answer_photo(
            photo=FSInputFile(str(photo_path)),
            caption=f"Фото {idx}"
        )

    photos_count = len(photos)
    profile_text = as_list(
        Bold("👤 Профиль:"),
        f"Имя: {user['name']}",
        f"Логин: {user['login']}",
        f"Фото: {photos_count}/3",
    )
    await message.answer(
        **profile_text.as_kwargs(),
        reply_markup=profile_keyboard()
    )

@profile_router.message(F.text == "📊 Статистика")
async def show_stats(message: Message):
    if await check_mute(message):
        return
    user = db.get_user_by_telegram_id(message.from_user.id)
    if not user or not user.get('is_logged_in'):
        await message.answer("❌ Сначала войдите в систему!")
        return
    
    stats = db.get_user_stats(user['id'])

    profile_text = as_list(
        Bold("📊 Ваша статистика:"),
        f"ID аккаунта: {user['id']}",
        f"Всего напоминаний: {stats['total_reminders']}",
        f"Выполнено: {stats['completed_reminders']}",
        f"Фото в профиле: {stats['photos_count']}/3"
    )
    await message.answer(**profile_text.as_kwargs())

@profile_router.message(F.photo)
async def handle_photo(message: Message):
    if await check_mute(message):
        return
    user = db.get_user_by_telegram_id(message.from_user.id)
    if not user or not user['is_logged_in']:
        return

    if db.count_user_photos(message.from_user.id) >= 3:
        await message.answer("⚠️ Максимум 3 фото. Удалите старые.")
        return

    photo = message.photo[-1]
    file = await message.bot.get_file(photo.file_id)
    file_bytes = await message.bot.download_file(file.file_path)
    file_bytes = file_bytes.read()
    saved = db.save_user_photo(message.from_user.id, file_bytes)
    if saved:
        db.inc_activity(user['id'], user['name'], "photos_uploaded")
        db.log_action(user['id'], "Загружено фото профиля")
        await message.answer(f"✅ Фото сохранено.")
    else:
        await message.answer("❌ Не удалось сохранить фото.")

@profile_router.message(F.text == "Выйти")
async def logout_user(message: Message):
    if await check_mute(message):
        return
    user = db.get_user_by_telegram_id(message.from_user.id)
    if user:
        db.log_action(user['id'], "Выход из аккаунта")
    db.update_login_status(message.from_user.id, 0)
    await message.answer(
        "✅ Вы вышли из аккаунта.",
        reply_markup=auth_menu_keyboard()
    )

@profile_router.message(F.text == "Загрузить фото")
async def ask_for_photo(message: Message):
    if await check_mute(message):
        return
    user = db.get_user_by_telegram_id(message.from_user.id)
    if not user or not user.get('is_logged_in'):
        await message.answer("❌ Сначала войдите в систему!")
        return
    await message.answer("Пришлите фото (максимум 30 МБ)")

@profile_router.message(F.text == "Удалить фото")
async def ask_which_photo_delete(message: Message):
    if await check_mute(message):
        return
    user = db.get_user_by_telegram_id(message.from_user.id)
    if not user or not user.get('is_logged_in'):
        await message.answer("❌ Сначала войдите в систему!")
        return

    photos = db.get_user_photos(message.from_user.id, only_active=True)
    if not photos:
        await message.answer("⚠️ Нет фото для удаления")
        return

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=f"Фото {idx+1}", callback_data=f"delete_photo_{idx}")]
            for idx in range(len(photos))
        ]
    )
    await message.answer("Выберите фото для удаления:", reply_markup=keyboard)

@profile_router.callback_query(F.data.startswith("delete_photo_"))
async def delete_photo_by_index(callback: CallbackQuery):
    if await check_mute(callback.message):
        return
    user = db.get_user_by_telegram_id(callback.from_user.id)
    if not user or not user.get('is_logged_in'):
        await callback.message.answer("❌ Сначала войдите в систему!")
        await callback.answer()
        return

    try:
        idx = int(callback.data.split("_")[-1])
    except Exception:
        await callback.message.answer("⚠️ Ошибка удаления (неверный индекс)")
        await callback.answer()
        return

    if db.delete_user_photo(callback.from_user.id, idx):
        db.log_action(user['id'], f"Удалено фото №{idx+1}")
        await callback.message.answer(f"✅ Фото {idx+1} удалено")
    else:
        await callback.message.answer("⚠️ Ошибка удаления")
    await callback.answer()