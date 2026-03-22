import os


def extract_project_structure(root_path, extensions=None):
    if extensions is None:
        extensions = {".py", ".js", ".html", ".css", ".yaml"}

    def scan_dir(path):
        if os.path.basename(path) in ("venv", ".venv"):
            return None

        files = [f for f in os.listdir(path)
                 if os.path.isfile(os.path.join(path, f)) and os.path.splitext(f)[1] in extensions]

        folders = {}
        for entry in os.listdir(path):
            full_path = os.path.join(path, entry)
            if os.path.isdir(full_path) and entry not in ("venv", ".venv"):
                sub = scan_dir(full_path)
                if sub:
                    folders[entry] = sub

        if not files and not folders:
            return None

        result = {}
        if files:
            result["files"] = files
        result.update(folders)
        return result

    structure = scan_dir(root_path)
    return structure or {}


if __name__ == "__main__":
    import json

    project_path = "c:/users/dmitry/Mir"
    structure = extract_project_structure(project_path)
    print(json.dumps(structure, indent=2))
