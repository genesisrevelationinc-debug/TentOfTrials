 ```diff
--- a/build.py
+++ b/build.py
@@ -1,4 +1,5 @@
 #!/usr/bin/env python3
+# -*- coding: utf-8 -*-
 
 import argparse
 import datetime
@@ -11,6 +12,7 @@
 import sys
 import time
 from dataclasses import dataclass
+from functools import lru_cache
 from pathlib import Path
 from typing import Optional
 
@@ -19,6 +21,7 @@
 DIAGNOSTIC_CHUNK_SIZE = 40 * 1024 * 1024
 ENCRYPTLY_BLOCKER_MESSAGE = "encryptly could not create an archive. You may have timed out; try launching it in the background and waiting for it to finish with no timeout due to a bug in encryptly."
 
+_VALID_MODULE_NAMES: tuple[str, ...] = ("backend", "frontend", "market", "frailbox", "engine", "compliance", "v2", "scans", "openapi", "openapi-tools")
 
 def current_commit_id() -> str:
     """Return the first 4 bytes (8 hex chars) of HEAD for stable per-commit diagnostics."""
@@ -118,6 +121,7 @@ class Module:
         build_dir=ROOT / "compliance" / "build",
     ),
     Module(
+        name="v2",
         language="Ruby",
         dir=ROOT / "v2",
         build_cmd=["ruby", "build.rb"],
@@ -125,6 +129,7 @@ class Module:
         build_dir=ROOT / "v2" / "build",
     ),
     Module(
+        name="scans",
         language="Lua",
         dir=ROOT / "scans",
         build_cmd=["lua", "build.lua"],
@@ -132,6 +137,7 @@ class Module:
         build_dir=ROOT / "scans" / "build",
     ),
     Module(
+        name="openapi",
         language="Haskell",
         dir=ROOT / "openapi",
         build_cmd=["cabal", "build"],
@@ -139,6 +145,7 @@ class Module:
         build_dir=ROOT / "openapi" / "dist",
     ),
     Module(
+        name="openapi-tools",
         language="Lua",
         dir=ROOT / "openapi-tools",
         build_cmd=["lua", "build.lua"],
@@ -147,6 +154,51 @@ class Module:
     ),
 ]
 
+def get_valid_module_names() -> tuple[str, ...]:
+    """Return the cached tuple of valid module names."""
+    return _VALID_MODULE_NAMES
+
+
+def parse_module_selection(raw: str) -> list[str]:
+    """Parse a comma-separated module string into stripped names.
+
+    >>> parse_module_selection("backend, frontend")
+    ['backend', 'frontend']
+    >>> parse_module_selection("backend")
+    ['backend']
+    >>> parse_module_selection(" backend ,  frontend ")
+    ['backend', 'frontend']
+    """
+    if not raw or not raw.strip():
+        return []
+    return [name.strip() for name in raw.split(",") if name.strip()]
+
+
+def validate_module_selection(selection: list[str]) -> tuple[list[str], list[str]]:
+    """Validate a list of module names against known modules.
+
+    Returns:
+        A tuple of (valid_names, invalid_names).
+
+    >>> validate_module_selection(["backend", "frontend"])
+    (['backend', 'frontend'], [])
+    >>> validate_module_selection(["backend", "notamodule"])
+    (['backend'], ['notamodule'])
+    """
+    valid = []
+    invalid = []
+    valid_set = set(get_valid_module_names())
+    for name in selection:
+        if name in valid_set:
+            valid.append(name)
+        else:
+            invalid.append(name)
+    return valid, invalid
+
+
+def format_valid_modules_list() -> str:
+    """Return a human-readable string listing all valid modules."""
+    lines = ["Valid modules:"]
+    for name in get_valid_module_names():
+        lines.append(f"  - {name}")
+    return "\n".join(lines)
+
 
 def find_module(name: str) -> Module:
     for m in MODULES:
@@ -154,6 +206,18 @@ def find_module(name: str) -> Module:
             return m
     raise ValueError(f"Module '{name}' not found")
 
+
+def print_module_details() -> None:
+    """Print detailed information about all available modules."""
+    print("Available modules:")
+    print()
+    for mod in MODULES:
+        print(f"  {mod.name}")
+        print(f"    Language: {mod.language}")
+        print(f"    Directory: {mod.dir}")
+        print(f"    Build: {' '.join(mod.build_cmd)}")
+        print()
+
+
 def run_command(cmd: list[str], cwd: Path, env: Optional[dict[str, str]] = None) -> bool:
     merged = os.environ.copy()
     if env:
@@ -169,6 +233,7 @@ def run_command(cmd: list[str], cwd: Path, env: Optional[dict[str, str]] = None)
         print(f"Error running {' '.join(cmd)}: {e}")
         return False
 
+
 def build_module(mod: Module, release: bool = False) -> bool:
     print(f"\nBuilding {mod.name} ({mod.language})...")
     if mod.name == "backend" and release:
@@ -177,6 +242,7 @@ def build_module(mod: Module, release: bool = False) -> bool:
         return run_command(mod.build_cmd, mod.dir, mod.env)
     return run_command(mod.build_cmd, mod.dir, mod.env)
 
+
 def clean_module(mod: Module) -> bool:
     print(f"\nCleaning {mod.name}...")
     if mod.clean_cmd:
@@ -184,6 +250,7 @@ def clean_module(mod: Module) -> bool:
     else:
         return True
 
+
 def encrypt_log(log_path: Path) -> Optional[Path]:
     """Encrypt a log file using encryptly and return the encrypted path."""
     try:
@@ -218,6 +285,7 @@ def encrypt_log(log_path: Path) -> Optional[Path]:
         print(f"Encryption failed: {e}")
         return None
 
+
 def write_diagnostic_bundle(results: dict, password: str) -> tuple[Path, Path]:
     """Write diagnostic log and metadata for the current commit."""
     logd_path, metadata_path, commit_id = diagnostic_paths_for_commit()
@@ -249,6 +317,7 @@ def write_diagnostic_bundle(results: dict, password: str) -> tuple[Path, Path]:
 
     return logd_path, metadata_path
 
+
 def main():
     parser = argparse.ArgumentParser(description="Build script for Tent of Trials")
     parser.add_argument("--clean", action="store_true", help="Clean build artifacts")
@@ -256,11 +325,36 @@ def main():
     parser.add_argument("--module", type=str, help="