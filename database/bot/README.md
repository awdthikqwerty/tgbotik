# Telegram Bot with aiogram

This project is a Telegram bot built using Python and the aiogram library (v3.x). The bot provides functionalities for user registration, login, profile management, and reminders.

## Project Structure

```
bot/
├── images/                # Directory for storing user-uploaded images
├── database/              # Directory for database files
│   └── bot.db            # SQLite database file
├── main.py                # Entry point of the bot
├── database.py            # Database interaction logic
├── handlers.py            # Command handlers for the bot
├── keyboards.py           # Custom keyboards for the bot
├── config.py              # Configuration settings (e.g., bot token)
└── README.md              # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd bot
   ```

2. **Install dependencies:**
   Make sure you have Python 3.7 or higher installed. Then, install the required packages using pip:
   ```
   pip install aiogram
   ```

3. **Configure the bot:**
   Open `config.py` and set your bot token:
   ```python
   TOKEN = 'YOUR_BOT_TOKEN'
   ```

4. **Run the bot:**
   Execute the following command to start the bot:
   ```
   python main.py
   ```

## Usage

- Start the bot by sending the `/start` command.
- Follow the prompts to register or log in.
- Use the main menu to access your profile or manage reminders.

## Database Structure

The SQLite database (`bot.db`) contains the following tables:

- **users**
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `telegram_id`: INTEGER, unique Telegram user ID
  - `login`: TEXT, unique login
  - `name`: TEXT, user's name
  - `password`: TEXT, user's password
  - `is_logged_in`: INTEGER, indicates if the user is logged in (0 or 1)

- **reminders**
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `user_id`: INTEGER, FOREIGN KEY to users.id
  - `datetime`: TEXT, reminder date and time
  - `description`: TEXT, reminder description
  - `is_completed`: INTEGER, indicates if the reminder is completed (0 or 1)
  - `repeat_after_10min`: INTEGER, indicates if the reminder should repeat after 10 minutes (0 or 1)

## Contributing

Feel free to submit issues or pull requests for improvements or bug fixes.