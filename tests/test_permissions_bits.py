from pathlib import Path
import json

data = json.loads(Path("permissions.json").read_text())

permissions = []
for group in data.values():
    for perm in group.values():
        permissions.append(perm)

permissions.sort()

PERMISSION_BITS = {
    perm: 1 << i
    for i, perm in enumerate(permissions)
}


def has_permission(mask: int, permission: str) -> bool:
    return (mask & PERMISSION_BITS[permission]) != 0
