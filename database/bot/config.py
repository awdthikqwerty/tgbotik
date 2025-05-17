# config.py
import os
from pathlib import Path

TOKEN = "8184606912:AAGRLmSLG9w66w8XbDzwOGMipre2qHGb810"
BASE_DIR = Path(__file__).parent
IMAGES_DIR = BASE_DIR / "images"
DATABASE_DIR = BASE_DIR / "database"
DATABASE_PATH = DATABASE_DIR / "database.sqlite"

# Создаем все необходимые директории
os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(DATABASE_DIR, exist_ok=True)  # Добавляем создание директории для БД