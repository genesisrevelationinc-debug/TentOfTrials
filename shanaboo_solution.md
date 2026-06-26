 ```diff
--- a/build.py
+++ b/build.py
@@ -1,6 +1,7 @@
 #!/usr/bin/env python3
 
 import argparse
+import csv
 import datetime
 import getpass
 import json
@@ -10,6 +11,7 @@
 import subprocess
 import sys
 import time
+import textwrap
 from dataclasses import dataclass
 from pathlib import Path
 from typing import Optional
@@ -18,6 +20,7 @@
 DIAGNOSTIC_DIR = ROOT / "diagnostic"
 DIAGNOSTIC_CHUNK_SIZE = 40 * 1024 * 1024
 ENCRYPTLY_BLOCKER_MESSAGE = "encryptly could not create an archive. You may have timed out; try launching it in the background and waiting for it to finish with no timeout due to a bug in encryptly."
+VALID_MODULE_NAMES = frozenset(["backend", "frontend", "market", "frailbox", "engine", "compliance", "v2", "scans", "openapi", "openapi-tools"])
 
 
 def current_commit_id() -> str:
@@ -73,6 +76,7 @@
     build_dir: Optional[Path] = None
     env: Optional[dict[str, str]] = None
 
+
 MODULES = [
     Module(
         name="backend",
@@ -124,6 +128,7 @@
     ),
 ]
 
+
 def run_command(cmd: list[str], cwd: Path, env: Optional[dict[str, str]] = None) -> tuple[int, str, str]:
     """Run a command and return (returncode, stdout, stderr)."""
     merged_env = os.environ.copy()
@@ -134,6 +139,7 @@
     )
     return result.returncode, result.stdout, result.stderr
 
+
 def encrypt_log(log_path: Path, password: str) -> Path:
     """Encrypt a log file using encryptly and return the encrypted path."""
     if not shutil.which("encryptly"):
@@ -155,6 +161,7 @@
         print(f"Warning: {ENCRYPTLY_BLOCKER_MESSAGE}")
     return log_path
 
+
 def build_module(module: Module, args: argparse.Namespace) -> dict:
     """Build a single module and return result metadata."""
     print(f"Building {module.name} ({module.language})...")
@@ -183,6 +190,7 @@
         "stderr": stderr,
     }
 
+
 def clean_module(module: Module) -> dict:
     """Clean a single module and return result metadata."""
     print(f"Cleaning {module.name} ({module.language})...")
@@ -198,6 +206,7 @@
         "stderr": stderr,
     }
 
+
 def write_diagnostic_metadata(metadata_path: Path, results: list[dict], password: str) -> None:
     """Write diagnostic metadata JSON."""
     metadata = {
@@ -210,6 +219,7 @@
     with open(metadata_path, "w") as f:
         json.dump(metadata, f, indent=2)
 
+
 def run_build(modules: list[Module], args: argparse.Namespace) -> list[dict]:
     """Run the build for the given modules and return results."""
     results = []
@@ -218,6 +228,7 @@
         results.append(build_module(module, args))
     return results
 
+
 def run_clean(modules: list[Module]) -> list[dict]:
     """Run clean for the given modules and return results."""
     results = []
@@ -226,6 +237,7 @@
         results.append(clean_module(module))
     return results
 
+
 def parse_args() -> argparse.Namespace:
     parser = argparse.ArgumentParser(description="Build script for Tent of Trials")
     parser.add_argument(
@@ -240,6 +252,12 @@
         help="Comma-separated list of module names to build (e.g., backend,frontend)",
     )
     parser.add_argument("--release", action="store_true", help="Release mode (Rust only)")
+    parser.add_argument(
+        "--list-modules",
+        action="store_true",
+        dest="list_modules",
+        help="List available modules with details and exit",
+    )
     return parser.parse_args()
 
 
@@ -248,6 +266,7 @@
     if args.clean:
         print("Cleaning build artifacts...")
         run_clean(modules)
+        return 0
 
     results = run_build(modules, args)
 
@@ -276,16 +295,77 @@
     return 0 if all(r["returncode"] == 0 for r in results) else 1
 
 
+def parse_module_selection(raw: str) -> list[str]:
+    """Parse a comma-separated module string into a list of stripped names.
+
+    >>> parse_module_selection("backend, frontend")
+    ['backend', 'frontend']
+    >>> parse_module_selection("backend")
+    ['backend']
+    >>> parse_module_selection("backend , frontend ,market ")
+    ['backend', 'frontend', 'market']
+    """
+    if not raw:
+        return []
+    # Use csv to handle optional spaces robustly
+    reader = csv.reader([raw], skipinitialspace=True)
+    try:
+        items = next(reader)
+    except StopIteration:
+        return []
+    return [item.strip() for item in items if item.strip()]
+
+
+def validate_module_names(names: list[str], valid: set[str]) -> tuple[list[str], list[str]]:
+    """Return (valid_names, invalid_names) from a list of candidate names.
+
+    >>> validate_module_names(["backend", "frontend"], VALID_MODULE_NAMES)
+    (['backend', 'frontend'], [])
+    >>> validate_module_names(["backend", "bogus"], VALID_MODULE_NAMES)
+    (['backend'], ['bogus'])
+    """
+    valid_names = [name for name in names if name in valid]
+    invalid_names = [name for name in names if name not in valid]
+    return valid_names, invalid_names
+
+
+def print_module_list() -> None:
+    """Print available modules and their details."""
+    print("Available modules:")
+    for module in MODULES:
+        print(f"  {module.name:<15} ({module.language})")
+
+
 def main() -> int:
     args = parse_args()
 
+    if args.list_modules:
+        print_module_list()
+        return 0
+
     if args.module:
-        selected_names = [name.strip() for name in args.module.split(",")]
-        selected_modules = [m for m in MODULES if m.name in selected_names]
+        selected_names = parse_module_selection(args.module)
+        valid_names, invalid_names = validate_module_names(selected_names, VALID_MODULE_NAMES)
+
+        if invalid_names:
+            print(f"Error: Invalid module name(s): {', '.join(invalid_names)}", file=sys.stderr)
+            print(f"Valid module names are: {', '.join(sorted(VALID_MODULE_NAMES))}", file=sys.stderr)
+            return 1
+
+        selected_modules = [m for m in MODULES if m.name in valid_names