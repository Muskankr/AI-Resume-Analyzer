"""Regression tests for the analyzer migration graph."""

from django.db import connection
from django.db.migrations.loader import MigrationLoader
from django.test import TestCase


class AnalyzerMigrationGraphTests(TestCase):
    def test_analyzer_has_one_migration_head(self):
        """Independent feature migrations must be joined before release.

        Django cannot create a test database, run migrations, or start a fresh
        deployment while an app has more than one leaf migration.
        """
        loader = MigrationLoader(connection, ignore_no_migrations=True)
        self.assertEqual(
            [node for node in loader.graph.leaf_nodes() if node[0] == "analyzer"],
            [("analyzer", "0016_merge_20260819_0000")],
        )
