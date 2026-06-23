 ```diff
--- a/build.py
+++ b/build.py
@@ -1,4 +1,5 @@
 #!/usr/bin/env python3
+# -*- coding: utf-8 -*-
 
 import argparse
 import datetime
@@ -12,6 +13,7 @@
 import time
 from dataclasses import dataclass
 from pathlib import Path
+from typing import List, Set
 from typing import Optional
 
 ROOT = Path(__file__).resolve().parent
@@ -19,6 +21,7 @@
 DIAGNOSTIC_CHUNK_SIZE = 40 * 1024 * 1024
 ENCRYPTLY_BLOCKER_MESSAGE = "encryptly could not create an archive. You may have timed out; try launching it in the background and waiting for it to finish with no timeout due to a bug in encryptly."
 
+VALID_MODULE_NAMES: Set[str] = set()
 
 def current_commit_id() -> str:
     """Return the first 4 bytes (8 hex chars) of HEAD for stable per-commit diagnostics."""
@@ -115,6 +118,7 @@ class Module:
         build_dir=ROOT / "compliance" / "build",
     ),
     Module(
+        name="v2",
         language="Ruby",
         dir=ROOT / "v2",
         build_cmd=["ruby", "build.rb"],
@@ -122,6 +126,7 @@ class Module:
         build_dir=ROOT / "v2" / "build",
     ),
     Module(
+        name="scans",
         language="Lua",
         dir=ROOT / "scans",
         build_cmd=["lua", "build.lua"],
@@ -129,6 +134,7 @@ class Module:
         build_dir=ROOT / "scans" / "build",
     ),
     Module(
+        name="openapi",
         language="Haskell",
         dir=ROOT / "openapi",
         build_cmd=["cabal", "build"],
@@ -136,6 +142,7 @@ class Module:
         build_dir=ROOT / "openapi" / "dist",
     ),
     Module(
+        name="openapi-tools",
         language="Lua",
         dir=ROOT / "tools" / "openapi",
         build_cmd=["lua", "build.lua"],
@@ -144,6 +151,9 @@ class Module:
     ),
 ]
 
+# Populate VALID_MODULE_NAMES from MODULES
+VALID_MODULE_NAMES.update(m.name for m in MODULES)
+
 
 def encryptly_archive(src_dir: Path, out_path: Path, password: str) -> None:
     """Create an AES-256 encrypted archive using the encryptly CLI tool."""
@@ -276,6 +286,59 @@ def run_build(modules: list[Module], *, release: bool = False) -> dict[str, dict[
     return results
 
 
+def parse_module_selection(selection: str) -> List[str]:
+    """Parse a comma-separated module selection string into a list of module names.
+    
+    Supports comma-separated names with optional spaces.
+    
+    Args:
+        selection: Comma-separated module names, e.g. "backend, frontend" or "market"
+    
+    Returns:
+        List of stripped module names.
+    """
+    if not selection or not selection.strip():
+        return []
+    return [name.strip() for name in selection.split(",") if name.strip()]
+
+
+def validate_module_names(names: List[str]) -> None:
+    """Validate module names against known valid modules.
+    
+    Exits non-zero with a clear error listing valid module names if any are invalid.
+    
+    Args:
+        names: List of module names to validate.
+    
+    Raises:
+        SystemExit: If any module name is invalid.
+    """
+    invalid = [name for name in names if name not in VALID_MODULE_NAMES]
+    if invalid:
+        print(f"Error: Invalid module name(s): {', '.join(invalid)}", file=sys.stderr)
+        print(f"Valid module names are: {', '.join(sorted(VALID_MODULE_NAMES))}", file=sys.stderr)
+        sys.exit(1)
+
+
+def list_modules() -> None:
+    """Print a list of all available modules with their details."""
+    print("Available modules:")
+    max_name_len = max(len(m.name) for m in MODULES)
+    for module in MODULES:
+        padding = " " * (max_name_len - len(module.name) + 2)
+        print(f"  {module.name}{padding}({module.language})  ->  {module.dir}")
+
+
+def get_modules_by_names(names: List[str]) -> List[Module]:
+    """Return Module objects matching the given names.
+    
+    Args:
+        names: List of valid module names.
+    
+    Returns:
+        List of Module objects matching the names.
+    """
+    name_to_module = {m.name: m for m in MODULES}
+    return [name_to_module[name] for name in names]
+
+
 def main() -> None:
     parser = argparse.ArgumentParser(description="Build TentOfTrials modules.")
     parser.add_argument(
@@ -290,6 +353,12 @@ def main() -> None:
         default=None,
         help="Comma-separated list of modules to build (default: all)",
     )
+    parser.add_argument(
+        "--list-modules",
+        action="store_true",
+        default=False,
+        help="List all available modules and exit",
+    )
     parser.add_argument(
         "--release",
         action="store_true",
@@ -297,6 +366,10 @@ def main() -> None:
         help="Release mode (Rust only)",
     )
     args = parser.parse_args()
+    
+    if args.list_modules:
+        list_modules()
+        sys.exit(0)
 
     if args.clean:
         if args.module:
@@ -312,8 +385,12 @@ def main() -> None:
         return
 
     if args.module:
-        names = [n.strip() for n in args.module.split(",")]
-        selected = [m for m in MODULES if m.name in names]
+        names = parse_module_selection(args.module)
+        if not names:
+            print("Error: No module names provided.", file=sys.stderr)
+            sys.exit(1)
+        validate_module_names(names)
+        selected = get_modules_by_names(names)
     else:
         selected = MODULES
 
@@ -326,6 +403,7 @@ def main() -> None:
 
 if __name__ == "__main__":
     main()
+
 --- a/build.py
+++ b/build.py
@@ -1,4 +1,5 @@
 #!/usr/bin/env python3
+# -*- coding: utf-8 -*-
 
 import argparse
 import datetime
@@ -12,6 +13,7 @@
 import time
 from dataclasses import dataclass
 from pathlib import Path
+from typing import List, Set
 from typing import Optional
 
 ROOT = Path(__file__).resolve().parent
@@ -19,6 +21,7 @@
 DIAGNOSTIC