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
+from dataclasses import dataclass, field
 from pathlib import Path
 from typing import Optional
 
@@ -19,6 +20,7 @@
 DIAGNOSTIC_CHUNK_SIZE = 40 * 1024 * 1024
 ENCRYPTLY_BLOCKER_MESSAGE = "encryptly could not create an archive. You may have timed out; try launching it in the background and waiting for it to finish with no timeout due to a bug in encryptly."
 
+VALID_MODULE_NAMES = frozenset(["backend", "frontend", "market", "frailbox", "engine", "compliance", "v2", "tools", "data", "scans", "openapi", "openapi-tools"])
 
 def current_commit_id() -> str:
     """Return the first 4 bytes (8 hex chars) of HEAD for stable per-commit diagnostics."""
@@ -73,6 +75,7 @@ class Module:
     clean_cmd: list[str]
     build_dir: Optional[Path] = None
     env: Optional[dict[str, str]] = None
+    description: str = ""
 
 MODULES = [
     Module(
@@ -82,6 +85,7 @@ class Module:
         build_cmd=["cargo", "build"],
         clean_cmd=["cargo", "clean"],
         build_dir=ROOT / "backend" / "target",
+        description="Rust backend service with cargo build",
         env={"CARGO_TERM_COLOR": "always"},
     ),
     Module(
@@ -90,6 +94,7 @@ class Module:
         build_cmd=["npm", "run", "build"],
         clean_cmd=["rm", "-rf", "node_modules", "dist"],
         build_dir=ROOT / "frontend" / "dist",
+        description="TypeScript/React frontend build",
         env={"NODE_ENV": "production"},
     ),
     Module(
@@ -98,6 +103,7 @@ class Module:
         build_cmd=["go", "build", "-o", "market", "."],
         clean_cmd=["rm", "-f", "market"],
         build_dir=ROOT / "market" / "market",
+        description="Go market data service",
     ),
     Module(
         name="frailbox",
@@ -105,6 +111,7 @@ class Module:
         build_cmd=["make"],
         clean_cmd=["make", "distclean"],
         build_dir=ROOT / "frailbox" / "frailbox",
+        description="C frailbox component",
     ),
     Module(
         name="engine",
@@ -112,6 +119,7 @@ class Module:
         build_cmd=["cmake", "--build", "build"],
         clean_cmd=["rm", "-rf", "build"],
         build_dir=ROOT / "frailbox" / "engine" / "build" / "trial-engine",
+        description="C++ engine component",
     ),
     Module(
         name="compliance",
@@ -119,6 +127,7 @@ class Module:
         build_cmd=["javac", "-d", "build", "ComplianceAuditor.java"],
         clean_cmd=["rm", "-rf", "build"],
         build_dir=ROOT / "compliance" / "build",
+        description="Java compliance auditor",
     ),
     Module(
         name="v2",
@@ -126,6 +135,7 @@ class Module:
         build_cmd=["ruby", "build.rb"],
         clean_cmd=["rm", "-rf", "build"],
         build_dir=ROOT / "v2" / "build",
+        description="Ruby v2 market module",
     ),
     Module(
         name="tools",
@@ -133,6 +143,7 @@ class Module:
         build_cmd=["python3", "build_tools.py"],
         clean_cmd=["rm", "-rf", "tools_output"],
         build_dir=ROOT / "tools" / "tools_output",
+        description="Python tooling scripts",
     ),
     Module(
         name="data",
@@ -140,6 +151,7 @@ class Module:
         build_cmd=["python3", "build_data.py"],
         clean_cmd=["rm", "-rf", "data_output"],
         build_dir=ROOT / "data" / "data_output",
+        description="Python data processing",
     ),
     Module(
         name="scans",
@@ -147,6 +1
...