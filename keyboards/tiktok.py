from aiogram.types import ReplyKeyboardMarkup, KeyboardButton

def tiktok_keyboard():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🔙 Назад")]
        ],
        resize_keyboard=True
    )