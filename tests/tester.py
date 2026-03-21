""" Tried to make a system that checks all situations. Maybe wrong situations like Wheatley from Portal 2 """

from core.logger import logger
import time
import random


def evaluate(entity, state):
    return entity(state)


def run(process, context):
    return process(context)


def compose(*processes):
    def pipeline(context):
        for p in processes:
            context = p(context)
        return context

    return pipeline


def repeat(process, times):
    def wrapped(context):
        for _ in range(times):
            context = process(context)
        return context

    return wrapped


def branch(decider, a, b):
    def wrapped(context):
        if decider(context):
            return a(context)
        return b(context)

    return wrapped


def identity(context):
    return context


def mutate(key, func):
    def wrapped(context):
        context[key] = func(context.get(key))
        return context

    return wrapped


def condition(key, predicate):
    def wrapped(context):
        return predicate(context.get(key))

    return wrapped


def random_key():
    return random.choice(["a", "b", "c", "value"])


def random_mutation():
    ops = [
        lambda x: (x or 0) + random.randint(1, 5),
        lambda x: (x or 0) * random.randint(1, 3),
        lambda x: (x or 0) - random.randint(1, 5),
    ]
    return mutate(random_key(), random.choice(ops))


def random_condition():
    preds = [
        lambda x: (x or 0) % 2 == 0,
        lambda x: (x or 0) > 5,
        lambda x: (x or 0) < 0,
    ]
    return condition(random_key(), random.choice(preds))


def random_process(depth=0):
    if depth > 2:
        return random.choice([identity, random_mutation()])

    choice = random.randint(0, 3)

    if choice == 0:
        return random_mutation()

    if choice == 1:
        return repeat(random_process(depth + 1), random.randint(1, 3))

    if choice == 2:
        return branch(
            random_condition(),
            random_process(depth + 1),
            random_process(depth + 1)
        )

    return identity


def random_system():
    count = random.randint(1, 5)
    processes = [random_process() for _ in range(count)]
    return compose(*processes)


def random_context():
    keys = [*"abcdefghijklmnopqrstuvwxyz"[:random.randint(0, 25)], "value"]
    return {k: random.randint(-10, 10) for k in keys}


def analyze(system):
    results = []
    inputs = []

    for _ in range(5):
        ctx = random_context()
        inputs.append(ctx.copy())
        try:
            res = run(system, ctx.copy())
            results.append(res)
        except Exception as e:
            logger.error(f"Execution error: {e}")
            return {"error": True}

    values = []
    for r in results:
        values.extend(v for v in r.values() if isinstance(v, (int, float)))

    if not values:
        return {"empty": True}

    mean = sum(values) / len(values)
    variance = sum((x - mean) ** 2 for x in values) / len(values)

    return {
        "mean": mean,
        "variance": variance,
        "min": min(values),
        "max": max(values),
    }


def test():
    system = random_system()

    logger.info(f"Generated system: {system}")

    context = random_context()
    logger.info(f"Input: {context}")

    try:
        result = run(system, context.copy())
        logger.info(f"Result: {result}")
    except Exception as e:
        logger.error(f"Runtime error: {e}")
        return

    stats = analyze(system)
    logger.info(f"Analysis: {stats}")
    print()


while True:
    test()
    time.sleep(1)
