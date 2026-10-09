from core.ved3v_ascii_art import art

from math import sin

import colorsys
import random
import time
import os

os.system("")  # включает ANSI-escape в Windows-терминале

LINES = art.strip("\n").split("\n")
W = max(map(len, LINES))
LINES = [l.ljust(W) for l in LINES]
H = len(LINES)

NOISE = "#@%&$*+=;:<>/\\|"
FPS = 30

# Момент "расшифровки" каждого символа: слева направо + случайный разброс
DECODE_SPEED = 1.0  # 1.0 как сейчас, меньше = медленнее
REVEAL = [
    [(x / W * 50 + random.uniform(0, 25)) / DECODE_SPEED for x in range(W)]
    for _ in range(H)
]
DECODE_FRAMES = int(max(map(max, REVEAL))) + 1


def flicker(x, y, t):
    v = (
            sin(x * 0.35 + t * 2.1)
            + sin(y * 0.90 - t * 1.3)
            + sin((x + y) * 0.17 + t * 0.7)
            + sin((x - y * 2) * 0.11 - t * 1.9)
    )
    return (v / 4 + 1) / 2  # 0..1


def smooth(t):
    return (sin(t) + 1) / 2


def rgb(h, s=1.0, v=1.0):
    r, g, b = colorsys.hsv_to_rgb(h % 1, s, v)
    return f"\033[38;2;{int(r * 255)};{int(g * 255)};{int(b * 255)}m"


def render(frame, glitch):
    t = frame / FPS
    rows = []
    for y, line in enumerate(LINES):
        # глитч: строка смещается циклически
        if glitch and random.random() < 0.15:
            k = random.choice([-3, -2, -1, 1, 2, 3])
            line = line[k:] + line[:k]
        s = []
        for x, ch in enumerate(line):
            if ch == " ":
                s.append(" ")
            elif frame < REVEAL[y][x] - 10 / DECODE_SPEED:
                s.append(" ")
            elif frame < REVEAL[y][x]:
                s.append("\033[38;2;70;70;70m" + random.choice(NOISE))
            elif glitch and random.random() < 0.03:
                s.append("\033[38;2;255;255;255m" + random.choice(NOISE))
            else:
                s.append(rgb(0, s=0, v=flicker(x, y, t)) + ch)
        rows.append("".join(s) + "\033[0m")
    return "\033[H" + "\n".join(rows)


def main():
    print("\033[2J\033[?25l", end="")  # очистка + скрыть курсор
    frame, glitch_left = 0, 0
    try:
        while True:
            if frame > DECODE_FRAMES:
                if glitch_left == 0 and random.random() < 0.02:
                    glitch_left = random.randint(3, 8)
                if glitch_left:
                    glitch_left -= 1
            print(render(frame, glitch_left > 0), flush=True)
            frame += 1
            time.sleep(1 / FPS)
    except KeyboardInterrupt:
        pass
    finally:
        print("\033[0m\033[?25h")  # вернуть цвет и курсор


if __name__ == "__main__":
    main()
