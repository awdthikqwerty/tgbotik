from aiogram.types import ReplyKeyboardMarkup, KeyboardButton

def auth_menu_keyboard():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="Войти"), KeyboardButton(text="Регистрация")]
        ],
        resize_keyboard=True
    )