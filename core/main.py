"""
Cross-platform launcher for backend, frontend and core.
Linux: uses nohup to run processes in background (.out logs)
Windows: opens separate console windows, no log files
"""

from core.logger import logger
from core.ved3v_ascii_art import art
from core.method_generator import ensure_schema

import subprocess
import platform
import time
import sys
import os

PYTHON = sys.executable

core_systems = [
    "core/core_main.py",
    "backend/backend_main.py",
    "frontend/frontend_main.py",
]


def run_linux():
    """ Starts all systems using nohup (Linux only) """

    logger.info("Detected Linux. Starting services via nohup...")

    scripts = [(system, system[:-2] + "out") for system in core_systems]

    for script, outfile in scripts:
        cmd = f"nohup {PYTHON} -u {script} > {outfile} 2>&1 &"
        logger.info(f"Running: {cmd}")
        os.system(cmd)

    logger.info("All services launched.")
    logger.info("Logs: *.out files in current directory.")


def start_windows(script, new_console: bool = True):
    """ Starts a process in a new console and shows output in real time """

    if new_console:
        logger.info(f"Starting {script} in new console...")
    else:
        logger.info(f"Starting {script}...")

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env = os.environ.copy()
    env["PYTHONPATH"] = root

    if new_console:
        subprocess.Popen(
            [PYTHON, "-u", script],
            creationflags=subprocess.CREATE_NEW_CONSOLE,
            env=env
        )
    else:
        subprocess.Popen(
            [PYTHON, "-u", script],
            env=env
        )


def run_windows(new_console: bool = True):
    """
    Starts backend, frontend, core in separate consoles (Windows)

    :param new_console: Use when you need to run only one of the systems, for example, backend_main.py
    """

    logger.info("Detected Windows.")

    if new_console:
        logger.info("Starting programs in new consoles...")
    else:
        logger.info("Starting programs...")

    for system in core_systems:
        time.sleep(0.5)
        start_windows(system, new_console)

    logger.info("All programs launched.")


def run(regenerate: bool = False):
    """
    Starts all systems.

    :param regenerate: check that SQLite database tables and columns are the same as in the schema files
    and regenerate them if missing
    """

    print(art)

    system = platform.system().lower()

    logger.info(f"=== Launcher started on {system.upper()} ===")

    if regenerate:
        logger.info("Checking for missing database tables and columns...")
        ensure_schema()

    if system == "linux":
        run_linux()
    elif system == "windows":
        run_windows(new_console=True)
    else:
        logger.error(f"Unsupported OS: {system}")
        raise SystemExit(1)


if __name__ == "__main__":
    run(True)
