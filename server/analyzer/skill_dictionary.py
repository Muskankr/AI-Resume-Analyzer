import json
from functools import lru_cache
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent / "data"
SKILLS_FILE = DATA_DIR / "skills.json"


@lru_cache(maxsize=1)
def load_skill_dictionary():
    if not SKILLS_FILE.exists():
        raise FileNotFoundError(
            f"Skill dictionary not found: {SKILLS_FILE}"
        )

    with SKILLS_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)