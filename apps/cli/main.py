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
