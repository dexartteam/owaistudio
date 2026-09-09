"""Render the shared navigation into the existing static pages (no build dependencies)."""

from html import escape
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
VERSION = "20260909-menu1"

# Labels and grouping follow the supplied owai_site_light reference.
GROUPS = [
    ("features", "Возможности", [
        ("Тренды", "trends/", "Темы и ракурсы для вашего контента"),
        ("Аватар · карта персонажа", "avatar/", "Карта персонажа и узнаваемый образ"),
        ("Карусели", "carousel/", "Истории, которые хочется листать"),
        ("Посты и картинки", "posts/", "Тексты, подписи и изображения в вашем стиле"),
        ("Экспертные ролики", "expert-videos/", "Ваши мысли, образ и голос"),
    ]),
    ("publishing", "Публикация", [
        ("Автопостинг", "autoposting/", "Выход контента в подключённых соцсетях"),
        ("Отложенные публикации", "scheduled-posts/", "Даты, время и очередь публикаций"),
        ("Какие соцсети поддерживаем", "socials/", "Форматы под каждую площадку"),
    ]),
    ("business", "Для бизнеса", [
        ("ДНК бренда", "b2b/brand-dna/", "Характер, голос и визуальные правила"),
        ("Темы из операционки", "b2b/content-topics/", "События, опыт команды и вопросы клиентов"),
        ("Безопасность данных", "b2b/data-security/", "Согласованные источники и доступы"),
        ("Гиперреалистичный контент", "b2b/realistic-content/", "Свет, фактура и визуальные детали"),
    ]),
]


def render_header(page):
    directory = page.parent.relative_to(PUBLIC)
    depth = len(directory.parts)
    prefix = "../" * depth if depth else "./"
    current = directory.as_posix() + "/" if depth else ""
    parts = [
        '<header class="header unified-header">',
        f'<a class="wordmark" href="{prefix}" aria-label="OWAI — главная">'
        '<span aria-hidden="true">||</span>OWAI</a>',
        '<nav class="navigation unified-nav" id="navigation" aria-label="Главное меню">',
    ]
    for key, label, entries in GROUPS:
        active = any(route == current for _, route, _ in entries)
        active = active or (key == "business" and current == "b2b/")
        active = active or (key == "features" and current == "")
        parts.extend([
            f'<div class="product-menu" data-menu="{key}">',
            f'<div class="product-menu-label" data-active="{str(active).lower()}">',
            f'<button class="menu-category" type="button" data-menu-toggle '
            f'aria-expanded="false" aria-controls="{key}-dropdown">'
            f'{escape(label)}<span class="chevron" aria-hidden="true"></span></button></div>',
            f'<div class="product-dropdown nav-dropdown" id="{key}-dropdown" hidden>',
            '<div class="dropdown-links">',
        ])
        for title, route, description in entries:
            aria = ' aria-current="page"' if route == current else ""
            parts.append(
                f'<a href="{prefix}{route}"{aria}><span><b>{escape(title)}</b>'
                f'<small>{escape(description)}</small></span></a>'
            )
        parts.append('</div>')
        if key == "business":
            aria = ' aria-current="page"' if current == "b2b/" else ""
            parts.append(
                f'<a class="dropdown-overview" href="{prefix}b2b/"{aria}>'
                'OWAI для бизнеса <span aria-hidden="true">↗</span></a>'
            )
        parts.append('</div></div>')
    parts.extend([
        f'<a href="{prefix}#examples">Примеры</a>',
        f'<a href="{prefix}#price">Цены</a>',
        '</nav>',
        '<div class="nav-account">',
        '<a class="nav-signin" href="https://owai.studio/signin">Вход</a>',
        '<a class="nav-start" href="https://owai.studio/signup">Начать</a>',
        '</div>',
        '<button class="menu-toggle" type="button" aria-expanded="false" '
        'aria-controls="navigation" aria-label="Меню">'
        '<span class="menu-toggle-label">Меню</span><span aria-hidden="true">+</span></button>',
        '<noscript><style>'
        '.unified-header{height:auto!important;flex-wrap:wrap;padding-top:16px;padding-bottom:16px}'
        '.unified-header .unified-nav{display:flex!important;position:static!important;'
        'flex-basis:100%;order:3;max-height:none;flex-wrap:wrap;align-items:stretch}'
        '.unified-header .product-menu{position:static;flex:1 1 280px}'
        '.unified-header .nav-dropdown[hidden]{display:block!important;position:static!important;'
        'width:auto;min-width:0;max-height:none;box-shadow:none;border:0}'
        '.unified-header .menu-category{pointer-events:none}'
        '.unified-header .menu-category .chevron,.unified-header .menu-toggle{display:none!important}'
        '</style></noscript>',
        '</header>',
    ])
    return ''.join(parts)


def main():
    count = 0
    for page in sorted(PUBLIC.rglob('*.html')):
        source = page.read_text()
        updated, matches = re.subn(
            r'<header class="header unified-header">.*?</header>',
            lambda _: render_header(page), source, count=1, flags=re.S,
        )
        if matches != 1:
            raise ValueError(f"Expected exactly one shared header: {page}")
        # Keep existing carousel fallbacks without hiding the new category labels.
        updated = updated.replace('.menu-toggle,[data-menu-toggle]{', '.menu-toggle{')
        for asset in ('product.css', 'common.js'):
            updated = re.sub(
                rf'((?:href|src)="(?:\.\.?/)+{re.escape(asset)})(?:\?[^"<>]*)?"',
                rf'\1?v={VERSION}"', updated,
            )
        if updated != source:
            page.write_text(updated)
            count += 1
    print(f"Updated navigation in {count} pages.")


if __name__ == '__main__':
    main()
