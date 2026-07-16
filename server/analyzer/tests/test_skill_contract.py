import json
from pathlib import Path
from django.test import SimpleTestCase

SKILLS_PATH = Path(__file__).resolve().parents[1] / "data" / "skills.json"

class SkillDictionaryContractTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        with SKILLS_PATH.open(encoding="utf-8") as file:
            cls.dictionary = json.load(file)

    def test_dictionary_is_external_json(self):
        self.assertTrue(SKILLS_PATH.is_file())

    def test_dictionary_has_at_least_100_unique_canonical_skills(self):
        names = [entry["name"] for entries in self.dictionary.values() for entry in entries]
        self.assertGreaterEqual(len(names), 100)
        self.assertEqual(len(names), len(set(names)))

    def test_dictionary_has_at_least_four_populated_categories(self):
        self.assertGreaterEqual(sum(bool(entries) for entries in self.dictionary.values()), 4)

    def test_every_entry_has_valid_name_and_aliases(self):
        for category, entries in self.dictionary.items():
            for entry in entries:
                self.assertEqual(set(entry), {"name", "aliases"}, msg=f"{category}: {entry}")
                self.assertIsInstance(entry["name"], str)
                self.assertTrue(entry["name"].strip())
                self.assertIsInstance(entry["aliases"], list)
                self.assertTrue(all(isinstance(alias, str) and alias.strip() for alias in entry["aliases"]))

    def test_common_synonyms_are_declared(self):
        aliases = {entry["name"]: set(entry["aliases"]) for entries in self.dictionary.values() for entry in entries}
        self.assertIn("js", aliases["javascript"])
        self.assertIn("cpp", aliases["c++"])
        self.assertIn("nodejs", aliases["node.js"])
        self.assertIn("postgres", aliases["postgresql"])
