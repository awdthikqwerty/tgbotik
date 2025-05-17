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

profile_router = Router()
db = Database()

def Bold(text):
    return f"<b>{text}</b>"

def as_list(*args):
    class Dummy:
        def as_kwargs(self):
            return {"text": "\n".join(args), "parse_mode": "HTML"}
    return Dummy()

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
    if user and user.get('is_logged_in'):
        await message.answer(
            "🏠 Вы в главном меню.",
            reply_markup=main_menu_keyboard()
        )
    else:
        await message.answer(
            "🔑 Пожалуйста, войдите или зарегистрируйтесь для доступа к функциям.",
            reply_markup=auth_menu_keyboard()
        )

@profile_router.message(F.text == "👤 Профиль")
async def show_profile(message: Message):
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

# Загрузка фото
@profile_router.message(F.photo)
async def handle_photo(message: Message):
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
        await message.answer(f"✅ Фото сохранено.")
    else:
        await message.answer("❌ Не удалось сохранить фото.")

# Удаление фото
@profile_router.callback_query(F.data == "delete_photo")
async def delete_photo(callback: types.CallbackQuery):
    photos = db.get_user_photos(callback.from_user.id)
    if not photos:
        await callback.answer("⚠️ Нет фото для удаления")
        return

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f"Фото {idx+1}", callback_data=f"delete_{idx+1}")]
        for idx in range(len(photos))
    ])
    await callback.message.answer("Выберите фото для удаления:", reply_markup=keyboard)

@profile_router.callback_query(F.data.startswith("delete_"))
async def confirm_delete(callback: types.CallbackQuery):
    number = int(callback.data.split("_", 1)[1])
    if db.delete_user_photo(callback.from_user.id, number):
        await callback.message.answer(f"✅ Фото {number} удалено")
    else:
        await callback.message.answer("⚠️ Ошибка удаления")
    await callback.answer()

# Выход
@profile_router.message(F.text == "Выйти")
async def logout_user(message: Message):
    db.update_login_status(message.from_user.id, 0)
    await message.answer(
        "✅ Вы вышли из аккаунта.",
        reply_markup=auth_menu_keyboard()
    )

@profile_router.message(F.text == "Загрузить фото")
async def ask_for_photo(message: Message):
    user = db.get_user_by_telegram_id(message.from_user.id)
    if not user or not user.get('is_logged_in'):
        await message.answer("❌ Сначала войдите в систему!")
        return
    await message.answer("Пришлите фото (максимум 30 МБ)")

@profile_router.message(F.text == "Удалить фото")
async def ask_which_photo_delete(message: Message):
    user = db.get_user_by_telegram_id(message.from_user.id)
    if not user or not user.get('is_logged_in'):
        await message.answer("❌ Сначала войдите в систему!")
        return

    photos = db.get_user_photos(message.from_user.id)
    if not photos:
        await message.answer("⚠️ Нет фото для удаления")
        return

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f"Фото {idx+1}", callback_data=f"delete_{idx+1}")]
        for idx in range(len(photos))
    ])
    await message.answer("Выберите фото для удаления:", reply_markup=keyboard)

@profile_router.message(F.text == "⬅️ В меню")
async def back_to_main_menu(message: Message):
    await message.answer("🏠 Главное меню", reply_markup=main_menu_keyboard())
