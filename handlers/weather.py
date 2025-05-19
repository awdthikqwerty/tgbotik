from aiogram import F, Router, types
from aiogram.fsm.context import FSMContext
import requests
from keyboards.weather import weather_keyboard
from keyboards.main_menu import main_menu_keyboard
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

weather_router = Router()

OPENWEATHER_API_KEY = "e5069908d310306747d9e153c3c5ac30"
CITY_ID = "3102627"

def get_weather(city_id=CITY_ID):
    url = f"http://api.openweathermap.org/data/2.5/weather?id={city_id}&appid={OPENWEATHER_API_KEY}&units=metric&lang=ru"
    response = requests.get(url)
    data = response.json()
    if "main" not in data:
        return "❌ Не удалось получить данные о погоде."
    temperature = data['main']['temp']
    wind_speed = data['wind']['speed']
    humidity = data['main']['humidity']
    weather_description = data['weather'][0]['description']
    city_name = data.get('name', 'Город')
    return (
        f"📍 Погода в городе {city_name}\n\n"
        f"🌡 Температура: {temperature} °C\n"
        f"💨 Ветер: {wind_speed} м/с\n"
        f"💧 Влажность: {humidity}%\n"
        f"🌥 Состояние: {weather_description.capitalize()}"
    )

def get_tomorrow_hours_keyboard(city_id=CITY_ID):
    import datetime
    url = f"http://api.openweathermap.org/data/2.5/forecast?id={city_id}&appid={OPENWEATHER_API_KEY}&units=metric&lang=ru"
    response = requests.get(url)
    data = response.json()
    if "list" not in data:
        return None, None

    # Найти завтрашнюю дату
    now = datetime.datetime.now()
    tomorrow = (now + datetime.timedelta(days=1)).date()
    hours = []
    hour_map = {}
    for item in data["list"]:
        dt = datetime.datetime.fromtimestamp(item["dt"])
        if dt.date() == tomorrow:
            hour_str = dt.strftime("%H:00")
            hours.append(hour_str)
            hour_map[hour_str] = item

    # Создать inline-клавиатуру
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=hour, callback_data=f"weather_hour_{hour}")]
            for hour in hours
        ]
    )
    return keyboard, hour_map

def get_weather_for_hour(city_id, hour_str):
    import datetime
    url = f"http://api.openweathermap.org/data/2.5/forecast?id={city_id}&appid={OPENWEATHER_API_KEY}&units=metric&lang=ru"
    response = requests.get(url)
    data = response.json()
    if "list" not in data:
        return "❌ Не удалось получить данные о погоде."
    now = datetime.datetime.now()
    tomorrow = (now + datetime.timedelta(days=1)).date()
    for item in data["list"]:
        dt = datetime.datetime.fromtimestamp(item["dt"])
        if dt.date() == tomorrow and dt.strftime("%H:00") == hour_str:
            temperature = item['main']['temp']
            wind_speed = item['wind']['speed']
            humidity = item['main']['humidity']
            weather_description = item['weather'][0]['description']
            city_name = data.get('city', {}).get('name', 'Город')
            return (
                f"📍 Погода в городе {city_name} на {hour_str} завтра\n\n"
                f"🌡 Температура: {temperature} °C\n"
                f"💨 Ветер: {wind_speed} м/с\n"
                f"💧 Влажность: {humidity}%\n"
                f"🌥 Состояние: {weather_description.capitalize()}"
            )
    return "❌ Нет данных на этот час."

def is_logged_in(message):
    from database import Database
    db = Database()
    user = db.get_user_by_telegram_id(message.from_user.id)
    return user and user.get('is_logged_in')

@weather_router.message(F.text == "⛅ Погода")
async def weather_menu(message: types.Message, state: FSMContext):
    if not is_logged_in(message):
        from keyboards.auth_menu import auth_menu_keyboard
        await message.answer("❌ Сначала войдите в систему!", reply_markup=auth_menu_keyboard())
        return
    await state.clear()
    await message.answer("🌦️ Погода — выберите действие:", reply_markup=weather_keyboard())

@weather_router.message(F.text == "🌦️ Узнать погоду")
async def show_weather(message: types.Message):
    if not is_logged_in(message):
        from keyboards.auth_menu import auth_menu_keyboard
        await message.answer("❌ Сначала войдите в систему!", reply_markup=auth_menu_keyboard())
        return
    from database import Database
    db = Database()
    user = db.get_user_by_telegram_id(message.from_user.id)
    if user:
        db.inc_activity(user['id'], user['name'], "weather_checks")  # <--- добавили
    await message.answer(get_weather())

@weather_router.message(F.text == "🌤️ Погода на завтра")
async def show_tomorrow_weather(message: types.Message):
    if not is_logged_in(message):
        from keyboards.auth_menu import auth_menu_keyboard
        await message.answer("❌ Сначала войдите в систему!", reply_markup=auth_menu_keyboard())
        return
    keyboard, hour_map = get_tomorrow_hours_keyboard()
    if not keyboard:
        await message.answer("❌ Не удалось получить прогноз на завтра.")
        return
    await message.answer("Выберите час для прогноза на завтра:", reply_markup=keyboard)

@weather_router.callback_query(F.data.startswith("weather_hour_"))
async def show_weather_for_hour(callback: types.CallbackQuery):
    hour_str = callback.data.replace("weather_hour_", "")
    text = get_weather_for_hour(CITY_ID, hour_str)
    await callback.message.answer(text)
    await callback.answer()

@weather_router.message(F.text == "🔙 Назад")
async def back_to_main_menu(message: types.Message):
    if not is_logged_in(message):
        from keyboards.auth_menu import auth_menu_keyboard
        await message.answer("❌ Сначала войдите в систему!", reply_markup=auth_menu_keyboard())
        return
    await message.answer("🏠 Главное меню", reply_markup=main_menu_keyboard())