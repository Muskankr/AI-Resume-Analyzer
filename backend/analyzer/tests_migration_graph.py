"""The migration graph must stay buildable.

Two parallel pull requests each added a ``0020_*`` migration on top of
``0019_batchupload``. Neither branch knew about the other, so ``main`` ended up
with two leaf nodes and Django refused to build a plan at all::

    CommandError: Conflicting migrations detected; multiple leaf nodes in the
    migration graph: (0020_merge_20260824_0025, 0020_resumebadge in analyzer).

That is not a test failure — it is raised before a single test is collected, so
``manage.py test`` exited non-zero having run nothing, and every ``manage.py``
command that touches the loader (``migrate``, ``showmigrations``,
``makemigrations --check``) failed the same way.

A red build that runs zero assertions looks very different from a red build
with a failing assertion, and it stayed on ``main`` for a day because nothing
distinguished the two. These tests make the graph itself an assertion, so the
next time two branches collide the failure names the cause.

They deliberately use ``MigrationLoader`` rather than shelling out to
``makemigrations``: the loader is what actually raises in production, and it
does not need a database.
"""

from django.db.migrations.exceptions import InconsistentMigrationHistory
from django.db.migrations.loader import MigrationLoader
from django.test import SimpleTestCase


class MigrationGraphTests(SimpleTestCase):
    """Structural checks on the migration graph, no database required."""

    def _loader(self):
        # connection=None skips the applied-migrations query: we are asking
        # about the files on disk, not about any particular database.
        return MigrationLoader(None, ignore_no_migrations=True)

    def test_analyzer_has_exactly_one_leaf_migration(self):
        """Two leaves means `migrate` and `test` both refuse to run.

        This is the check that would have caught the conflict at the point the
        second 0020 was merged.
        """
        loader = self._loader()
        leaves = sorted(
            name for app_label, name in loader.graph.leaf_nodes()
            if app_label == "analyzer"
        )

        self.assertEqual(
            len(leaves),
            1,
            "The analyzer app has more than one migration leaf: "
            f"{leaves}. Django cannot build a migration plan in this state, so "
            "`manage.py migrate` and `manage.py test` both fail before doing "
            "any work. Run `python manage.py makemigrations --merge analyzer` "
            "and commit the merge migration it generates.",
        )

    def test_every_app_has_exactly_one_leaf_migration(self):
        """The same rule, for every app in the project.

        The conflict happened in ``analyzer`` this time, but nothing about the
        failure mode is specific to that app.
        """
        loader = self._loader()

        leaves_by_app = {}
        for app_label, name in loader.graph.leaf_nodes():
            leaves_by_app.setdefault(app_label, []).append(name)

        conflicted = {
            app: sorted(names)
            for app, names in leaves_by_app.items()
            if len(names) > 1
        }

        self.assertEqual(
            conflicted,
            {},
            f"Apps with a conflicting migration graph: {conflicted}. "
            "Each one needs a merge migration.",
        )

    def test_migration_graph_builds_without_error(self):
        """Building the graph is what raises in production — do it here too."""
        try:
            loader = self._loader()
            loader.graph.validate_consistency()
        except InconsistentMigrationHistory as exc:  # pragma: no cover
            self.fail(f"Migration graph is inconsistent: {exc}")

    def test_every_migration_dependency_resolves(self):
        """A dependency naming a migration that does not exist.

        ``graph.leaf_nodes()`` is happy with a dangling edge, but ``migrate``
        is not. Django records unresolved references as dummy nodes, so check
        for those directly.
        """
        loader = self._loader()

        dangling = sorted(
            f"{app}.{name}"
            for (app, name), node in loader.graph.node_map.items()
            if getattr(node, "children", None) is not None
            and (app, name) not in loader.disk_migrations
            and app == "analyzer"
        )

        self.assertEqual(
            dangling,
            [],
            f"These analyzer migrations are referenced but do not exist: {dangling}",
        )


class NoMissingMigrationsTests(SimpleTestCase):
    """A model change with no migration is the other way this breaks.

    CI already runs ``makemigrations --check --dry-run``, but that step is
    skipped entirely when the graph has two leaves — the command raises the
    conflict error before it gets as far as comparing models to migrations.
    Running the equivalent check from inside the suite means it is exercised
    locally too, and it stays honest about which of the two problems it found.
    """

    def test_models_match_migrations(self):
        from django.apps import apps
        from django.db.migrations.autodetector import MigrationAutodetector
        from django.db.migrations.questioner import NonInteractiveMigrationQuestioner
        from django.db.migrations.state import ProjectState

        loader = MigrationLoader(None, ignore_no_migrations=True)

        # If the graph is broken, say so rather than reporting a confusing
        # "missing migration" for every model in the project.
        analyzer_leaves = [
            name for app_label, name in loader.graph.leaf_nodes()
            if app_label == "analyzer"
        ]
        if len(analyzer_leaves) > 1:
            self.skipTest(
                "Migration graph has multiple leaves; "
                "test_analyzer_has_exactly_one_leaf_migration covers that."
            )

        autodetector = MigrationAutodetector(
            loader.project_state(),
            ProjectState.from_apps(apps),
            NonInteractiveMigrationQuestioner(specified_apps=set(), dry_run=True),
        )
        changes = autodetector.changes(graph=loader.graph)

        described = {
            app: [str(op) for migration in migrations for op in migration.operations]
            for app, migrations in changes.items()
        }

        self.assertEqual(
            described,
            {},
            "Model changes have no matching migration: "
            f"{described}. Run `python manage.py makemigrations`.",
        )


class DuplicateMergeMigrationTests(SimpleTestCase):
    """Two merge migrations for the same collision are the *cause* of a split graph.

    ``test_analyzer_has_exactly_one_leaf_migration`` catches the symptom, and it
    caught this one — but only after the damage was done, and the message it
    prints ("three leaves") does not describe what actually happened, which was
    that the same merge got committed twice.

    The sequence is always the same. Two branches collide on a migration
    number. Both authors run ``makemigrations --merge``. Django does not look
    at what is already on ``main``, so it writes each of them a merge depending
    on the same pair of parents, and both merges land. The graph now has two
    tips again, and the obvious next move -- run ``makemigrations --merge`` a
    third time -- adds a merge-of-merges on top rather than removing either
    duplicate.

    ``analyzer`` reached that state twice:

    * ``0016_merge_20260819_0000`` and ``0016_merge_20260819_1833``, both empty,
      both depending on ``0015_knowndevice`` and
      ``0015_resumeanalysis_experience_level``. ``0017`` picked the ``1833``
      one, so ``0000`` sat as an orphan leaf for five days.
    * ``0021_merge_0020_merge_20260824_0025_0020_resumebadge`` and
      ``0021_merge_resumebadge_and_jd_match_fields``, both empty, both
      depending on ``0020_merge_20260824_0025`` and ``0020_resumebadge``.

    The fix in both cases is to delete one file, not to merge again. This test
    says so at the point the second one is committed.
    """

    def _empty_migrations_by_dependencies(self):
        """Map ``frozenset(dependencies) -> [migration names]`` for no-op migrations.

        Only migrations with no operations are considered. A migration that
        does something can legitimately share a parent with another one -- that
        is just two features branching off the same point. Two *empty* ones
        with an identical dependency set have no purpose other than rejoining
        the graph, and one of them is redundant by definition.
        """
        loader = MigrationLoader(None, ignore_no_migrations=True)

        grouped = {}
        for (app_label, name), migration in loader.disk_migrations.items():
            if migration.operations:
                continue
            # Swappable dependencies resolve to a tuple like
            # ("__setting__", "AUTH_USER_MODEL") and are irrelevant to whether
            # two merges rejoin the same pair of parents, so drop them.
            parents = frozenset(
                dependency
                for dependency in migration.dependencies
                if not (dependency and dependency[0].startswith("__"))
            )
            if not parents:
                continue
            grouped.setdefault((app_label, parents), []).append(name)

        return grouped

    def test_no_two_merge_migrations_rejoin_the_same_parents(self):
        duplicates = {
            f"{app_label}: {sorted(parent[1] for parent in parents)}": sorted(names)
            for (app_label, parents), names in self._empty_migrations_by_dependencies().items()
            if len(names) > 1
        }

        self.assertEqual(
            duplicates,
            {},
            "These merge migrations are duplicates of each other -- each group "
            f"rejoins exactly the same parents: {duplicates}. Delete all but "
            "one of the files in each group; do not run "
            "`makemigrations --merge` again, which would add a "
            "merge-of-merges on top and leave the duplicates in place.",
        )

    def test_every_merge_migration_is_reachable_from_the_leaf(self):
        """An empty merge nothing depends on is dead weight and a spare leaf.

        ``0016_merge_20260819_0000`` was exactly this: a merge that rejoined
        the graph correctly and was then bypassed, because ``0017`` listed the
        other merge as its parent. It contributed nothing and broke every
        ``manage.py`` command for as long as it sat there.
        """
        loader = MigrationLoader(None, ignore_no_migrations=True)

        leaves = {
            (app_label, name)
            for app_label, name in loader.graph.leaf_nodes()
        }

        orphans = sorted(
            f"{app_label}.{name}"
            for (app_label, name), migration in loader.disk_migrations.items()
            if not migration.operations
            and (app_label, name) in leaves
            and len(migration.dependencies) > 1
        )

        # A no-op merge that is itself the single leaf of its app is fine --
        # that is the normal state right after a merge. Only flag one that is a
        # leaf *alongside* another leaf in the same app.
        leaves_per_app = {}
        for app_label, name in leaves:
            leaves_per_app.setdefault(app_label, []).append(name)
        orphans = [
            orphan
            for orphan in orphans
            if len(leaves_per_app.get(orphan.split(".", 1)[0], [])) > 1
        ]

        self.assertEqual(
            orphans,
            [],
            f"These merge migrations are leaves that nothing builds on: {orphans}. "
            "Either the migration that should follow them names a different "
            "parent, or they are leftovers from a merge that was committed "
            "twice. Delete them rather than adding another merge on top.",
        )
