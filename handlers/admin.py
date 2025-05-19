from aiogram import F, Router
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery
from aiogram.filters import Command
from database import Database
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State

admin_router = Router()
db = Database()

ADMIN_IDS = [7143841487]  # Замените на ваш Telegram ID

class MuteStates(StatesGroup):
    waiting_for_user_id = State()
    waiting_for_minutes = State()
    waiting_for_reason = State()

def admin_keyboard():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Список пользователей", callback_data="list_users")],
        [InlineKeyboardButton(text="Логи действий", callback_data="action_logs")],
        [InlineKeyboardButton(text="Статистика", callback_data="stats")],
        [InlineKeyboardButton(text="Рассылка", callback_data="broadcast")],
        [InlineKeyboardButton(text="Выдать мут", callback_data="mute_user")],
        [InlineKeyboardButton(text="Снять мут", callback_data="unmute_user")],
    ])

@admin_router.message(F.text == "Admin")
async def admin_panel_keyboard(message: Message):
    if message.from_user.id not in ADMIN_IDS:
        await message.answer("❌ Доступ запрещен!")
        return
    await message.answer("🛠 Панель администратора:", reply_markup=admin_keyboard())

@admin_router.callback_query(F.data == "list_users")
async def list_users(callback: CallbackQuery):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("❌ Доступ запрещен!")
        return
    
    users = db.get_all_users()
    if not users:
        await callback.message.answer("Нет пользователей.")
        return
    
    text = "👥 Список пользователей:\n\n"
    for user in users:
        text += f"ID: {user['id']} | TG: {user['telegram_id']} | Логин: {user['login']} | Имя: {user['name']}\n"
    
    await callback.message.answer(text)
    await callback.answer()

@admin_router.callback_query(F.data == "action_logs")
async def show_logs(callback: CallbackQuery):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("❌ Доступ запрещен!")
        return
    
    logs = db.get_last_logs(10)
    if not logs:
        await callback.message.answer("Логи пусты.")
        await callback.answer()
        return

    text = "📝 Последние действия пользователей:\n"
    for log in logs:
        text += f"Пользователь {log['user_id']} | {log['action']} | {log['timestamp']}\n"
    await callback.message.answer(text)
    await callback.answer()

@admin_router.callback_query(F.data == "stats")
async def show_stats(callback: CallbackQuery):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("❌ Доступ запрещен!")
        return

    total_users = db.count_users()
    online_users = db.count_online_users()
    total_reminders = db.count_reminders()
    text = (
        f"📊 Статистика:\n"
        f"Всего пользователей: {total_users}\n"
        f"Сейчас онлайн: {online_users}\n"
        f"Всего напоминаний: {total_reminders}"
    )
    await callback.message.answer(text)
    await callback.answer()



class BroadcastStates(StatesGroup):
    waiting_for_text = State()

@admin_router.callback_query(F.data == "broadcast")
async def ask_broadcast_text(callback: CallbackQuery, state: FSMContext):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("❌ Доступ запрещен!")
        return
    await callback.message.answer("Введите текст для рассылки всем пользователям:")
    await state.set_state(BroadcastStates.waiting_for_text)
    await callback.answer()

@admin_router.message(BroadcastStates.waiting_for_text)
async def do_broadcast(message: Message, state: FSMContext):
    users = db.get_all_users()
    count = 0
    for user in users:
        try:
            await message.bot.send_message(user['telegram_id'], f"📢 Сообщение от администратора:\n\n{message.text}")
            count += 1
        except Exception:
            continue
    await message.answer(f"✅ Рассылка завершена. Доставлено {count} пользователям.")
    await state.clear()

@admin_router.callback_query(F.data == "mute_user")
async def mute_user_start(callback: CallbackQuery, state: FSMContext):
    await callback.message.answer("Введите ID пользователя для мута:")
    await state.set_state(MuteStates.waiting_for_user_id)
    await callback.answer()

@admin_router.message(MuteStates.waiting_for_user_id)
async def mute_user_minutes(message: Message, state: FSMContext):
    await state.update_data(user_id=message.text.strip())
    await message.answer("На сколько минут выдать мут?")
    await state.set_state(MuteStates.waiting_for_minutes)

@admin_router.message(MuteStates.waiting_for_minutes)
async def mute_user_reason(message: Message, state: FSMContext):
    await state.update_data(minutes=message.text.strip())
    await message.answer("Укажите причину мута:")
    await state.set_state(MuteStates.waiting_for_reason)

@admin_router.message(MuteStates.waiting_for_reason)
async def mute_user_apply(message: Message, state: FSMContext):
    data = await state.get_data()
    try:
        user_id = int(data['user_id'])
        minutes = int(data['minutes'])
        reason = message.text.strip()
        from time import time
        until = int(time()) + minutes * 60
        db.set_mute(user_id, until, reason)
        await message.answer(f"✅ Мут выдан пользователю {user_id} на {minutes} минут. Причина: {reason}")
        db.log_action(user_id, f"Выдан мут на {minutes} минут. Причина: {reason}")
    except Exception as e:
        await message.answer("Ошибка: " + str(e))
    await state.clear()

@admin_router.callback_query(F.data == "unmute_user")
async def unmute_user_start(callback: CallbackQuery, state: FSMContext):
    await callback.message.answer("Введите ID пользователя для снятия мута:")
    await state.set_state(MuteStates.waiting_for_user_id)
    await callback.answer()

@admin_router.message(MuteStates.waiting_for_user_id)
async def unmute_user_apply(message: Message, state: FSMContext):
    try:
        user_id = int(message.text.strip())
        db.remove_mute(user_id)
        await message.answer(f"✅ Мут снят с пользователя {user_id}.")
        db.log_action(user_id, "Снят мут")
    except Exception as e:
        await message.answer("Ошибка: " + str(e))
    await state.clear()