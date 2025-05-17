import asyncio
import logging
from datetime import datetime, timedelta
from aiogram import F, Router, types
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State
from aiogram import Bot
from database import Database
from keyboards.reminders import reminders_keyboard
from keyboards.auth_menu import auth_menu_keyboard
from keyboards.main_menu import main_menu_keyboard

logger = logging.getLogger(__name__)

reminders_router = Router()
db = Database()

class AddReminderStates(StatesGroup):
    datetime = State()
    description = State()
    repeat = State()
    waiting_for_reminder_delete = State()  # <--- добавь это!

@reminders_router.message(F.text == "🔔 Напоминания")
async def show_reminders_menu(message: Message):
    user = db.get_user_by_telegram_id(message.from_user.id)
    if not user or not user.get('is_logged_in'):
        await message.answer("❌ Сначала войдите в систему!", reply_markup=auth_menu_keyboard())
        return
    await message.answer("📌 Управление напоминаниями:", reply_markup=reminders_keyboard())

@reminders_router.callback_query(F.data == "add_reminder")
async def start_add_reminder(callback: types.CallbackQuery, state: FSMContext):
    await state.set_state(AddReminderStates.datetime)
    await callback.message.answer("📅 Введите дату и время в формате HH:MM DD.MM.YYYY:")
    await callback.answer()

@reminders_router.message(F.text == "➕ Добавить")
async def start_add_reminder(message: Message, state: FSMContext):
    user = db.get_user_by_telegram_id(message.from_user.id)
    if not user or not user.get('is_logged_in'):
        await message.answer("❌ Сначала войдите в систему!", reply_markup=auth_menu_keyboard())
        return
    await state.set_state(AddReminderStates.datetime)
    await message.answer("📅 Введите дату и время в формате HH:MM DD.MM.YYYY:")

@reminders_router.message(AddReminderStates.datetime)
async def process_reminder_datetime(message: Message, state: FSMContext):
    try:
        datetime.strptime(message.text, "%H:%M %d.%m.%Y")
        await state.update_data(datetime=message.text)
        await state.set_state(AddReminderStates.description)
        await message.answer("📝 Введите описание напоминания:")
    except ValueError:
        await message.answer("⚠️ Неверный формат даты. Попробуйте снова:")

@reminders_router.message(AddReminderStates.description)
async def process_reminder_description(message: Message, state: FSMContext):
    await state.update_data(description=message.text)
    await state.set_state(AddReminderStates.repeat)
    await message.answer("🔄 Повторить через 10 минут? (Да/Нет)")

@reminders_router.message(AddReminderStates.repeat)
async def process_reminder_repeat(message: Message, state: FSMContext):
    repeat = message.text.lower() in ['да', 'yes']
    data = await state.get_data()
    user = db.get_user_by_telegram_id(message.from_user.id)
    reminder_id = db.create_reminder(
        user_id=user['id'],
        datetime_str=data['datetime'],
        description=data['description'],
        repeat=repeat
    )
    await message.answer(f"✅ Напоминание #{reminder_id} создано!")
    await state.clear()

@reminders_router.message(F.text == "📜 История напоминаний")
async def show_reminders_history(message: Message):
    user = db.get_user_by_telegram_id(message.from_user.id)
    if not user or not user.get('is_logged_in'):
        await message.answer("❌ Сначала войдите в систему!", reply_markup=auth_menu_keyboard())
        return

    reminders = db.get_all_reminders(user['id'])
    if not reminders:
        await message.answer("История пуста.")
        return

    text = "🕓 История напоминаний:\n"
    for r in reminders:
        text += f"#{r['id']} | {r['datetime']} | {r['description']} | {'✅' if r['is_completed'] else '⏳'}\n"
    await message.answer(text)

@reminders_router.message(F.text == "➖ Удалить")
async def ask_which_reminder_delete(message: Message, state: FSMContext):
    user = db.get_user_by_telegram_id(message.from_user.id)
    if not user or not user.get('is_logged_in'):
        await message.answer("❌ Сначала войдите в систему!", reply_markup=auth_menu_keyboard())
        return

    reminders = db.get_all_reminders(user['id'])
    if not reminders:
        await message.answer("Нет напоминаний для удаления.")
        return

    text = "Выберите номер напоминания для удаления:\n"
    for r in reminders:
        text += f"#{r['id']} | {r['datetime']} | {r['description']}\n"
    text += "\nНапиши номер напоминания (например: 5):"
    await state.set_state(AddReminderStates.waiting_for_reminder_delete)
    await message.answer(text)

@reminders_router.message(AddReminderStates.waiting_for_reminder_delete)
async def delete_reminder_by_id(message: Message, state: FSMContext):
    user = db.get_user_by_telegram_id(message.from_user.id)
    if not user or not user.get('is_logged_in'):
        await message.answer("❌ Сначала войдите в систему!", reply_markup=auth_menu_keyboard())
        await state.clear()
        return

    try:
        reminder_id = int(message.text.strip())
    except ValueError:
        await message.answer("Введите корректный номер напоминания!")
        return

    if db.delete_reminder(reminder_id, user['id']):
        await message.answer(f"✅ Напоминание #{reminder_id} удалено.")
    else:
        await message.answer("❌ Напоминание не найдено или не ваше.")
    await state.clear()

@reminders_router.message(F.text == "🔙 Назад")
async def back_to_main_menu(message: Message):
    await message.answer("🏠 Главное меню", reply_markup=main_menu_keyboard())

# Фоновая задача для проверки напоминаний
async def check_reminders(bot: Bot):
    while True:
        try:
            now = datetime.now()
            reminders = db.get_pending_reminders()
            
            for reminder in reminders:
                await bot.send_message(
                    chat_id=reminder['user_id'],
                    text=f"🔔 Напоминание: {reminder['description']}"
                )
                db.mark_reminder_completed(reminder['id'])
                
                if reminder['repeat_after_10min']:
                    db.update_reminder_time(reminder['id'])
                    new_time = (now + timedelta(minutes=10)).strftime("%H:%M %d.%m.%Y")
                    await bot.send_message(
                        chat_id=reminder['user_id'],
                        text=f"🔄 Напоминание повторено на {new_time}"
                    )
            
            await asyncio.sleep(60)
            
        except Exception as e:
            logger.error(f"Reminder error: {e}")
            await asyncio.sleep(10)