from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

def get_profile_inline_buttons():
    buttons = [
        [InlineKeyboardButton(text="📤 Загрузить фото", callback_data="upload_photo")],
        [InlineKeyboardButton(text="🗑 Удалить фото", callback_data="delete_photo")],
        [InlineKeyboardButton(text="🚪 Выйти", callback_data="logout")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)