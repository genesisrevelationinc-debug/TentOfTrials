 ```diff
--- a/build.py
+++ b/build.py
@@ -1,5 +1,6 @@
 #!/usr/bin/env python3
 
+from __future__ import annotations
 import argparse
 import datetime
 import getpass
@@ -10,7 +11,7 @@
 import subprocess
 import sys
 import time
-from dataclasses import dataclass
+from dataclasses import dataclass, asdict
 from pathlib import Path
 from typing import Optional
 
@@ -19,6 +20,7 @@
 DIAGNOSTIC_CHUNK_SIZE = 40 * 1024 * 1024
 ENCRYPTLY_BLOCKER_MESSAGE = "encryptly could not create an archive. You may have timed out; try launching it in the background and waiting for it to finish with no timeout due to a bug in encryptly."
 
+TIMING_STATUS_CLEAN = "clean"
 
 def current_commit_id() -> str:
     """Return the first 4 bytes (8 hex chars) of HEAD for stable per-commit diagnostics."""
@@ -57,6 +59,7 @@
     chunks
 
 
 @dataclass
 class Module:
     name: str
     language: str
@@ -65,6 +68,19 @@
     clean_cmd: list[str]
     build_dir: Optional[Path] = None
     env: Optional[dict[str, str]] = None
+@dataclass
+class TimingEntry:
+    module: str
+    language: str
+    command: str
+    started_at: str
+    finished_at: str
+    elapsed_seconds: float
+    exit_code: int
+    status: str
+
+    def to_dict(self) -> dict:
+        return asdict(self)
+
 
 MODULES = [
     Module(
@@ -129,6 +145,7 @@
         clean_cmd=["rm", "-rf", "build"],
         build_dir=ROOT / "compliance" / "build",
     ),
+]
     Module(
         name="v2",
         language="Ruby",
@@ -161,6 +178,7 @@
         clean_cmd=["rm", "-rf", "build"],
         build_dir=ROOT / "openapi-tools" / "build",
     ),
+]
 ]
 
 
@@ -194,6 +212,7 @@
     parser.add_argument("--clean", action="store_true", help="Clean all artifacts")
     parser.add_argument("--module", type=str, default="", help="Comma-separated list of modules to build")
     parser.add_argument("--release", action="store_true", help="Release mode (Rust only)")
+    parser.add_argument("--timings-json", type=str, default=None, help="Write timing array to a JSON file")
     return parser.parse_args()
 
 
@@ -210,6 +229,7 @@
     return selected
 
 
 def run_build(module: Module, args) -> tuple[int, str]:
     """Run a module's build command and return (exit_code, log_path)."""
     print(f"Building {module.name} ({module.language})...")
@@ -224,6 +244,7 @@
         env=env,
         cwd=str(module.dir),
     )
+    return result.returncode, log_path
 
 
 def run_clean(module: Module) -> int:
@@ -237,6 +258,7 @@
     return result.returncode
 
 
 def main() -> int:
     args = parse_args()
@@ -244,6 +266,7 @@
     if not modules:
         print("No modules selected.")
         return 0
 
+    module_timings: list[TimingEntry] = []
     logd_path, metadata_path, commit_id = diagnostic_paths_for_commit()
 
     # Clean mode
@@ -258,6 +281,7 @@
     # Build mode
     password = generate_password()
     metadata = {
+        "module_timings": [],
         "commit": commit_id,
         "password": password,
         "user": getpass.getuser(),
@@ -270,6 +294,7 @@
     }
 
     overall_success = True
+    build_type = TIMING_STATUS_CLEAN if args.clean else "incremental"
 
     for module in modules:
         if not module.dir.exists():
@@ -277,12 +302,36 @@
             overall_success = False
             continue
 
+        started_at = datetime.datetime.now(datetime.timezone.utc)
+        started_at_iso = started_at.isoformat()
+
         exit_code, log_path = run_build(module, args)
+
+        finished_at = datetime.datetime.now(datetime.timezone.utc)
+        finished_at_iso = finished_at.isoformat()
+        elapsed = (finished_at - started_at).total_seconds()
+
         if exit_code != 0:
             print(f"  Build failed for {module.name} with exit code {exit_code}")
             overall_success = False
 
+        timing_entry = TimingEntry(
+            module=module.name,
+            language=module.language,
+            command=" ".join(module.build_cmd),
+            started_at=started_at_iso,
+            finished_at=finished_at_iso,
+            elapsed_seconds=elapsed,
+            exit_code=exit_code,
+            status=build_type,
+        )
+        module_timings.append(timing_entry)
+        metadata["module_timings"].append(timing_entry.to_dict())
+
+    # Write metadata with timings
+    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
+
+    # Encrypt log
+    encrypt_log(logd_path, password)
+
     # Encrypt log
     encrypt_log(logd_path, password)
 
@@ -290,6 +339,7 @@
     metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
 
     # Print timing summary
+    print("\n=== Build Timing Summary ===")
     print(f"\nBuild {'succeeded' if overall_success else 'failed'}.")
     print(f"Diagnostic log: {logd_path}")
     print(f"Metadata: {metadata_path}")
@@ -297,6 +347,26 @@
     if not overall_success:
         return 1
 
+    # Print sorted slowest-first timing summary
+    if module_timings:
+        print("\n=== Module Timing Summary (slowest first) ===")
+        sorted_timings = sorted(module_timings, key=lambda x: x.elapsed_seconds, reverse=True)
+        for entry in sorted_timings:
+            status_str = "OK" if entry.exit_code == 0 else f"FAIL({entry.exit_code})"
+            print(f"  {entry.module:15} {entry.elapsed_seconds:8.3f}s  [{status_str}]  ({entry.language})")
+        print()
+
+    # Write optional timings JSON
+    if args.timings_json:
+        timings_data = [entry.to_dict() for entry in module_timings]
+        timings_path = Path(args.timings_json)
+        timings_path.write_text(json.dumps(timings_data, indent=2), encoding="utf-8")
+        print(f"Timings written to: {timings_path