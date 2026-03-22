""" File with functions that help bot to communicate with Telegram users """

import logging
from typing import BinaryIO
import aiogram.utils.exceptions
from aiogram.types import InlineKeyboardMarkup
from aiogram import Bot, types


async def send_message(bot: Bot, user_id: int, text: str, reply_markup: InlineKeyboardMarkup = None):
    """ Sends text to user """

    try:
        return await bot.send_message(user_id, text, reply_markup=reply_markup)
    except aiogram.utils.exceptions.CantParseEntities as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest(CantParseEntities). {err_msg}")
    except aiogram.utils.exceptions.InvalidQueryID as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest(InvalidQueryID). {err_msg}")
    except aiogram.utils.exceptions.BadRequest as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest. {err_msg}")
    except aiogram.utils.exceptions.RetryAfter as err_msg:
        logging.warning(f"aiogram.utils.exceptions.RetryAfter: Flood control exceeded. {err_msg}")
    except aiogram.utils.exceptions.BotBlocked:
        pass
    except aiogram.utils.exceptions.Unauthorized:
        pass
    except aiogram.utils.exceptions.TelegramAPIError as err_msg:
        logging.warning(f"aiogram.utils.exceptions.TelegramAPIError: Internal Server Error. {err_msg}")


async def send_audio(bot: Bot, user_id: int, audio: BinaryIO, caption: str = None, reply_markup: InlineKeyboardMarkup = None):
    """ Sends an audio to user """

    try:
        return await bot.send_audio(user_id, audio, caption=caption, reply_markup=reply_markup)
    except aiogram.utils.exceptions.CantParseEntities as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest(CantParseEntities). {err_msg}")
    except aiogram.utils.exceptions.InvalidQueryID as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest(InvalidQueryID). {err_msg}")
    except aiogram.utils.exceptions.BadRequest as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest. {err_msg}")
    except aiogram.utils.exceptions.RetryAfter as err_msg:
        logging.warning(f"aiogram.utils.exceptions.RetryAfter: Flood control exceeded. {err_msg}")
    except aiogram.utils.exceptions.BotBlocked:
        pass
    except aiogram.utils.exceptions.Unauthorized:
        pass
    except aiogram.utils.exceptions.TelegramAPIError as err_msg:
        logging.warning(f"aiogram.utils.exceptions.TelegramAPIError: Internal Server Error. {err_msg}")


async def send_video(bot: Bot, user_id: int, video: BinaryIO, caption: str = None, reply_markup: InlineKeyboardMarkup = None,
                     width=None, height=None):
    """ Sends a video to user """

    try:
        return await bot.send_video(user_id, video, caption=caption, reply_markup=reply_markup, width=width, height=height)
    except aiogram.utils.exceptions.CantParseEntities as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest(CantParseEntities). {err_msg}")
    except aiogram.utils.exceptions.InvalidQueryID as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest(InvalidQueryID). {err_msg}")
    except aiogram.utils.exceptions.BadRequest as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest. {err_msg}")
    except aiogram.utils.exceptions.RetryAfter as err_msg:
        logging.warning(f"aiogram.utils.exceptions.RetryAfter: Flood control exceeded. {err_msg}")
    except aiogram.utils.exceptions.BotBlocked:
        pass
    except aiogram.utils.exceptions.Unauthorized:
        pass
    except aiogram.utils.exceptions.TelegramAPIError as err_msg:
        logging.warning(f"aiogram.utils.exceptions.TelegramAPIError: Internal Server Error. {err_msg}")


async def send_photo(bot: Bot, user_id: int, photo: BinaryIO, caption: str = None, reply_markup: InlineKeyboardMarkup = None):
    """ Sends a photo to user """

    try:
        return await bot.send_photo(user_id, photo, caption=caption, reply_markup=reply_markup)
    except aiogram.utils.exceptions.CantParseEntities as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest(CantParseEntities). {err_msg}")
    except aiogram.utils.exceptions.InvalidQueryID as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest(InvalidQueryID). {err_msg}")
    except aiogram.utils.exceptions.BadRequest as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest. {err_msg}")
    except aiogram.utils.exceptions.RetryAfter as err_msg:
        logging.warning(f"aiogram.utils.exceptions.RetryAfter: Flood control exceeded. {err_msg}")
    except aiogram.utils.exceptions.BotBlocked:
        pass
    except aiogram.utils.exceptions.Unauthorized:
        pass
    except aiogram.utils.exceptions.TelegramAPIError as err_msg:
        logging.warning(f"aiogram.utils.exceptions.TelegramAPIError: Internal Server Error. {err_msg}")


async def send_document(bot: Bot, user_id: int, document: BinaryIO, caption: str = None,
                        reply_markup: InlineKeyboardMarkup = None):
    """ Sends document (file) to user """

    try:
        return await bot.send_document(user_id, document, caption=caption, reply_markup=reply_markup)
    except aiogram.utils.exceptions.CantParseEntities as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest(CantParseEntities). {err_msg}")
    except aiogram.utils.exceptions.InvalidQueryID as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest(InvalidQueryID). {err_msg}")
    except aiogram.utils.exceptions.BadRequest as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest. {err_msg}")
    except aiogram.utils.exceptions.RetryAfter as err_msg:
        logging.warning(f"aiogram.utils.exceptions.RetryAfter: Flood control exceeded. {err_msg}")
    except aiogram.utils.exceptions.BotBlocked:
        pass
    except aiogram.utils.exceptions.Unauthorized:
        pass
    except aiogram.utils.exceptions.TelegramAPIError as err_msg:
        logging.warning(f"aiogram.utils.exceptions.TelegramAPIError: Internal Server Error. {err_msg}")


async def answer(message: types.Message, text: str, parse_mode: str = None, disable_web_page_preview: bool = False,
                 reply_markup: InlineKeyboardMarkup = None):
    """ Answers to the user message """

    try:
        return await message.answer(text, parse_mode=parse_mode, reply_markup=reply_markup,
                                    disable_web_page_preview=disable_web_page_preview)
    except aiogram.utils.exceptions.CantParseEntities as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest(CantParseEntities). {err_msg}")
    except aiogram.utils.exceptions.InvalidQueryID as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest(InvalidQueryID). {err_msg}")
    except aiogram.utils.exceptions.BadRequest as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest. {err_msg}")
    except aiogram.utils.exceptions.RetryAfter as err_msg:
        logging.warning(f"aiogram.utils.exceptions.RetryAfter: Flood control exceeded. {err_msg}")
    except aiogram.utils.exceptions.BotBlocked:
        pass
    except aiogram.utils.exceptions.Unauthorized:
        pass
    except aiogram.utils.exceptions.TelegramAPIError as err_msg:
        logging.warning(f"aiogram.utils.exceptions.TelegramAPIError: Internal Server Error. {err_msg}")


async def answer_media_group(message: types.Message, media: list[types.InputMediaPhoto]):
    """ Answers to user with multiple media """

    try:
        return await message.answer_media_group(media)
    except aiogram.utils.exceptions.CantParseEntities as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest(CantParseEntities). {err_msg}")
    except aiogram.utils.exceptions.InvalidQueryID as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest(InvalidQueryID). {err_msg}")
    except aiogram.utils.exceptions.BadRequest as err_msg:
        logging.warning(f"aiogram.utils.exceptions.BadRequest. {err_msg}")
    except aiogram.utils.exceptions.RetryAfter as err_msg:
        logging.warning(f"aiogram.utils.exceptions.RetryAfter: Flood control exceeded. {err_msg}")
    except aiogram.utils.exceptions.BotBlocked:
        pass
    except aiogram.utils.exceptions.Unauthorized:
        pass
    except aiogram.utils.exceptions.TelegramAPIError as err_msg:
        logging.warning(f"aiogram.utils.exceptions.TelegramAPIError: Internal Server Error. {err_msg}")
