"""Regression tests for the analyzer migration graph.

This module predates :mod:`analyzer.tests_migration_graph` and used to pin the
leaf by name::

    self.assertEqual(
        [node for node in loader.graph.leaf_nodes() if node[0] == "analyzer"],
        [("analyzer", "0016_merge_20260819_0000")],
    )

which is wrong in both directions. It fails every time a migration is added --
the leaf is supposed to move -- and it asserts the *identity* of a specific
merge rather than the property anyone cares about, which is that there is
exactly one leaf whatever it is called.

It has in fact been failing since ``0017_resumeanalysis_share_controls`` landed
on 19 Aug and named the other 0016 merge as its parent. Nobody saw it, because
by then the graph had two leaves and ``manage.py test`` was exiting before it
collected anything (#862).

The check is kept -- it runs against a real database connection, which
``tests_migration_graph`` deliberately does not -- but it now asserts the count
rather than the name.
"""

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
        leaves = [node for node in loader.graph.leaf_nodes() if node[0] == "analyzer"]

        self.assertEqual(
            len(leaves),
            1,
            "The analyzer app should have exactly one migration leaf, found "
            f"{len(leaves)}: {sorted(name for _, name in leaves)}. "
            "Two branches have each added a migration on the same parent.",
        )

    def test_leaf_is_applied_to_the_test_database(self):
        """The graph being buildable is not the same as it having been run.

        ``MigrationLoader`` reads files off disk; this asserts the leaf is
        actually recorded against the connection the tests are using, which is
        what tells us the merge really did apply rather than merely parse.
        """
        loader = MigrationLoader(connection, ignore_no_migrations=True)
        leaves = [node for node in loader.graph.leaf_nodes() if node[0] == "analyzer"]

        self.assertEqual(len(leaves), 1, "Expected a single analyzer leaf.")
        self.assertIn(
            leaves[0],
            loader.applied_migrations,
            f"{leaves[0][1]} is the graph's leaf but has not been applied to the "
            "test database.",
        )
