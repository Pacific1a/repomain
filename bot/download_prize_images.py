#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для скачивания ВСЕХ картинок призов локально
Скачивает из GitHub в bot/main/prizes/
"""

import os
import re
import urllib.request
from pathlib import Path
from urllib.parse import urlparse
import time

def download_file(url, local_path):
    """Скачивает файл с прогрессом"""
    try:
        # Создаем папки если нужно
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        # Скачиваем
        urllib.request.urlretrieve(url, local_path)
        return True
    except Exception as e:
        print(f'[ERROR] Failed to download {url}: {e}')
        return False

def extract_urls_from_js():
    """Извлекает все URL картинок из case-opener.js"""
    js_file = Path(__file__).parent / 'main' / 'case-opener.js'
    
    with open(js_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Паттерны для поиска URL
    patterns = [
        r'https://raw\.githubusercontent\.com/Pacific1a/img/main/main/([^"\']+)',
        r'https://github\.com/Pacific1a/img/blob/main/main/([^"\']+)',
    ]
    
    urls = set()
    for pattern in patterns:
        matches = re.findall(pattern, content)
        for match in matches:
            # Нормализуем URL
            if 'github.com' in pattern:
                url = f'https://raw.githubusercontent.com/Pacific1a/img/main/main/{match}'
            else:
                url = f'https://raw.githubusercontent.com/Pacific1a/img/main/main/{match}'
            
            # Удаляем ?raw=true и прочее
            url = url.split('?')[0]
            urls.add((url, match))
    
    return urls

def generate_all_prize_urls():
    """Генерирует ВСЕ возможные URL картинок призов"""
    base_url = 'https://raw.githubusercontent.com/Pacific1a/img/main/main'
    
    urls = []
    
    # Призы за рубли
    rubles_prizes = [5000, 4000, 3000, 2500, 2000, 1500, 1000, 888, 777, 700, 500, 400, 350, 300, 250, 200, 150, 100, 50]
    rubles_colors = {
        5000: ['red'],
        4000: ['blue'],
        3000: ['blue'],
        2500: ['red', 'blue'],
        2000: ['red', 'blue', 'purple'],
        1500: ['red', 'blue', 'purple'],
        1000: ['yellow', 'blue', 'purple'],
        888: ['yellow', 'blue', 'purple'],
        777: ['yellow', 'blue', 'purple'],
        700: ['yellow', 'gray', 'purple'],
        500: ['yellow', 'gray', 'purple'],
        400: ['yellow', 'gray', 'purple'],
        350: ['yellow', 'gray'],
        300: ['yellow', 'gray'],
        250: ['yellow', 'gray'],
        200: ['gray'],
        150: ['gray'],
        100: ['gray'],
        50: ['gray']
    }
    
    # Призы за фишки
    chips_prizes = [5005, 4004, 3003, 2505, 2002, 1505, 1001, 880, 777, 707, 505, 404, 303, 255, 202, 155, 101, 50]
    chips_colors = {
        5005: ['red'],
        4004: ['red'],
        3003: ['blue', 'red'],
        2505: ['blue', 'purple', 'red'],
        2002: ['blue', 'purple', 'red'],
        1505: ['blue'],
        1001: ['blue', 'purple', 'yellow'],
        880: ['purple'],
        777: ['purple', 'yellow'],
        707: ['purple', 'yellow'],
        505: ['gray', 'yellow'],
        404: ['gray', 'yellow'],
        303: ['gray', 'yellow'],
        255: ['gray', 'yellow'],
        202: ['gray'],
        155: ['gray'],
        101: ['gray'],
        50: ['gray']
    }
    
    # Генерируем URL для рублей
    for prize in rubles_prizes:
        for color in rubles_colors.get(prize, ['gray']):
            # Для preview используем puple (с опечаткой) для purple
            preview_color = 'puple' if color == 'purple' else color
            
            urls.append((
                f'{base_url}/Case-tokens/{color}/{prize}-r-{color}.png',
                f'Case-tokens/{color}/{prize}-r-{color}.png'
            ))
            urls.append((
                f'{base_url}/prewiew-tokens/purple/{prize}-r-{preview_color}.png',
                f'prewiew-tokens/purple/{prize}-r-{preview_color}.png'
            ))
            urls.append((
                f'{base_url}/win-tokens/{color}/{prize}-r-{color}.png',
                f'win-tokens/{color}/{prize}-r-{color}.png'
            ))
    
    # Генерируем URL для фишек
    for prize in chips_prizes:
        for color in chips_colors.get(prize, ['gray']):
            urls.append((
                f'{base_url}/Chips-case/{color}/{prize}-chips-{color}.png',
                f'Chips-case/{color}/{prize}-chips-{color}.png'
            ))
            urls.append((
                f'{base_url}/preview-chips/{prize}-chips-{color}-preview.png',
                f'preview-chips/{prize}-chips-{color}-preview.png'
            ))
            urls.append((
                f'{base_url}/Win-chips/{prize}-chips-{color}.png',
                f'Win-chips/{prize}-chips-{color}.png'
            ))
    
    return urls

def main():
    """Основная функция"""
    print('=' * 60)
    print('DOWNLOADING PRIZE IMAGES LOCALLY')
    print('=' * 60)
    
    # Папка для сохранения
    bot_dir = Path(__file__).parent
    prizes_dir = bot_dir / 'main' / 'prizes'
    prizes_dir.mkdir(parents=True, exist_ok=True)
    
    print(f'\nDestination: {prizes_dir}')
    
    # Генерируем все URL
    print('\nGenerating prize URLs...')
    urls = generate_all_prize_urls()
    
    print(f'Total images to download: {len(urls)}')
    print('\nStarting download...\n')
    
    # Скачиваем
    success = 0
    failed = 0
    skipped = 0
    
    for i, (url, local_path) in enumerate(urls, 1):
        full_path = prizes_dir / local_path
        
        # Пропускаем если уже есть
        if full_path.exists():
            skipped += 1
            if i % 20 == 0:
                print(f'[{i}/{len(urls)}] Progress: {success} ok, {failed} failed, {skipped} skipped')
            continue
        
        # Скачиваем
        if download_file(url, str(full_path)):
            success += 1
            print(f'[{i}/{len(urls)}] Downloaded: {local_path}')
        else:
            failed += 1
        
        # Небольшая пауза чтобы не перегружать GitHub
        time.sleep(0.1)
    
    print('\n' + '=' * 60)
    print('DOWNLOAD COMPLETE')
    print('=' * 60)
    print(f'Success: {success}')
    print(f'Failed: {failed}')
    print(f'Skipped (already exists): {skipped}')
    print(f'\nImages saved to: {prizes_dir}')
    
    if failed > 0:
        print(f'\n[WARNING] {failed} images failed to download')
        print('You can re-run the script to retry failed downloads')
    else:
        print('\n[SUCCESS] All images downloaded successfully!')
        print('\nNext step: Run update_case_opener.py to update paths in code')

if __name__ == '__main__':
    main()
