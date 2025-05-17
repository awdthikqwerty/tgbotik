from aiogram.types import ReplyKeyboardMarkup, KeyboardButton

def get_start_keyboard():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🔐 Войти"), KeyboardButton(text="🆕 Зарегистрироваться")]
        ],
        resize_keyboard=True,
        one_time_keyboard=True
    )

def get_profile_button():
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="📄 Профиль")]],
        resize_keyboard=True
    )