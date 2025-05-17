import os
import logging
import random
from sqlalchemy import select
from aiogram import Router, types, F, Bot
from aiogram.types import CallbackQuery, FSInputFile, InputMediaPhoto, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from pathlib import Path

from database.db import AsyncSessionLocal, User
from config import config
router = Router()

# Глобальный словарь для соответствия: user_id -> {rand_code: file_path}
delete_photo_map = {}

def get_profile_inline_buttons(photos_count: int):
    buttons = []
    if photos_count < 3:
        buttons.append([InlineKeyboardButton(text="➕ Загрузить фото", callback_data="upload_photo")])
    buttons.append([InlineKeyboardButton(text="🚪 Выйти", callback_data="logout")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_delete_photo_keyboard(user_id: int, photo_path: str):
    rand_code = str(random.randint(10000, 99999))
    # Сохраняем соответствие для пользователя
    if user_id not in delete_photo_map:
        delete_photo_map[user_id] = {}
    delete_photo_map[user_id][rand_code] = photo_path
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🗑 Удалить это фото", callback_data=f"delete_photo:{rand_code}")]
        ]
    )

@router.message(F.text == "📄 Профиль")
async def show_profile(message: types.Message):
    async with AsyncSessionLocal() as db:
        try:
            stmt = select(User).where(User.telegram_id == message.from_user.id)
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()
            if not user:
                await message.answer("Вы не авторизованы. /start")
                return

            photos = get_user_photos(message.from_user.id)
            photos_count = len(photos)
            # Сначала отправляем фото
            for photo in photos[:3]:
                try:
                    await message.answer_photo(
                        FSInputFile(photo),
                        caption="Фото",
                        reply_markup=get_delete_photo_keyboard(message.from_user.id, photo)
                    )
                except Exception as e:
                    logging.error(f"Ошибка при отправке фото {photo}: {e}")
                    await message.answer(f"⚠️ Не удалось отправить фото.")
            # Потом отправляем текст профиля с кнопками
            text = (
                f"👤 Профиль\n\n"
                f"Имя: {user.name}\n"
                f"Логин: {user.login}\n"
                f"Фотографии: {photos_count}"
            )
            await message.answer(text, reply_markup=get_profile_inline_buttons(photos_count))
        except Exception as e:
            logging.error(f"Ошибка при загрузке профиля: {e}")
            await message.answer("⚠️ Ошибка при загрузке профиля")
            await message.answer("Попробуйте позже.")

def get_user_photos(user_id: int):
    user_folder = Path(config.IMAGES_DIR) / str(user_id)
    if user_folder.exists():
        # Поддержка jpg, png, gif
        files = []
        for ext in ("*.jpg", "*.png", "*.gif"):
            files.extend(user_folder.glob(ext))
        return sorted([str(p) for p in files if p.is_file()])
    return []

@router.callback_query(F.data == "upload_photo")
async def upload_photo_prompt(callback: CallbackQuery):
    photos = get_user_photos(callback.from_user.id)
    if len(photos) >= 3:
        await callback.message.answer("❌ Можно загрузить не более 3 фото.")
        return
    await callback.message.answer("Отправьте фото (до 30MB):")

@router.message(F.content_type == types.ContentType.PHOTO)
async def handle_photo_upload(message: types.Message, bot: Bot):
    photos = get_user_photos(message.from_user.id)
    if len(photos) >= 3:
        await message.answer("❌ Можно загрузить не более 3 фото.")
        return

    photo = message.photo[-1]
    if photo.file_size > config.MAX_PHOTO_SIZE:
        await message.answer("❌ Файл слишком большой (макс 30MB).")
        return

    user_folder = Path(config.IMAGES_DIR) / str(message.from_user.id)
    user_folder.mkdir(exist_ok=True, parents=True)

    file_path = user_folder / f"{photo.file_id}.jpg"

    file = await bot.get_file(photo.file_id)
    await bot.download_file(file.file_path, destination=file_path)

    await message.answer("✅ Фото загружено!")
    # Показываем профиль после загрузки
    await show_profile(message)

@router.callback_query(F.data.startswith("delete_photo:"))
async def delete_selected_photo(callback: CallbackQuery):
    rand_code = callback.data.split(":", 1)[1]
    user_id = callback.from_user.id
    photo_path = delete_photo_map.get(user_id, {}).pop(rand_code, None)
    if photo_path and Path(photo_path).exists():
        Path(photo_path).unlink()
        await callback.message.answer("🗑 Фото удалено")
    else:
        await callback.message.answer("Фото не найдено")
    # Показываем профиль после удаления
    class DummyMessage:
        from_user = callback.from_user
        async def answer(self, *args, **kwargs): pass
    await show_profile(DummyMessage())

@router.callback_query(F.data == "logout")
async def logout_user(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await callback.message.answer(
        "Вы вышли из аккаунта.", 
        reply_markup=types.ReplyKeyboardRemove()
    )
    await callback.message.answer(
        "Введите /start чтобы начать заново."
    )