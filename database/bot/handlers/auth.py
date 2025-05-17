from aiogram import F, Router, types
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State
from database import Database
from keyboards.main_menu import main_menu_keyboard

auth_router = Router()
db = Database()

class AuthStates(StatesGroup):
    waiting_for_login = State()
    waiting_for_password = State()
    waiting_for_name = State()
    waiting_for_new_login = State()
    waiting_for_new_password = State()

def auth_keyboard():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="Войти"), KeyboardButton(text="Регистрация")],
            [KeyboardButton(text="⬅️ В меню")]
        ],
        resize_keyboard=True
    )

@auth_router.message(F.text == "Войти")
async def start_login(message: types.Message, state: FSMContext):
    await state.set_state(AuthStates.waiting_for_login)
    await message.answer("Введите логин:")

@auth_router.message(AuthStates.waiting_for_login)
async def process_login(message: types.Message, state: FSMContext):
    await state.update_data(login=message.text)
    await state.set_state(AuthStates.waiting_for_password)
    await message.answer("Введите пароль:")

@auth_router.message(AuthStates.waiting_for_password)
async def process_password(message: types.Message, state: FSMContext):
    data = await state.get_data()
    user = db.get_user_by_login(data['login'])
    if user and user['password'] == message.text:
        db.update_login_status(message.from_user.id, 1)
        await message.answer(
            "✅ Вход выполнен! Теперь вы можете пользоваться ботом.",
            reply_markup=main_menu_keyboard()
        )
        await state.clear()
    else:
        await message.answer("❌ Неверный логин или пароль. Попробуйте снова или зарегистрируйтесь.")
        await state.clear()

@auth_router.message(F.text == "Регистрация")
async def start_registration(message: types.Message, state: FSMContext):
    await state.set_state(AuthStates.waiting_for_new_login)
    await message.answer("Придумайте логин:")

@auth_router.message(AuthStates.waiting_for_new_login)
async def process_new_login(message: types.Message, state: FSMContext):
    if db.get_user_by_login(message.text):
        await message.answer("❌ Такой логин уже существует. Попробуйте другой.")
        return
    await state.update_data(login=message.text)
    await state.set_state(AuthStates.waiting_for_name)
    await message.answer("Введите ваше имя:")

@auth_router.message(AuthStates.waiting_for_name)
async def process_new_name(message: types.Message, state: FSMContext):
    await state.update_data(name=message.text)
    await state.set_state(AuthStates.waiting_for_new_password)
    await message.answer("Придумайте пароль:")

@auth_router.message(AuthStates.waiting_for_new_password)
async def process_new_password(message: types.Message, state: FSMContext):
    data = await state.get_data()
    success = db.create_user(
        telegram_id=message.from_user.id,
        login=data['login'],
        name=data['name'],
        password=message.text
    )
    if success:
        await message.answer("✅ Регистрация успешна! Теперь войдите в аккаунт.", reply_markup=None)
    else:
        await message.answer("❌ Ошибка регистрации. Попробуйте другой логин.")
    await state.clear()