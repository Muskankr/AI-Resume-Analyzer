diff --git a/apps/cli/main.py b/apps/cli/main.py
index 3f5a9b2..e6c1d4b 100644
--- a/apps/cli/main.py
@@ -10,6 +10,7 @@
 import os
 import sys
 from .utils import load_resumes
+from .jd_parser import parse_jd
 
 def main():
     args = parse_args()
@@ -25,6 +26,8 @@ def main():
         resumes = load_resumes(args.resume_files)
     else:
         resumes = []
+
+    jds = parse_jd(args.jd_files)
 
     if not resumes and not jds:
         print("No files provided for processing.")
@@ -34,7 +37,10 @@ def main():
         return 1
 
     results = analyze_compatibility(resumes, jds)
-    print(results)
+    for result in results:
+        print(f"Resume: {result['resume']}, JD: {result['jd']}, Compatibility Score: {result['score']}")
+
     return 0

+--- a/apps/cli/main.py
+@@ -10,6 +10,8 @@
+ def main():
+     parser = argparse.ArgumentParser(description="Job Application CLI")
+     subparsers = parser.add_subparsers(dest="command")
++    parser.add_argument("--resume", help="Path to the candidate's resume")
++    parser.add_argument("--jd", help="Path to the job description")
+ 
+     apply_parser = subparsers.add_parser("apply", help="Apply for a job")
+     apply_parser.add_argument("position", help="Job position to apply for")
+@@ -20,6 +22,10 @@
+     apply_args = parser.parse_args()
+ 
+     if apply_args.command == "apply":
++        if not apply_args.resume or not apply_args.jd:
++            print("Both resume and job description are required.")
++            return
++
+         position = apply_args.position
+         # Add code to handle the application process here