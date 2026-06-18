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
@@ -9,6 +10,7 @@
 import subprocess
 import sys
 import time
+import textwrap
 from dataclasses import dataclass
 from pathlib import Path
 from typing import Optional
@@ -17,6 +19,7 @@
 DIAGNOSTIC_DIR = ROOT / "diagnostic"
 DIAGNOSTIC_CHUNK_SIZE = 40 * 1024 * 1024
 ENCRYPTLY_BLOCKER_MESSAGE = "encryptly could not create an archive. You may have timed out; try launching it in the background and waiting for it to finish with no timeout due to a bug in encryptly."
+VALID_MODULE_NAMES = frozenset(["backend", "frontend", "market", "frailbox", "engine", "compliance", "v2", "scans", "openapi", "openapi-tools"])
 
 
 def current_commit_id() -> str:
@@ -67,6 +70,51 @@
     logd_path.unlink()
     return chunks
 
+def parse_module_selection(modules_arg: str) -> list[str]:
+    """Parse a comma-separated module string into a list of stripped module names.
+
+    >>> parse_module_selection("backend, frontend")
+    ['backend', 'frontend']
+    >>> parse_module_selection("backend")
+    ['backend']
+    >>> parse_module_selection("backend,frontend, market")
+    ['backend', 'frontend', 'market']
+    """
+    if not modules_arg:
+        return []
+    return [name.strip() for name in modules_arg.split(",") if name.strip()]
+
+
+def validate_module_selection(selected: list[str], valid: frozenset[str]) -> tuple[bool, list[str]]:
+    """Validate selected module names against a set of valid names.
+
+    Returns:
+        (True, []) if all selected modules are valid.
+        (False, [invalid_names]) if any module is invalid.
+
+    >>> validate_module_selection(["backend", "frontend"], VALID_MODULE_NAMES)
+    (True, [])
+    >>> validate_module_selection(["backend", "badmod"], VALID_MODULE_NAMES)
+    (False, ['badmod'])
+    """
+    invalid = [name for name in selected if name not in valid]
+    return (len(invalid) == 0, invalid)
+
+
+def print_module_list(valid: frozenset[str]) -> None:
+    """Print a table of valid modules with name, language, directory, and build command."""
+    # Map module names to their details for display
+    module_details = {
+        "backend": ("Rust", "backend", "cargo build"),
+        "frontend": ("TypeScript", "frontend", "npm run build"),
+        "market": ("Go", "market", "go build -o market ."),
+        "frailbox": ("C", "frailbox", "make"),
+        "engine": ("C++", "frailbox/engine", "cmake --build build"),
+        "compliance": ("Java", "compliance", "javac -d build ComplianceAuditor.java"),
+        "v2": ("Ruby", "v2", "ruby build.rb"),
+        "scans": ("Lua", "scans", "lua build.lua"),
+        "openapi": ("Haskell", "openapi", "cabal build"),
+        "openapi-tools": ("Lua", "openapi-tools", "lua build.lua"),
+    }
+    print("Valid modules:")
+    for name in sorted(valid):
+        lang, dir_name, build = module_details.get(name, ("?", name, "?"))
+        print(f"  {name:<15} {lang:<12} {dir_name:<20} {build}")
 
 @dataclass
 class Module:
@@ -77,6 +125,7 @@
     clean_cmd: list[str]
     build_dir: Optional[Path] = None
     env: Optional[dict[str, str]] = None
+    
 
 MODULES = [
     Module(
@@ -130,6 +179,8 @@
         name="v2",
         language="Ruby",
         dir=ROOT / "v2",
+        build_cmd=["ruby", "build.rb"],
+        clean_cmd=["rm", "-rf", "build"],
         build_dir=ROOT / "v2" / "build",
     ),
     Module(
@@ -137,6 +188,8 @@
         language="Lua",
         dir=ROOT / "scans",
         build_cmd=["lua", "build.lua"],
+        clean_cmd=["rm", "-rf", "build"],
+        build_dir=ROOT / "scans" / "build",
     ),
     Module(
         name="openapi",
@@ -144,6 +197,7 @@
         dir=ROOT / "openapi",
         build_cmd=["cabal", "build"],
         clean_cmd=["cabal", "clean"],
+        build_dir=ROOT / "openapi" / "dist",
     ),
     Module(
         name="openapi-tools",
@@ -151,6 +205,7 @@
         dir=ROOT / "openapi-tools",
         build_cmd=["lua", "build.lua"],
         clean_cmd=["rm", "-rf", "build"],
+        build_dir=ROOT / "openapi-tools" / "build",
     ),
 ]
 
@@ -158,6 +213,7 @@
 def parse_args() -> argparse.Namespace:
     parser = argparse.ArgumentParser(description="Build TentOfTrials modules.")
     parser.add_argument("--module", type=str, help="Comma-separated module names to build.")
+    parser.add_argument("--list-modules", action="store_true", help="List all valid modules and exit.")
     parser.add_argument("--clean", action="store_true", help="Clean build artifacts instead of building.")
     parser.add_argument("--release", action="store_true", help="Release mode (Rust only).")
     parser.add_argument("--diagnostic", action="store_true", help="Write encrypted diagnostic bundle.")
@@ -165,6 +221,10 @@
     return parser.parse_args()
 
 
+def get_valid_module_names() -> frozenset[str]:
+    return frozenset(m.name for m in MODULES)
+
+
 def run_command(cmd: list[str], cwd: Path, env: Optional[dict] = None) -> int:
     """Run a command and return its exit code."""
     merged_env = os.environ.copy()
@@ -196,6 +256,10 @@
     args = parse_args()
     start_time = time.time()
 
+    if args.list_modules:
+        print_module_list(get_valid_module_names())
+        sys.exit(0)
+
     # Determine which modules to process
     if args.module:
         selected_names = [name.strip() for name in args.module.split(",")]
@@ -204,6 +268,16 @@
         selected_names = [m.name for m in MODULES]
         selected_modules = MODULES