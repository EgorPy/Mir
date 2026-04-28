from core.logger import logger

import os


def count_lines_in_file(filename: str):
    try:
        with open(filename, "r", encoding="utf-8") as file:
            content = file.read()
            if not content:
                return 0
            count = content.count("\n")
            logger.info(f"{filename:<80} {count}")
            return count
    except PermissionError:
        return 0


def is_extension_allowed(filename: str, extensions=None):
    if extensions is None:
        extensions = []
    extension = os.path.splitext(filename)[1].lower()
    return not extensions or extension in extensions


def count_lines_in_folder(
        path: str,
        count: int = 0,
        recursive=False,
        extensions: list[str] = None,
        ignore_folders: set[str] = None,
):
    if ignore_folders is None:
        ignore_folders = {"venv", ".venv", ".git", "__pycache__", ".idea", ".vscode", "build", "node_modules"}

    if not os.path.isdir(path):
        if is_extension_allowed(path, extensions):
            return count_lines_in_file(path)
        return 0

    if recursive:
        for root, dirs, files in os.walk(path):
            dirs[:] = [d for d in dirs if d not in ignore_folders]

            for filename in files:
                full_path = os.path.join(root, filename)
                if is_extension_allowed(full_path, extensions):
                    count += count_lines_in_file(full_path)

        return count

    for obj in os.listdir(path):
        full_path = os.path.join(path, obj)

        if os.path.isdir(full_path) and obj in ignore_folders:
            continue

        if os.path.isfile(full_path) and is_extension_allowed(full_path, extensions):
            count += count_lines_in_file(full_path)

    return count


print(count_lines_in_folder(r"c:/users/dmitry/Mir", recursive=True, extensions=[".py", ".js", ".css", ".html"]))
