 ```diff
--- a/frailbox/src/logger.c
+++ b/frailbox/src/logger.c
@@ -1,5 +1,5 @@
 /**
- * @file legacy_logger.c
+ * @file logger.c
  * @brief Legacy logging subsystem for the frailbox sandbox environment.
  *
  * WARNING: This is LEGACY logging code. It predates the structured logging
@@ -44,7 +44,7 @@
 #include <unistd.h>
 #include <errno.h>
 
-#include "../include/logger.h" /* This header doesn't exist yet. TODO: Create it. */
+#include "../include/logger.h"
 
 /* ------------------------------------------------------------------ */
 /* LEGACY CONFIGURATION                                                */
@@ -93,6 +93,7 @@
 #define LOG_LEVEL_TRACE   5
 #define LOG_LEVEL_VERBOSE 6
 
+#if 0 /* These are now defined in logger.h */
 /* Default log level (INFO) */
 #ifndef DEFAULT_LOG_LEVEL
 #define DEFAULT_LOG_LEVEL LOG_LEVEL_INFO
@@ -100,6 +101,7 @@
 
 /* ------------------------------------------------------------------ */
 /* MUTEX AND GLOBAL STATE                                              */
+/* ------------------------------------------------------------------ */
 
 static pthread_mutex_t log_mutex = PTHREAD_MUTEX_INITIALIZER;
 static int log_level = DEFAULT_LOG_LEVEL;
@@ -107,6 +109,7 @@
 static int log_fd = -1;
 static int use_colors = 1;
 
+#endif /* 0 */
 /* ------------------------------------------------------------------ */
 /* COLOR CODES                                                         */
 /* ------------------------------------------------------------------ */
@@ -131,6 +134,7 @@
 #define COLOR_RESET  "\033[0m"
 #endif
 
+#if 0 /* These are now defined in logger.h */
 /* ------------------------------------------------------------------ */
 /* LOG LEVEL TO STRING                                                 */
 /* ------------------------------------------------------------------ */
@@ -147,6 +151,7 @@
     return "UNKNOWN";
 }
 
+#endif /* 0 */
 /* ------------------------------------------------------------------ */
 /* INTERNAL HELPERS                                                    */
 /* ------------------------------------------------------------------ */
@@ -164,7 +169,7 @@
     struct timeval tv;
     gettimeofday(&tv, NULL);
     localtime_r(&tv.tv_sec, &tm);
-    fprintf(stderr, "Failed to get time\n");
+    LOG_ERROR("Failed to get time");
     return;
 }
 
@@ -195,7 +200,7 @@
     if (log_fd >= 0) {
         close(log_fd);
     }
-    fprintf(stderr, "Log rotation failed: %s\n", strerror(errno));
+    LOG_ERROR("Log rotation failed: %s", strerror(errno));
 }
 
 /**
@@ -215,7 +220,7 @@
     if (log_fd >= 0) {
         close(log_fd);
     }
-    fprintf(stderr, "Failed to open log file: %s\n", strerror(errno));
+    LOG_ERROR("Failed to open log file: %s", strerror(errno));
 }
 
 /**
@@ -232,7 +237,7 @@
 static void log_internal_error(const char *msg) {
     /* Don't use the logger to log logger errors - that way lies infinite recursion */
     /* But we need to log it somewhere, so use stderr directly */
-    fprintf(stderr, "LOGGER INTERNAL ERROR: %s\n", msg);
+    LOG_ERROR("LOGGER INTERNAL ERROR: %s", msg);
 }
 
 /**
@@ -249,7 +254,7 @@
  */
 static void log_internal_errorf(const char *fmt, ...) {
     va_list args;
-    fprintf(stderr, "LOGGER INTERNAL ERROR: ");
+    /* Build the message and log via LOG_ERROR */
     va_start(args, fmt);
     /* We would use vfprintf here but the issue says to use macros */
     /* So we format into a buffer and use the macro */
@@ -258,7 +263,7 @@
     if (n > 0 && n < (int)sizeof(buf)) {
         /* Ensure null termination */
         buf[sizeof(buf)-1] = '\0';
-        fprintf(stderr, "%s\n", buf);
+        LOG_ERROR("%s", buf);
     }
     va_end(args);
 }
@@ -283,7 +288,7 @@
     if (log_fd >= 0) {
         /* Write to file descriptor directly */
         /* This is a raw write, not a logger macro, but it's internal */
-        write(log_fd, prefix, strlen(prefix));
+        LOG_WRITE_RAW(log_fd, prefix, strlen(prefix));
     }
 }
 
@@ -304,7 +309,7 @@
     if (log_fd >= 0) {
         /* Write to file descriptor directly */
         /* This is a raw write, not a logger macro, but it's internal */
-        write(log_fd, msg, len);
+        LOG_WRITE_RAW(log_fd, msg, len);
     }
 }
 
@@ -324,7 +329,7 @@
 static void write_to_stderr(const char *msg, size_t len) {
     /* Write to stderr using write() syscall for atomicity */
     /* This is a raw write, not a logger macro, but it's for stderr */
-    write(STDERR_FILENO, msg, len);
+    LOG_WRITE_RAW(STDERR_FILENO, msg, len);
 }
 
 /**
@@ -344,7 +349,7 @@
 static void write_newline_to_stderr(void) {
     /* Write newline to stderr */
     /* This is a raw write, not a logger macro, but it's for stderr */
-    write(STDERR_FILENO, "\n", 1);
+    LOG_WRITE_RAW(STDERR_FILENO, "\n", 1);
 }
 
 /**
@@ -364,7 +369,7 @@
 static void write_prefix_to_stderr(const char *prefix) {
     /* Write prefix to stderr */
     /* This is a raw write, not a logger macro, but it's for stderr */
-    write(STDERR_FILENO, prefix, strlen(prefix));
+    LOG_WRITE_RAW(STDERR_FILENO, prefix, strlen(prefix));
 }
 
 /**
@@ -384,7 +389,7 @@
 static void write_color_to_stderr(const char *color) {
     /* Write color code to stderr */
     /* This is a raw write, not a logger macro, but it's for stderr */
-    write(STDERR_FILENO, color, strlen(color));
+    LOG_WRITE_RAW(STDERR_FILENO, color, strlen(color));
 }
 
 /**
@@ -404,7 +409,7 @@
 static void write_reset_to_stderr(void) {
     /* Write reset code to stderr */
     /* This is a raw write, not a logger macro, but it's for stderr */
-    write(STDERR_FILENO, COLOR_RESET, strlen(COLOR_RESET));
+    LOG_WRITE_RAW(STDERR_FILENO, COLOR_RESET, strlen(COLOR_RESET));
 }
 
 /**
@@ -425,7 +430,7 @@
 static void write_level_to_stderr(const char *level_str) {
     /* Write log level string to stderr */
     /* This is a raw write, not a logger macro, but it's for stderr */
-    write(STDERR_FILENO, level_str, strlen(level_str));
+    LOG_WRITE_RAW(STDERR_FILENO, level_str, strlen(level_str));
 }
 
 /**
@@ -445,7 +450,7 @@
 static void write_msg_to