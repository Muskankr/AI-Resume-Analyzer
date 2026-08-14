--- a/apps/cli/main.py
@@ -100,6 +100,7 @@
     try:
         # Existing code that might raise an exception
     except Exception as e:
-        print(f"Error: {e}")
+        print(f"Error: {e}", file=sys.stderr)
         sys.exit(1)
 
     return result
