import logging
from aiogram import Router, types, F
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State
from aiogram.types import Message, ReplyKeyboardRemove
from sqlalchemy import select

from database.db import AsyncSessionLocal, User
from keyboards.reply import get_profile_button, get_start_keyboard
from config import config



router = Router()

class AuthStates(StatesGroup):
    choosing = State()
    login = State()
    name = State()
    password = State()
    confirm_password = State()
    
@router.message(F.text == "/start")
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()
    await message.answer(
        "Добро пожаловать! Выберите действие:", 
        reply_markup=get_start_keyboard()
    )
    await state.set_state(AuthStates.choosing)

@router.message(AuthStates.choosing, F.text.in_(["🔐 Войти", "🆕 Зарегистрироваться"]))
async def process_choice(message: Message, state: FSMContext):
    action = "login" if message.text == "🔐 Войти" else "register"
    await state.update_data(action=action)
    await message.answer(
        "Введите логин:" if action == "login" else "Введите желаемый логин:",
        reply_markup=ReplyKeyboardRemove()
    )
    await state.set_state(AuthStates.login)

@router.message(AuthStates.login)
async def process_login(message: Message, state: FSMContext):
    login = message.text.strip()
    if len(login) < 4:
        await message.answer("❌ Логин должен быть не менее 4 символов. Попробуйте еще:")
        return

    async with AsyncSessionLocal() as db:
        stmt = select(User).where(User.login == login)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        data = await state.get_data()

        if data["action"] == "login":
            if not user:
                await message.answer("❌ Пользователь не найден. Начните снова /start")
                await state.clear()
                return
            await state.update_data(login=login)
            await message.answer("Введите пароль:")
            await state.set_state(AuthStates.password)
        else:  # register
            if user:
                await message.answer("❌ Этот логин уже занят. Попробуйте другой:")
                return
            await state.update_data(login=login)
            await message.answer("Введите ваше имя:")
            await state.set_state(AuthStates.name)

@router.message(AuthStates.name)
async def process_name(message: Message, state: FSMContext):
    name = message.text.strip()
    if len(name) < 2:
        await message.answer("❌ Имя должно быть не менее 2 символов. Попробуйте еще:")
        return
    await state.update_data(name=name)
    await message.answer("Придумайте пароль (не менее 6 символов):")
    await state.set_state(AuthStates.password)

@router.message(AuthStates.password)
async def process_password(message: Message, state: FSMContext):
    password = message.text.strip()
    if len(password) < 6:
        await message.answer("❌ Пароль должен быть не менее 6 символов. Попробуйте еще:")
        return
    
    data = await state.get_data()
    if data["action"] == "register":
        await state.update_data(password=password)
        await message.answer("Повторите пароль для подтверждения:")
        await state.set_state(AuthStates.confirm_password)
    else:  # login
        await verify_login(message, state, password)

@router.message(AuthStates.confirm_password)
async def process_confirm_password(message: Message, state: FSMContext):
    data = await state.get_data()
    if message.text != data["password"]:
        await message.answer("❌ Пароли не совпадают. Введите пароль еще раз:")
        await state.set_state(AuthStates.password)
        return
    
    await verify_login(message, state, data["password"], is_register=True)

async def verify_login(message: Message, state: FSMContext, password: str, is_register=False):
    data = await state.get_data()
    async with AsyncSessionLocal() as db:
        try:
            if is_register:
                await register_user(message, state, db, data, password)
            else:
                stmt = select(User).where(User.login == data["login"])
                result = await db.execute(stmt)
                user = result.scalar_one_or_none()
                # ПРОСТОЕ сравнение пароля
                if not user or user.password_hash != password:
                    await message.answer("❌ Неверный логин или пароль. Попробуйте снова /start")
                    return
                await message.answer(
                    f"✅ Добро пожаловать, {user.name}!",
                    reply_markup=get_profile_button()
                )
            await state.clear()
        except Exception as e:
            await message.answer("⚠️ Произошла ошибка. Попробуйте позже")
            logging.error(f"Database error: {e}")
            await state.clear()

async def register_user(message: Message, state: FSMContext, db, data, password):
    login = data["login"]
    logging.info("Начало регистрации пользователя: %s", login)
    try:
        # Проверка на существование telegram_id
        stmt = select(User).where(User.telegram_id == message.from_user.id)
        result = await db.execute(stmt)
        existing_user = result.scalar_one_or_none()
        if existing_user:
            await message.answer("❌ Вы уже зарегистрированы. Используйте другой аккаунт или войдите. (Введите /start чтобы начать заново.)")
            await state.clear()
            return

        # Сохраняем пароль как есть
        new_user = User(
            telegram_id=message.from_user.id,
            login=login,
            name=data["name"],
            password_hash=password
        )
        db.add(new_user)
        await db.commit()
        await message.answer(
            f"✅ Регистрация завершена, {data['name']}!",
            reply_markup=get_profile_button()
        )
        logging.info("Пользователь успешно зарегистрирован: %s", login)
    except Exception as e:
        logging.error("Ошибка при регистрации: %s", e)
        await message.answer("⚠️ Произошла ошибка при регистрации. Попробуйте позже")
        await state.clear()