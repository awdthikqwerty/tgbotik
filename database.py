# database.py
import os
import sqlite3
import logging
from datetime import datetime, timedelta
from config import DATABASE_PATH, IMAGES_DIR
from pathlib import Path
import pytz
import random

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        try:
            self.conn = sqlite3.connect(DATABASE_PATH)
            self.cur = self.conn.cursor()
            logger.info(f"Successfully connected to database: {DATABASE_PATH}")
            self._create_tables()
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            raise

    def _create_tables(self):
        self.cur.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER UNIQUE,
                login TEXT UNIQUE,
                name TEXT,
                password TEXT,
                is_logged_in INTEGER DEFAULT 0
            )
        ''')
        self.cur.execute('''
            CREATE TABLE IF NOT EXISTS user_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT,
                timestamp TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        ''')
        self.cur.execute('''
            CREATE TABLE IF NOT EXISTS reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                telegram_id INTEGER,
                datetime TEXT,
                description TEXT,
                is_completed INTEGER DEFAULT 0,
                repeat_after_10min INTEGER DEFAULT 0,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        ''')
        self.cur.execute('''
            CREATE TABLE IF NOT EXISTS mutes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                until INTEGER,
                reason TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        ''')
        self.cur.execute('''
            CREATE TABLE IF NOT EXISTS user_activity (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                reminders_count INTEGER DEFAULT 0,
                photos_uploaded INTEGER DEFAULT 0,
                weather_checks INTEGER DEFAULT 0,
                total_activity INTEGER DEFAULT 0
            )
        ''')
        self.conn.commit()

    def create_user(self, telegram_id: int, login: str, name: str, password: str) -> bool:
        try:
            self.cur.execute(
                "INSERT INTO users (telegram_id, login, name, password, is_logged_in) "
                "VALUES (?, ?, ?, ?, 1)",
                (telegram_id, login, name, password)
            )
            self.conn.commit()
            return True
        except sqlite3.IntegrityError as e:
            logger.error(f"User creation error: {e}")
            return False

    def get_user_by_telegram_id(self, telegram_id: int) -> dict | None:
        self.cur.execute("SELECT * FROM users WHERE telegram_id = ?", (telegram_id,))
        result = self.cur.fetchone()
        if result:
            columns = [column[0] for column in self.cur.description]
            return dict(zip(columns, result))
        return None

    def get_user_by_login(self, login: str) -> dict | None:
        self.cur.execute("SELECT * FROM users WHERE login = ?", (login,))
        result = self.cur.fetchone()
        if result:
            columns = [column[0] for column in self.cur.description]
            return dict(zip(columns, result))
        return None

    def update_login_status(self, telegram_id: int, status: int) -> None:
        self.cur.execute(
            "UPDATE users SET is_logged_in = ? WHERE telegram_id = ?",
            (status, telegram_id)
        )
        self.conn.commit()

    # Методы для работы с напоминаниями
    def create_reminder(self, user_id: int, telegram_id: int, datetime_str: str, description: str, repeat: bool) -> int:
        self.cur.execute(
            "INSERT INTO reminders (user_id, telegram_id, datetime, description, repeat_after_10min) "
            "VALUES (?, ?, ?, ?, ?)",
            (user_id, telegram_id, datetime_str, description, int(repeat))
        )
        self.conn.commit()
        return self.cur.lastrowid

    def get_active_reminders(self, user_id: int) -> list:
        self.cur.execute(
            "SELECT * FROM reminders WHERE user_id = ? AND is_completed = 0 ORDER BY datetime",
            (user_id,)
        )
        columns = [column[0] for column in self.cur.description]
        return [dict(zip(columns, row)) for row in self.cur.fetchall()]

    def get_all_reminders(self, user_id: int) -> list:
        self.cur.execute(
            "SELECT * FROM reminders WHERE user_id = ? ORDER BY datetime DESC",
            (user_id,)
        )
        columns = [column[0] for column in self.cur.description]
        return [dict(zip(columns, row)) for row in self.cur.fetchall()]

    def delete_reminder(self, reminder_id: int, user_id: int) -> bool:
        self.cur.execute(
            "DELETE FROM reminders WHERE id = ? AND user_id = ?",
            (reminder_id, user_id)
        )
        self.conn.commit()
        return self.cur.rowcount > 0

    def mark_reminder_completed(self, reminder_id: int) -> None:
        self.cur.execute(
            "UPDATE reminders SET is_completed = 1 WHERE id = ?",
            (reminder_id,)
        )
        self.conn.commit()

    # Методы для работы с фотографиями
    def get_user_photo_dir(self, telegram_id: int) -> Path:
        user_dir = IMAGES_DIR / str(telegram_id)
        user_dir.mkdir(exist_ok=True)
        return user_dir

    def save_user_photo(self, telegram_id: int, file_bytes: bytes) -> str:
        user_dir = self.get_user_photo_dir(telegram_id)
        photos = self.get_user_photos(telegram_id, only_active=True)
        if len(photos) >= 3:
            return None
        # Генерируем уникальное имя (до 5 цифр)
        for _ in range(10):
            rand_num = random.randint(10000, 99999)
            filename = user_dir / f"{rand_num}.jpg"
            if not filename.exists():
                with open(filename, "wb") as f:
                    f.write(file_bytes)
                return str(filename)
        return None  # Если не удалось подобрать имя

    def get_user_photos(self, telegram_id: int, only_active=True) -> list:
        user_dir = self.get_user_photo_dir(telegram_id)
        if only_active:
            # Только не удалённые (не начинаются с delete)
            photos = sorted([
                f for f in user_dir.iterdir()
                if f.is_file() and f.suffix in ['.jpg', '.jpeg', '.png'] and not f.stem.startswith('delete')
            ], key=lambda x: x.stat().st_mtime)
        else:
            # Все фото
            photos = sorted([
                f for f in user_dir.iterdir()
                if f.is_file() and f.suffix in ['.jpg', '.jpeg', '.png']
            ], key=lambda x: x.stat().st_mtime)
        return photos

    def delete_user_photo(self, telegram_id: int, idx: int) -> bool:
        """
        idx — порядковый номер фото (0, 1, 2 ...)
        """
        user_dir = self.get_user_photo_dir(telegram_id)
        photos = self.get_user_photos(telegram_id, only_active=True)
        if idx < 0 or idx >= len(photos):
            return False
        photo_path = photos[idx]
        # Найти следующий свободный номер для deleteN.jpg
        n = 1
        while True:
            deleted_path = user_dir / f"delete{n}.jpg"
            if not deleted_path.exists():
                break
            n += 1
        try:
            photo_path.rename(deleted_path)
            return True
        except Exception:
            return False

    def count_user_photos(self, telegram_id: int) -> int:
        return len(self.get_user_photos(telegram_id, only_active=True))

    # Методы для фоновых задач
    def get_pending_reminders(self) -> list:
        POLAND_TZ = pytz.timezone("Europe/Warsaw")
        now = datetime.now(POLAND_TZ).strftime("%H:%M %d.%m.%Y")
        self.cur.execute(
            "SELECT * FROM reminders WHERE datetime <= ? AND is_completed = 0",
            (now,)
        )
        columns = [column[0] for column in self.cur.description]
        return [dict(zip(columns, row)) for row in self.cur.fetchall()]

    def update_reminder_time(self, reminder_id: int) -> None:
        new_time = (datetime.now() + timedelta(minutes=10)).strftime("%H:%M %d.%m.%Y")
        self.cur.execute(
            "UPDATE reminders SET datetime = ? WHERE id = ?",
            (new_time, reminder_id)
        )
        self.conn.commit()


    def get_user_stats(self, user_id: int) -> dict:
        """Получение статистики пользователя"""
        self.cur.execute("SELECT COUNT(*) FROM reminders WHERE user_id = ?", (user_id,))
        total_reminders = self.cur.fetchone()[0]
        self.cur.execute("SELECT COUNT(*) FROM reminders WHERE user_id = ? AND is_completed = 1", (user_id,))
        completed_reminders = self.cur.fetchone()[0]
        # Получаем telegram_id по user_id
        self.cur.execute("SELECT telegram_id FROM users WHERE id = ?", (user_id,))
        telegram_id_row = self.cur.fetchone()
        telegram_id = telegram_id_row[0] if telegram_id_row else None
        return {
            'total_reminders': total_reminders,
            'completed_reminders': completed_reminders,
            'photos_count': self.count_user_photos(telegram_id) if telegram_id else 0
        }

    def log_action(self, user_id: int, action: str):
        """Логирование действий пользователя"""
        self.cur.execute(
            "INSERT INTO user_logs (user_id, action, timestamp) VALUES (?, ?, datetime('now'))",
            (user_id, action)
        )
        self.conn.commit()

    def get_all_users(self):
        """Получение списка всех пользователей (для админки)"""
        self.cur.execute("SELECT id, telegram_id, login, name FROM users")
        columns = [column[0] for column in self.cur.description]
        return [dict(zip(columns, row)) for row in self.cur.fetchall()]

    def set_mute(self, user_id: int, until_timestamp: int, reason: str):
        self.cur.execute(
            "INSERT OR REPLACE INTO mutes (user_id, until, reason) VALUES (?, ?, ?)",
            (user_id, until_timestamp, reason)
        )
        self.conn.commit()

    def get_mute(self, user_id: int):
        self.cur.execute(
            "SELECT until, reason FROM mutes WHERE user_id = ?",
            (user_id,)
        )
        row = self.cur.fetchone()
        if row:
            return {"until": row[0], "reason": row[1]}
        return None

    def remove_mute(self, user_id: int):
        self.cur.execute(
            "DELETE FROM mutes WHERE user_id = ?",
            (user_id,)
        )
        self.conn.commit()

    def get_last_logs(self, limit=10):
        self.cur.execute(
            "SELECT user_id, action, timestamp FROM user_logs ORDER BY id DESC LIMIT ?",
            (limit,)
        )
        columns = [column[0] for column in self.cur.description]
        return [dict(zip(columns, row)) for row in self.cur.fetchall()]

    def count_users(self):
        self.cur.execute("SELECT COUNT(*) FROM users")
        return self.cur.fetchone()[0]

    def count_online_users(self):
        self.cur.execute("SELECT COUNT(*) FROM users WHERE is_logged_in = 1")
        return self.cur.fetchone()[0]

    def count_reminders(self):
        self.cur.execute("SELECT COUNT(*) FROM reminders")
        return self.cur.fetchone()[0]

    def ensure_user_activity(self, user_id: int, username: str):
        self.cur.execute(
            "INSERT OR IGNORE INTO user_activity (user_id, username) VALUES (?, ?)",
            (user_id, username)
        )
        self.conn.commit()

    def inc_activity(self, user_id: int, username: str, field: str):
        self.ensure_user_activity(user_id, username)
        self.cur.execute(
            f"UPDATE user_activity SET {field} = {field} + 1, total_activity = reminders_count + photos_uploaded + weather_checks WHERE user_id = ?",
            (user_id,)
        )
        self.conn.commit()

    def get_top_users(self, limit=10):
        self.cur.execute('''
            SELECT username, reminders_count, photos_uploaded, weather_checks, total_activity
            FROM user_activity
            ORDER BY total_activity DESC
            LIMIT ?
        ''', (limit,))
        return self.cur.fetchall()
