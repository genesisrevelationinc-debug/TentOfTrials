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
 
@@ -19,6 +20,10 @@
 DIAGNOSTIC_CHUNK_SIZE = 40 * 1024 * 1024
 ENCRYPTLY_BLOCKER_MESSAGE = "encryptly could not create an archive. You may have timed out; try launching it in the background and waiting for it to finish with no timeout due to a bug in encryptly."
 
+# Module names that are currently defined in MODULES
+# This will be populated after MODULES is defined below
+_VALID_MODULE_NAMES: set[str] = set()
+
 
 def current_commit_id() -> str:
     """Return the first 4 bytes (8 hex chars) of HEAD for stable per-commit diagnostics."""
@@ -104,6 +109,7 @@ class Module:
         clean_cmd=["rm", "-rf", "build"],
         build_dir=ROOT / "compliance" / "build",
     ),
     Module(
         name="v2",
         language="Ruby",
@@ -112,6 +118,7 @@ class Module:
         clean_cmd=["rm", "-rf", "vendor"],
         build_dir=ROOT / "v2" / "build",
     ),
+    Module(
         name="scans",
         language="Lua",
         dir=ROOT / "scans",
@@ -119,6 +126,7 @@ class Module:
         clean_cmd=["rm", "-f", "*.out"],
         build_dir=ROOT / "scans" / "scans.out",
     ),
+    Module(
         name="openapi",
         language="Haskell",
         dir=ROOT / "openapi",
@@ -126,6 +134,7 @@ class Module:
         clean_cmd=["make", "clean"],
         build_dir=ROOT / "openapi" / "openapi",
     ),
+    Module(
         name="openapi-tools",
         language="Lua",
         dir=ROOT / "openapi-tools",
@@ -134,6 +143,9 @@ class Module:
         build_dir=ROOT / "openapi-tools" / "openapi-tools",
     ),
 ]
+
+# Populate the valid module names set
+_VALID_MODULE_NAMES.update(m.name for m in MODULES)
 
 
 def run_module(module: Module, *, release: bool = False) -> bool:
@@ -201,6 +213,73 @@ def run_module(module: Module, *, release: bool = False) -> bool:
     return True
 
 
+def parse_module_selection(selection: str) -> list[str]:
+    """Parse a comma-separated module selection string into a list of module names.
+    
+    Supports comma-separated names with optional spaces.
+    
+    Args:
+        selection: Comma-separated module names, e.g. "backend, frontend" or "backend"
+        
+    Returns:
+        List of stripped module names
+        
+    >>> parse_module_selection("backend, frontend")
+    ['backend', 'frontend']
+    >>> parse_module_selection("backend")
+    ['backend']
+    >>> parse_module_selection("backend,frontend, market")
+    ['backend', 'frontend', 'market']
+    >>> parse_module_selection("")
+    []
+    """
+    if not selection or not selection.strip():
+        return []
+    return [name.strip() for name in selection.split(",") if name.strip()]
+
+
+def validate_module_names(module_names: list[str]) -> tuple[list[str], list[str]]:
+    """Validate a list of module names against known modules.
+    
+    Args:
+        module_names: List of module names to validate
+        
+    Returns:
+        Tuple of (valid_names, invalid_names)
+        
+    >>> validate_module_names(["backend", "frontend"])
+    (['backend', 'frontend'], [])
+    >>> validate_module_names(["backend", "notamodule"])
+    (['backend'], ['notamodule'])
+    """
+    valid = []
+    invalid = []
+    for name in module_names:
+        if name in _VALID_MODULE_NAMES:
+            valid.append(name)
+        else:
+            invalid.append(name)
+    return valid, invalid
+
+
+def get_module_details() -> list[dict]:
+    """Return a list of dictionaries with details for each valid module.
+    
+    Returns:
+        List of module detail dictionaries
+    """
+    details = []
+    for module in MODULES:
+        details.append({
+            "name": module.name,
+            "language": module.language,
+            "directory": str(module.dir.relative_to(ROOT)),
+            "build_command": " ".join(module.build_cmd),
+            "clean_command": " ".join(module.clean_cmd),
+            "build_directory": str(module.build_dir.relative_to(ROOT)) if module.build_dir else None,
+        })
+    return details
+
+
 def encryptly_archive(src_dir: Path, out_path: Path) -> None:
     """Attempt to create an encrypted archive using encryptly."""
     password = getpass.getpass("Enter encryptly password: ")
@@ -310,6 +389,8 @@ def main() -> None:
     parser.add_argument("--release", action="store_true", help="Release mode (Rust only)")
     parser.add_argument("--diagnostic", action="store_true", help="Generate diagnostic bundle")
     parser.add_argument("--module", type=str, help="Comma-separated module names to build")
+    parser.add_argument("--list-modules", action="store_true", help="List all available modules with details")
+    parser.add_argument("--test", action="store_true", help=argparse.SUPPRESS)
     args = parser.parse_args()
 
     if args.clean:
@@ -319,6 +400,31 @@ def main() -> None:
             sys.exit(1)
         sys.exit(0)
 
+    if args.list_modules:
+        print("Available modules:")
+        print("-" * 60)
+        for detail in get_module_details():
+            print(f"  {detail['name']}")
+            print(f"    Language: {detail['language']}")
+            print(f"    Directory: {detail['directory']}")
+            print(f"    Build: {detail['build_command']}")
+            print(f"    Clean: {detail['clean_command']}")
+            if detail['build_directory']:
+                print(f"    Output: {detail['build_directory']}")
+            print()
+        sys.exit(0)
+
+    if args.module:
+        requested_modules = parse_module_selection(args.module)
+        if not requested_modules:
+            print("Error: No valid module names provided.", file=sys.stderr)
+            sys.exit(1)
+        valid, invalid = validate_module_names(requested_modules