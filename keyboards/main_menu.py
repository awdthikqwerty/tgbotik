from aiogram.types import ReplyKeyboardMarkup, KeyboardButton

def main_menu_keyboard(is_admin=False):
    keyboard = [
        [KeyboardButton(text="👤 Профиль"), KeyboardButton(text="🔔 Напоминания")],
        [KeyboardButton(text="📱 Тик Ток"), KeyboardButton(text="⛅ Погода")]
    ]
    if is_admin:
        keyboard.append([KeyboardButton(text="Admin")])
    return ReplyKeyboardMarkup(
        keyboard=keyboard,
        resize_keyboard=True
    )