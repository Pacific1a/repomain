#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Скрипт для отключения технических работ в боте
"""
import sqlite3

# Путь к базе данных
DB_PATH = "tgbot/data/database.db"

def fix_technical_works():
    """Отключает технические работы в боте"""
    try:
        # Подключаемся к БД
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Проверяем текущий статус
        cursor.execute("SELECT status_work FROM storage_settings")
        current_status = cursor.fetchone()
        
        print(f"Current status: {current_status[0]}")
        
        if current_status[0] == "True":
            # Отключаем технические работы
            cursor.execute("UPDATE storage_settings SET status_work = 'False'")
            conn.commit()
            print("SUCCESS: Technical works DISABLED!")
            print("SUCCESS: Bot is now working!")
        else:
            print("INFO: Technical works already disabled")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    print("=" * 50)
    print("Отключение технических работ")
    print("=" * 50)
    fix_technical_works()
    print("=" * 50)
    input("Нажмите Enter для выхода...")
