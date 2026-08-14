--- a/apps/cli/main.py
@@ -100,6 +100,7 @@
     try:
         # Existing code that might raise an exception
     except Exception as e:
-        print(f"Error: {e}")
+        print(f"Error: {e}", file=sys.stderr)
         sys.exit(1)
 
     return result

+--- a/apps/cli/main.py
+@@ -10,7 +10,6 @@
+ def main():
+     # Initialize the parser
+     parser = argparse.ArgumentParser(description="AI Resume Analyzer")
+-    subparsers = parser.add_subparsers(dest="command", help="Available commands")
+ 
+     # Add command parsers here
+     # Example: