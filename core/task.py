""" Task class """


class Task:
    """ Generic task """

    def __init__(self, name: str):
        self.name = name

    def db_fetch(self):
        raise NotImplementedError

    def set_status(self, payload, status: str):
        raise NotImplementedError

    def save_result(self, payload, result):
        raise NotImplementedError

    async def process(self, payload):
        raise NotImplementedError
