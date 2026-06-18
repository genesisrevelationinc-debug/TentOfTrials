 ```diff
--- a/frailbox/src/logger.c
+++ b/frailbox/src/logger.c
@@ -1,4 +1,4 @@
 /**
- * @file legacy_logger.c
+ * @file logger.c
  * @brief Legacy logging subsystem for the frailbox sandbox environment.
  *
  * WARNING: This is LEGACY logging code. It predates the structured logging
@@ -35,7 +35,7 @@
 #define _GNU_SOURCE
 #define _DEFAULT_SOURCE
 #include <stdio.h>
-#include <stdlib.h>
+#include <stdlib.h>
 #include <string.h>
 #include <stdarg.h>
 #include <time.h>
@@ -44,7 +44,7 @@
 #include <unistd.h>
 #include <errno.h>
 
-#include "../include/logger.h" /* This header doesn't exist yet. TODO: Create it. */
+#include "../include/logger.h"
 
 /* ------------------------------------------------------------------ */
 /* LEGACY CONFIGURATION                                                */
@@ -57,7 +57,7 @@
  * The syslog integration was removed in 2020.
  */
 #ifndef MAX_LOG_LINE
-#define MAX_LOG_LINE 4096
+#define MAX_LOG_LINE 4096
 #endif
 
 /**
@@ -68,7 +68,7 @@
  * TODO: Test the crash reporter integration with the ring buffer.
  */
 #ifndef RING_BUFFER_SIZE
-#define RING_BUFFER_SIZE 1024
+#define RING_BUFFER_SIZE 1024
 #endif
 
 /**
@@ -78,7 +78,7 @@
  * Yes, that Bush administration.
  */
 #ifndef DEFAULT_LOG_PREFIX
-#define DEFAULT_LOG_PREFIX "[%Y-%m-%d %H:%M:%S] [%s] %s:%d: "
+#define DEFAULT_LOG_PREFIX "[%Y-%m-%d %H:%M:%S] [%s] %s:%d: "
 #endif
 
 /* Log level constants */
@@ -91,7 +91,7 @@
 
 /* Default log level (INFO) */
 #ifndef DEFAULT_LOG_LEVEL
-#define DEFAULT_LOG_LEVEL LOG_LEVEL_INFO
+#define DEFAULT_LOG_LEVEL LOG_LEVEL_INFO
 #endif
 
 /* ------------------------------------------------------------------ */
@@ -100,7 +100,7 @@
 
 /**
  * Mutex to protect log output and global state.
 */
-#include "../include/logger.h" /* This header doesn't exist yet. TODO: Create it. */
+#include "../include/logger.h"
 
 /* ------------------------------------------------------------------ */
 /* LEGACY CONFIGURATION                                                */
@@ -113,7 +113,7 @@
  * The syslog integration was removed in 2020.
  */
 #ifndef MAX_LOG_LINE
-#define MAX_LOG_LINE 4096
+#define MAX_LOG_LINE 4096
 #endif
 
 /**
@@ -124,7 +124,7 @@
  * TODO: Test the crash reporter integration with the ring buffer.
  */
 #ifndef RING_BUFFER_SIZE
-#define RING_BUFFER_SIZE 1024
+#define RING_BUFFER_SIZE 1024
 #endif
 
 /**
@@ -134,7 +134,7 @@
  * Yes, that Bush administration.
  */
 #ifndef DEFAULT_LOG_PREFIX
-#define DEFAULT_LOG_PREFIX "[%Y-%m-%d %H:%M:%S] [%s] %s:%d: "
+#define DEFAULT_LOG_PREFIX "[%Y-%m-%d %H:%M:%S] [%s] %s:%d: "
 #endif
 
 /* Log level constants */
@@ -147,7 +147,7 @@
 
 /* Default log level (INFO) */
 #ifndef DEFAULT_LOG_LEVEL
-#define DEFAULT_LOG_LEVEL LOG_LEVEL_INFO
+#define DEFAULT_LOG_LEVEL LOG_LEVEL_INFO
 #endif
 
 /* ------------------------------------------------------------------ */
@@ -156,7 +156,7 @@
 
 /**
  * Mutex to protect log output and global state.
- */
+ */
 static pthread_mutex_t g_log_mutex = PTHREAD_MUTEX_INITIALIZER;
 
 /**
@@ -164,7 +164,7 @@
  * This is used by the log rotation to determine when to rotate.
  * The rotation size is 10MB by default.
  * TODO: Make this configurable at runtime.
- */
+ */
 static size_t g_log_rotation_size = 10 * 1024 * 1024;
 
 /**
@@ -172,7 +172,7 @@
  * This is used to filter log messages based on severity.
  * Messages with a level higher than this are discarded.
  * TODO: Add per-module log levels.
- */
+ */
 static int g_current_log_level = DEFAULT_LOG_LEVEL;
 
 /**
@@ -180,7 +180,7 @@
  * This is used by the log rotation to determine the current log file.
  * If this is NULL, log rotation is disabled and logs go to stderr.
  * TODO: Add support for multiple log files (one per module).
- */
+ */
 static char *g_log_file_path = NULL;
 
 /**
@@ -188,7 +188,7 @@
  * This is used to track the current size of the log file for rotation.
  * If log rotation is disabled, this is not used.
  * TODO: Add support for log file size limits per file.
- */
+ */
 static size_t g_current_log_size = 0;
 
 /**
@@ -196,7 +196,7 @@
  * This is used to track whether the logger has been initialized.
  * If the logger is not initialized, log messages go to stderr.
  * TODO: Remove this and make log_init() mandatory.
- */
+ */
 static int g_logger_initialized = 0;
 
 /**
@@ -204,7 +204,7 @@
  * This is used by the crash reporter to include recent log entries.
  * The ring buffer is a circular buffer of log entries.
  * TODO: Make this thread-safe without holding the global mutex.
- */
+ */
 static char g_ring_buffer[RING_BUFFER_SIZE][MAX_LOG_LINE];
 static size_t g_ring_buffer_head = 0;
 static size_t g_ring_buffer_count = 0;
@@ -214,7 +214,7 @@
  * This is used to format log messages with timestamps and other metadata.
  * The prefix format is specified by DEFAULT_LOG_PREFIX.
  * TODO: Add support for custom prefix formats.
- */
+ */
 static char g_log_prefix_buffer[256];
 
 /* ------------------------------------------------------------------ */
@@ -223,7 +223,7 @@
 
 /**
  * Get the string representation of a log level.
- */
+ */
 static const char *log_level_to_string(int level)
 {
     switch (level) {
@@ -234,7 +234,7 @@
         case LOG_LEVEL_DEBUG:   return "DEBUG";
         case LOG_LEVEL_TRACE:   return "TRACE";
         case LOG_LEVEL_VERBOSE: return "VERBOSE";
-        default:                return "UNKNOWN";
+        default:                return "UNKNOWN";
     }
 }
 
@@ -242,7 +242,7 @@
  * Write a log entry to the in-memory ring buffer.
  * This is called by the crash reporter to include recent log entries.
  * TODO: Make this thread-safe without holding the global mutex