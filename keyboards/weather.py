from aiogram.types import ReplyKeyboardMarkup, KeyboardButton

def weather_keyboard():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🌦️ Узнать погоду")],
            [KeyboardButton(text="🌤️ Погода на завтра")],
            [KeyboardButton(text="🔙 Назад")],
        ],
        resize_keyboard=True
    )