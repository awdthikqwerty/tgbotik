import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    BOT_TOKEN = os.getenv("BOT_TOKEN", "8184606912:AAGRLmSLG9w66w8XbDzwOGMipre2qHGb810")
    IMAGES_DIR = "img/"
    MAX_PHOTO_SIZE = 30 * 1024 * 1024  # 30MB

config = Config()