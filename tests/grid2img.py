#!/usr/bin/env python3
"""
Превью рисунка из GRID.
Генерирует PNG файл preview.png в той же папке.
Установи зависимость: pip install Pillow
"""

from PIL import Image, ImageDraw, ImageFont
import os

# ══════════════════════════════════════════
# КОНФИГУРАЦИЯ — должна совпадать с ws_client.py
# ══════════════════════════════════════════

ORIGIN_X = 500
ORIGIN_Y = 500

# Масштаб: сколько пикселей экрана на один пиксель холста
SCALE = 10

# Нарисовать сетку между пикселями
SHOW_GRID = True
GRID_COLOR = (40, 40, 40)

# Нарисовать координатные метки по краям
SHOW_COORDS = True

GRID = [
    [10, 0, 0, 0, 10, 10, 0, 0, 0, 10, 10, 0, 0, 0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 0, 10, 10, 0, 0, 0, 0, 0, 10, 10, 0, 0, 0, 10, 0, 0, 0, 0,
     0, 10, 10, 0, 0, 0, 10, 10, 0, 0, 10, 10, 10, 10, 0, 0, 0, 0, 10, 10, 0, 0, 0, 10, 10, 0, 0, 0, 0, 10, 10, 0, 0, 0, 10, 10, 0, 0],
    [10, 0, 0, 10, 0, 0, 10, 0, 10, 0, 0, 10, 0, 0, 0, 10, 10, 0, 0, 10, 10, 0, 0, 10, 10, 0, 0, 0, 0, 0, 0, 10, 0, 0, 10, 0, 10, 10, 0, 0, 0, 0,
     10, 0, 0, 10, 0, 10, 0, 10, 0, 0, 0, 0, 0, 10, 0, 10, 0, 10, 0, 0, 10, 0, 10, 0, 0, 10, 10, 0, 10, 0, 0, 10, 0, 10, 0, 0, 10, 0],
    [10, 0, 0, 0, 10, 10, 0, 0, 0, 10, 10, 0, 0, 0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 0,
     0, 0, 10, 0, 0, 10, 10, 10, 10, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 10, 0, 0, 10, 0, 0, 10, 10, 0, 10, 0, 0, 10, 0, 10, 0, 0, 10, 0],
    [10, 0, 0, 10, 0, 0, 10, 0, 10, 0, 0, 10, 0, 0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0, 0, 0, 0, 10, 0, 0, 0, 0, 10, 0, 0, 0, 0,
     0, 10, 0, 0, 0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10, 0, 10, 0, 0, 10, 0, 10, 0, 0, 10, 10, 0, 10, 0, 0, 10, 0, 10, 0, 0, 10, 0],
    [10, 10, 0, 0, 10, 10, 0, 0, 0, 10, 10, 0, 0, 10, 0, 10, 10, 10, 0, 10, 10, 10, 0, 0, 0, 10, 10, 0, 0, 10, 0, 10, 10, 10, 10, 0, 10, 10, 10, 0, 10, 0,
     10, 10, 10, 10, 0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 10, 10, 0, 0, 0, 10, 10, 0, 0, 0, 0, 10, 10, 0, 0, 0, 10, 10, 0, 0],
]
# Палитра цветов (RGB) — индексы 0–31
PALETTE = {
    0: (255, 255, 255),  # Белый
    1: (228, 228, 228),  # Светло-серый
    2: (136, 136, 136),  # Серый
    3: (34, 34, 34),  # Тёмно-серый
    4: (0, 0, 0),  # Чёрный
    5: (90, 48, 29),  # Тёмно-коричневый
    6: (160, 106, 66),  # Коричневый
    7: (255, 196, 140),  # Телесный
    8: (109, 0, 26),  # Бордовый
    9: (190, 0, 57),  # Тёмно-красный
    10: (229, 0, 0),  # Красный
    11: (255, 56, 129),  # Ярко-розовый
    12: (255, 167, 209),  # Светло-розовый
    13: (222, 16, 127),  # Маджента
    14: (229, 149, 0),  # Тёмно-оранжевый
    15: (255, 168, 0),  # Оранжевый
    16: (229, 217, 0),  # Жёлтый
    17: (255, 248, 184),  # Светло-жёлтый
    18: (0, 95, 57),  # Тёмно-зелёный
    19: (2, 190, 1),  # Зелёный
    20: (148, 224, 68),  # Салатовый
    21: (0, 117, 111),  # Морской
    22: (0, 0, 234),  # Тёмно-синий
    23: (0, 131, 199),  # Синий
    24: (54, 144, 234),  # Светло-синий
    25: (0, 211, 221),  # Бирюзовый
    26: (81, 233, 244),  # Светло-голубой
    27: (73, 58, 193),  # Тёмный индиго
    28: (106, 92, 255),  # Индиго
    29: (180, 74, 192),  # Фиолетовый
    30: (129, 30, 159),  # Тёмно-фиолетовый
    31: (43, 45, 66),  # Холодный тёмный
}

BACKGROUND_COLOR = (26, 26, 26)  # фон холста (#1a1a1a)
TRANSPARENT_COLOR = (200, 200, 200)  # цвет для color=0 (пустые ячейки)


# ══════════════════════════════════════════
# ГЕНЕРАЦИЯ ПРЕВЬЮ
# ══════════════════════════════════════════

def build_preview(
        grid: list[list[int]],
        origin_x: int,
        origin_y: int,
        scale: int,
        show_grid: bool,
        show_coords: bool,
        output_path: str,
) -> None:
    rows = len(grid)
    cols = max(len(row) for row in grid)

    # Отступ для координатных меток
    margin = 40 if show_coords else 0

    img_w = cols * scale + margin
    img_h = rows * scale + margin

    img = Image.new("RGB", (img_w, img_h), BACKGROUND_COLOR)
    draw = ImageDraw.Draw(img)

    # Попытка загрузить шрифт, fallback на дефолтный
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 10)
    except Exception:
        font = ImageFont.load_default()

    # Рисуем пиксели
    for row_idx, row in enumerate(grid):
        for col_idx, color_idx in enumerate(row):
            rgb = PALETTE.get(color_idx, TRANSPARENT_COLOR) if color_idx != 0 else TRANSPARENT_COLOR
            x0 = margin + col_idx * scale
            y0 = margin + row_idx * scale
            x1 = x0 + scale - (1 if show_grid else 0)
            y1 = y0 + scale - (1 if show_grid else 0)
            draw.rectangle([x0, y0, x1, y1], fill=rgb)

    # Сетка
    if show_grid and scale >= 4:
        for col_idx in range(cols + 1):
            x = margin + col_idx * scale
            draw.line([(x, margin), (x, img_h)], fill=GRID_COLOR, width=1)
        for row_idx in range(rows + 1):
            y = margin + row_idx * scale
            draw.line([(margin, y), (img_w, y)], fill=GRID_COLOR, width=1)

    # Координатные метки
    if show_coords:
        label_color = (180, 180, 180)

        # X метки сверху (каждые 5 пикселей)
        for col_idx in range(0, cols, 5):
            x = margin + col_idx * scale + scale // 2
            lbl = str(origin_x + col_idx)
            draw.text((x - len(lbl) * 3, 2), lbl, fill=label_color, font=font)

        # Y метки слева (каждые строку)
        for row_idx in range(rows):
            y = margin + row_idx * scale + scale // 2 - 5
            lbl = str(origin_y + row_idx)
            draw.text((2, y), lbl, fill=label_color, font=font)

    img.save(output_path)
    print(f"✅ Превью сохранено: {output_path}")
    print(f"   Размер grid:  {cols} × {rows} пикс.")
    print(f"   Размер файла: {img_w} × {img_h} px")
    print(f"   Масштаб:      {scale}x")
    print(f"   Координаты:   ({origin_x}, {origin_y}) → ({origin_x + cols - 1}, {origin_y + rows - 1})")

    # Статистика по цветам
    color_counts: dict[int, int] = {}
    for row in grid:
        for c in row:
            if c != 0:
                color_counts[c] = color_counts.get(c, 0) + 1
    total = sum(color_counts.values())
    print(f"\n   Всего пикселей для отправки: {total}")
    color_names = {
        0: "Белый", 1: "Светло-серый", 2: "Серый", 3: "Тёмно-серый", 4: "Чёрный",
        5: "Тёмно-коричневый", 6: "Коричневый", 7: "Телесный", 8: "Бордовый",
        9: "Тёмно-красный", 10: "Красный", 11: "Ярко-розовый", 12: "Светло-розовый",
        13: "Маджента", 14: "Тёмно-оранжевый", 15: "Оранжевый", 16: "Жёлтый",
        17: "Светло-жёлтый", 18: "Тёмно-зелёный", 19: "Зелёный", 20: "Салатовый",
        21: "Морской", 22: "Тёмно-синий", 23: "Синий", 24: "Светло-синий",
        25: "Бирюзовый", 26: "Светло-голубой", 27: "Тёмный индиго", 28: "Индиго",
        29: "Фиолетовый", 30: "Тёмно-фиолетовый", 31: "Холодный тёмный",
    }
    for idx, count in sorted(color_counts.items()):
        name = color_names.get(idx, f"#{idx}")
        bar = "█" * min(count, 40)
        print(f"   [{idx:2d}] {name:<22} {count:4d}  {bar}")


# ══════════════════════════════════════════
# ТОЧКА ВХОДА
# ══════════════════════════════════════════

if __name__ == "__main__":
    output = os.path.join(os.path.dirname(__file__), "preview.png")
    build_preview(
        grid=GRID,
        origin_x=ORIGIN_X,
        origin_y=ORIGIN_Y,
        scale=SCALE,
        show_grid=SHOW_GRID,
        show_coords=SHOW_COORDS,
        output_path=output,
    )
