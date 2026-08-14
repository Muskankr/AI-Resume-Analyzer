--- a/apps/cli/main.py
@@ -1,5 +1,7 @@
 import sys
 from datetime import datetime
 
+from app.visual_regression_testing import run_visual_regression_tests
+
 def main():
     if len(sys.argv) < 2:
         print("Usage: python main.py [command]")
@@ -10,6 +12,8 @@ def main():
             print("Command not recognized")
 
 if __name__ == "__main__":
+    run_visual_regression_tests()
     main()

+--- a/apps/cli/main.py
+@@ -10,6 +10,7 @@
+ import click
+ from .commands import register_commands
+ 
++from .utils.visual_regression_test import run_visual_regression_tests
+ 
+ def create_cli_app():
+     app = click.Group()
+@@ -20,4 +21,5 @@ def create_cli_app():
+     register_commands(app)
+ 
+     return app
++
++run_visual_regression_tests()