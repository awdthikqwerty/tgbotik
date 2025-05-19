from aiogram.types import ReplyKeyboardMarkup, KeyboardButton

def reminders_keyboard():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="➕ Добавить")],
            [KeyboardButton(text="➖ Удалить")],
            [KeyboardButton(text="📜 История напоминаний")],
            [KeyboardButton(text="🔙 Назад")],
        ],
        resize_keyboard=True
    )