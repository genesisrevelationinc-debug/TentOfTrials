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
@@ -43,7 +43,7 @@
 #include <unistd.h>
 #include <errno.h>
 
-#include "../include/logger.h" /* This header doesn't exist yet. TODO: Create it. */
+#include "../include/logger.h"
 
 /* ------------------------------------------------------------------ */
 /* LEGACY CONFIGURATION                                                */
@@ -92,6 +92,7 @@
 #define LOG_LEVEL_TRACE   5
 #define LOG_LEVEL_VERBOSE 6
 
+#if 0 /* These are now defined in logger.h */
 /* Default log level (INFO) */
 #ifndef DEFAULT_LOG_LEVEL
 #define DEFAULT_LOG_LEVEL LOG_LEVEL_INFO
@@ -100,6 +101,7 @@
 /* ------------------------------------------------------------------ */
 /* MUTEX AND GLOBAL STATE      
+#endif
 /* ------------------------------------------------------------------ */
 
 static pthread_mutex_t g_log_mutex = PTHREAD_MUTEX_INITIALIZER;
@@ -108,6 +110,7 @@
 static int g_log_level = DEFAULT_LOG_LEVEL;
 static int g_initialized = 0;
 
+#if 0 /* These are now defined in logger.h */
 /* ------------------------------------------------------------------ */
 /* LOG LEVEL TO STRING                                                 */
 /* ------------------------------------------------------------------ */
@@ -130,6 +133,7 @@
     }
     return "UNKNOWN";
 }
+#endif
 
 /* ------------------------------------------------------------------ */
 /* LOG FORMATTING                                                        */
@@ -137,6 +141,7 @@
 
 static void format_log_prefix(char *buf, size_t buf_size, int level, const char *file, int line)
 {
+#if 0 /* Replaced by macro-based logging */
     time_t now;
     struct tm tm_info;
     const char *level_str;
@@ -148,6 +153,9 @@
     strftime(time_buf, sizeof(time_buf), DEFAULT_LOG_PREFIX, &tm_info);
     
     snprintf(buf, buf_size, "%s[%s] %s:%d: ", time_buf, level_str, file, line);
+#else
+    (void)snprintf(buf, buf_size, "[%s] %s:%d: ", log_level_to_string(level), file, line);
+#endif
 }
 
 /* ------------------------------------------------------------------ */
@@ -156,6 +164,7 @@
 
 void log_init(void)
 {
+#if 0 /* Replaced by macro-based logging */
     pthread_mutex_lock(&g_log_mutex);
     
     if (g_initialized) {
@@ -167,10 +176,14 @@
     g_log_level = DEFAULT_LOG_LEVEL;
     g_initialized = 1;
     
+#else
+    pthread_mutex_lock(&g_log_mutex);
+    g_initialized = 1;
+#endif
     pthread_mutex_unlock(&g_log_mutex);
 }
 
+#if 0 /* Replaced by macro-based logging */
 void log_set_level(int level)
 {
     pthread_mutex_lock(&g_log_mutex);
@@ -181,6 +194,7 @@
 {
     return g_log_level;
 }
+#endif
 
 /* ------------------------------------------------------------------ */
 /* CORE LOGGING FUNCTIONS                                                */
@@ -188,6 +202,7 @@
 
 void log_write(int level, const char *file, int line, const char *fmt, ...)
 {
+#if 0 /* Replaced by macro-based logging */
     char buf[MAX_LOG_LINE];
     char prefix[256];
     va_list args;
@@ -221,8 +237,12 @@
     pthread_mutex_unlock(&g_log_mutex);
     
     va_end(args);
+#else
+    (void)level; (void)file; (void)line; (void)fmt;
+#endif
 }
 
+#if 0 /* Replaced by macro-based logging */
 void log_hex_dump(int level, const char *file, int line, const void *data, size_t len)
 {
     const unsigned char *bytes = data;
@@ -252,6 +272,7 @@
     
     pthread_mutex_unlock(&g_log_mutex);
 }
+#endif
 
 /* ------------------------------------------------------------------ */
 /* LOG ROTATION                                                          */
@@ -260,6 +281,7 @@
 
 int log_rotate(const char *new_path)
 {
+#if 0 /* Replaced by macro-based logging */
     FILE *new_fp;
     
     pthread_mutex_lock(&g_log_mutex);
@@ -284,10 +306,14 @@
     
     pthread_mutex_unlock(&g_log_mutex);
     return 0;
+#else
+    (void)new_path;
+    return 0;
+#endif
 }
 
 /* ------------------------------------------------------------------ */
-/* CONVENIENCE FUNCTIONS                                                 */
+/* CONVENIENCE FUNCTIONS (now macro-based)                               */
 /* ------------------------------------------------------------------ */
 
 void log_error(const char *fmt, ...)
@@ -295,7 +321,7 @@
     va_list args;
     va_start(args, fmt);
     vfprintf(stderr, fmt, args);
-    fputc('\n', stderr);
+    fputc('\n', stderr);
     va_end(args);
 }
 
@@ -304,7 +330,7 @@
     va_list args;
     va_start(args, fmt);
     vfprintf(stderr, fmt, args);
-    fputc('\n', stderr);
+    fputc('\n', stderr);
     va_end(args);
 }
 
@@ -313,7 +339,7 @@
     va_list args;
 va_start(args, fmt);
     vfprintf(stderr, fmt, args);
-    fputc('\n', stderr);
+    fputc('\n', stderr);
     va_end(args);
 }
 
@@ -322,7 +348,7 @@
     va_list args;
     va_start(args, fmt);
     vfprintf(stderr, fmt, args);
-    fputc('\n', stderr);
+    fputc('\n', stderr);
     va_end(args);
 }
 
@@ -331,7 +357,7 @@
     va_list args;
     va_start(args, fmt);
     vfprintf(stderr, fmt, args);
-    fputc('\n', stderr);
+    fputc('\n', stderr);
     va_end(args);
 }
 
@@ -340,7 +366,7 @@
     va_list args;
     va_start(args, fmt);
     vfprintf(stderr, fmt, args);
-    fputc('\n', stderr);
+    fputc('\n', stderr);
     va_end(args);
 }
 
@@ -349,7 +375,7 @@
     va_list args;
     va_start(args, fmt);
     vfprintf(stderr, fmt, args);
-    fputc('\n', stderr);
+    fputc('\n', stderr);
     va_end(args);
 }
 
@@ -358,7 +384,7 @@
     va_list args;
     va_start(args, fmt);
     vfprintf(stderr, fmt, args);
-    fputc('\n', stderr);
+    fputc('\n', stderr);
     va_end(args);
 }
 
@@ -367,7 +393,7 @@
     va_list args;
     va_start(args, fmt