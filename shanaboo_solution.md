 ```diff
--- a/build.py
+++ b/build.py
@@ -1,6 +1,7 @@
 #!/usr/bin/env python3
 
 import argparse
+import copy
 import datetime
 import getpass
 import json
@@ -10,6 +11,7 @@
 import subprocess
 import sys
 import time
+import traceback
 from dataclasses import dataclass
 from pathlib import Path
 from typing import Optional
@@ -19,6 +21,7 @@
 DIAGNOSTIC_CHUNK_SIZE = 40 * 1024 * 1024
 ENCRYPTLY_BLOCKER_MESSAGE = "encryptly could not create an archive. You may have timed out; try launching it in the background and waiting for it to finish with no timeout due to a bug in encryptly."
 
+TIMING_STATUS_OK = "ok"
 
 def current_commit_id() -> str:
     """Return the first 4 bytes (8 hex chars) of HEAD for stable per-commit diagnostics."""
@@ -56,6 +59,7 @@
     chunks: list[Path] = []
     stem = logd_path.stem
     with logd_path.open("rb") as source:
+        index = 1
         while True:
             data = source.read(chunk_size)
             if not data:
@@ -78,6 +82,7 @@
     build_dir: Optional[Path] = None
     env: Optional[dict[str, str]] = None
 
+
 MODULES = [
     Module(
         name="backend",
@@ -129,6 +134,7 @@
         name="scans",
         language="Lua",
         dir=ROOT / "scans",
+        build_cmd=["lua5.4", "scans.lua"],
         clean_cmd=["rm", "-f", "*.o"],
     ),
     Module(
@@ -140,6 +146,7 @@
         name="openapi-tools",
         language="Lua",
         dir=ROOT / "openapi-tools",
+        build_cmd=["lua5.4", "tools.lua"],
         clean_cmd=["rm", "-f", "*.o"],
     ),
 ]
@@ -148,6 +155,7 @@
 def build_module(
     module: Module,
     args: argparse.Namespace,
+    timings: list[dict],
 ) -> int:
     """Build a single module. Returns exit code."""
     print(f"\n{'=' * 60}")
@@ -155,6 +163,7 @@
     print(f"{'=' * 60}")
 
     start_time = time.time()
+    started_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
 
     # Determine if this is a clean build
     is_clean = args.clean or not _has_build_artifacts(module)
@@ -162,6 +171,7 @@
     # Run build
     env = os.environ.copy()
     if module.env:
+        env.update(module.env)
 
     try:
         result = subprocess.run(
@@ -172,15 +182,34 @@
             text=True,
         )
     except Exception as e:
+        result = subprocess.CompletedProcess(args=module.build_cmd, returncode=1, stdout="", stderr=str(e))
 
     end_time = time.time()
+    finished_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
     elapsed = end_time - start_time
 
+    status = TIMING_STATUS_OK if result.returncode == 0 else "failed"
+
+    timing_entry = {
+        "module": module.name,
+        "language": module.language,
+        "command": " ".join(module.build_cmd),
+        "started_at": started_at,
+        "finished_at": finished_at,
+        "elapsed_seconds": round(elapsed, 3),
+        "exit_code": result.returncode,
+        "status": status,
+    }
+    timings.append(timing_entry)
+
     print(f"Build completed in {elapsed:.2f}s with exit code {result.returncode}")
 
     if result.returncode != 0:
         print(f"Build failed for {module.name}")
+        print(result.stdout)
+        print(result.stderr)
         return result.returncode
 
     return 0
@@ -189,6 +218,7 @@
 def clean_module(module: Module) -> int:
     """Clean a single module. Returns exit code."""
     print(f"\n{'=' * 60}")
+    print(f"Cleaning {module.name} ({module.language})")
     print(f"{'=' * 60}")
 
     try:
@@ -199,6 +229,7 @@
             text=True,
         )
     except Exception as e:
+        print(f"Clean failed for {module.name}: {e}")
         return 1
 
     return 0
@@ -207,6 +238,7 @@
 def _has_build_artifacts(module: Module) -> bool:
     """Check if a module has existing build artifacts."""
     if module.build_dir is None:
+        return False
     return module.build_dir.exists()
 
 
@@ -214,6 +246,7 @@
     """Parse command line arguments."""
     parser = argparse.ArgumentParser(description="Build TentOfTrials modules")
     parser.add_argument("--clean", action="store_true", help="Clean build artifacts")
+    parser.add_argument("--module", dest="modules", help="Comma-separated list of modules to build")
     parser.add_argument("--release", action="store_true", help="Release mode (Rust only)")
     parser.add_argument("--timings-json", dest="timings_json", help="Write timing report to specified JSON file")
     return parser.parse_args()
@@ -221,6 +254,7 @@
 
 def main() -> int:
     args = parse_args()
+    timings: list[dict] = []
 
     # Determine which modules to build
     modules_to_build = MODULES
@@ -230,6 +264,7 @@
         valid_modules = {m.name for m in MODULES}
         invalid = requested - valid_modules
         if invalid:
+            print(f"Error: Unknown modules: {', '.join(invalid)}")
             return 1
         modules_to_build = [m for m in MODULES if m.name in requested]
 
@@ -237,6 +272,7 @@
     if args.clean:
         for module in modules_to_build:
             clean_module(module)
+        return 0
 
     # Build modules
     failed_modules = []
@@ -244,6 +280,7 @@
         exit_code = build_module(module, args, timings)
         if exit_code != 0:
             failed_modules.append(module.name)
+            # Continue building other modules to record their timings too
 
     # Print timing summary
     if timings:
@@ -251,6 +288,7 @@
         print(f"{'=' * 60}")
         print("TIMING SUMMARY (slowest first)")
         print(f"{'=' * 60}")
+        sorted_timings = sorted(timings, key=lambda x: x["elapsed_seconds"], reverse=True)
         for entry in sorted_timings:
             status_str = "✓" if entry["status"] == TIMING_STATUS