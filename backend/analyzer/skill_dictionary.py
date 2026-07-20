import json
from functools import lru_cache
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent / "data"
SKILLS_FILE = DATA_DIR / "skills.json"


@lru_cache(maxsize=1)
def load_skill_dictionary() -> dict:
    """
    Load the external skills dictionary once and cache it.

    Returns:
        dict: Parsed JSON skill dictionary.
    """
    with SKILLS_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)