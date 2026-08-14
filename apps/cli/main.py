diff --git a/apps/cli/main.py b/apps/cli/main.py
--- a/apps/cli/main.py
@@ -10,7 +10,8 @@ import click
 
 from .history import HistoryCommandGroup
 from .notifications import NotificationsCommandGroup
 
 @click.group()
 def cli():
     """Main CLI entry point."""
-    pass
+    history_command_group = HistoryCommandGroup()
+    notifications_command_group = NotificationsCommandGroup()
 
     # Subcommands for history and notifications
     cli.add_command(history_command_group)
     cli.add_command(notifications_command_group)
