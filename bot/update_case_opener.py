#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Обновляет case-opener.js чтобы использовать локальные пути
вместо GitHub URL
"""

import re
from pathlib import Path

def update_case_opener():
    """Обновляет пути в case-opener.js"""
    js_file = Path(__file__).parent / 'main' / 'case-opener.js'
    
    print('Reading case-opener.js...')
    with open(js_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Замена 1: Case-tokens (рубли, spin)
    content = re.sub(
        r'https://raw\.githubusercontent\.com/Pacific1a/img/main/main/Case-tokens/([^/]+)/(\d+-r-[^.]+\.png)',
        r'main/prizes/Case-tokens/\1/\2',
        content
    )
    
    # Замена 2: prewiew-tokens (рубли, preview)
    content = re.sub(
        r'https://raw\.githubusercontent\.com/Pacific1a/img/main/main/prewiew-tokens/purple/(\d+-r-[^.]+\.png)',
        r'main/prizes/prewiew-tokens/purple/\1',
        content
    )
    
    # Замена 3: win-tokens (рубли, win)
    content = re.sub(
        r'https://raw\.githubusercontent\.com/Pacific1a/img/main/main/win-tokens/([^/]+)/(\d+-r-[^.]+\.png)',
        r'main/prizes/win-tokens/\1/\2',
        content
    )
    
    # Замена 4: Chips-case (фишки, spin)
    content = re.sub(
        r'https://raw\.githubusercontent\.com/Pacific1a/img/main/main/Chips-case/([^/]+)/(\d+-chips-[^.]+\.png)',
        r'main/prizes/Chips-case/\1/\2',
        content
    )
    
    # Замена 5: preview-chips (фишки, preview)
    content = re.sub(
        r'https://raw\.githubusercontent\.com/Pacific1a/img/main/main/preview-chips/(\d+-chips-[^.]+\.png)',
        r'main/prizes/preview-chips/\1',
        content
    )
    
    # Замена 6: Win-chips (фишки, win)
    content = re.sub(
        r'https://raw\.githubusercontent\.com/Pacific1a/img/main/main/Win-chips/(\d+-chips-[^.]+\.png)',
        r'main/prizes/Win-chips/\1',
        content
    )
    
    if content == original:
        print('[WARNING] No changes made - paths already local or pattern mismatch')
        return False
    
    # Сохраняем
    print('Writing updated case-opener.js...')
    with open(js_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Считаем сколько замен сделали
    github_urls = len(re.findall(r'https://raw\.githubusercontent\.com/Pacific1a/img', content))
    
    print(f'\n[SUCCESS] case-opener.js updated!')
    print(f'Remaining GitHub URLs: {github_urls}')
    
    if github_urls > 0:
        print(f'[INFO] Some URLs still point to GitHub (non-prize images)')
    
    return True

def main():
    print('=' * 60)
    print('UPDATING CASE-OPENER.JS TO USE LOCAL PATHS')
    print('=' * 60)
    print()
    
    if update_case_opener():
        print('\n[DONE] Now you can commit and push changes!')
    else:
        print('\n[SKIPPED] No updates needed')

if __name__ == '__main__':
    main()
