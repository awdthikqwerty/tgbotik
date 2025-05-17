from aiogram.types import ReplyKeyboardMarkup, KeyboardButton

def profile_keyboard():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="Загрузить фото")],
            [KeyboardButton(text="Удалить фото")],
            [KeyboardButton(text="Выйти")],  # новая кнопка
            [KeyboardButton(text="⬅️ В меню")],
        ],
        resize_keyboard=True
    )