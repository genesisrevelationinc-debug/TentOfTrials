```diff
--- /dev/null
+++ b/backend/src/config.rs
@@ -0,0 +1,217 @@
+use std::env;
+use std::fmt;
+use std::net::{IpAddr, Ipv4Addr, SocketAddr};
+
+/// Errors that can occur when loading configuration from environment variables.
+#[derive(Debug, PartialEq)]
+pub enum ConfigError {
+    InvalidPort(String),
+    InvalidHost(String),
+    InvalidLogLevel(String),
+    InvalidBoolean(String),
+}
+
+impl fmt::Display for ConfigError {
+    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
+        match self {
+            ConfigError::InvalidPort(val) => {
+                write!(f, "invalid port value '{}': must be an integer between 1 and 65535", val)
+            }
+            ConfigError::InvalidHost(val) => {
+                write!(f, "invalid host value '{}': must be a valid IPv4 or IPv6 address", val)
+            }
+            ConfigError::InvalidLogLevel(val) => {
+                write!(f, "invalid log level '{}': must be one of trace, debug, info, warn, error", val)
+            }
+            ConfigError::InvalidBoolean(val) => {
+                write!(f, "invalid boolean value '{}': must be 'true' or 'false' (case-insensitive)", val)
+            }
+        }
+    }
+}
+
+impl std::error::Error for ConfigError {}
+
+/// Application configuration loaded from environment variables with safe defaults.
+#[derive(Debug, Clone, PartialEq)]
+pub struct Config {
+    /// The socket address the backend server binds to.
+    pub bind_address: SocketAddr,
+    /// The log level for the application.
+    pub log_level: String,
+    /// Whether experimental features are enabled.
+    pub enable_experimental: bool,
+}
+
+impl Default for Config {
+    fn default() -> Self {
+        Config {
+            bind_address: SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 8080),
+            log_level: "info".to_string(),
+            enable_experimental: false,
+        }
+    }
+}
+
+impl Config {
+    /// Load configuration from environment variables, falling back to defaults
+    /// for any variable that is not set.
+    ///
+    /// # Supported environment variables
+    ///
+    /// - `TOT_BACKEND_HOST` — IP address to bind to (default: `127.0.0.1`)
+    /// - `TOT_BACKEND_PORT` — TCP port to listen on (default: `8080`)
+    /// - `TOT_LOG_LEVEL` — Log verbosity (default: `info`)
+    /// - `TOT_ENABLE_EXPERIMENTAL` — Enable experimental features (default: `false`)
+    ///
+    /// # Errors
+    ///
+    /// Returns a `ConfigError` if any set variable contains an invalid value.
+    pub fn from_env() -> Result<Self, ConfigError> {
+        let defaults = Config::default();
+
+        let host = match env::var("TOT_BACKEND_HOST") {
+            Ok(val) => parse_host(&val)?,
+            Err(_) => defaults.bind_address.ip(),
+        };
+
+        let port = match env::var("TOT_BACKEND_PORT") {
+            Ok(val) => parse_port(&val)?,
+            Err(_) => defaults.bind_address.port(),
+        };
+
+        let log_level = match env::var("TOT_LOG_LEVEL") {
+            Ok(val) => {
+                let normalized = val.to_lowercase();
+                if !VALID_LOG_LEVELS.contains(&normalized.as_str()) {
+                    return Err(ConfigError::InvalidLogLevel(val));
+                }
+                normalized
+            }
+            Err(_) => defaults.log_level,
+        };
+
+        let enable_experimental = match env::var("TOT_ENABLE_EXPERIMENTAL") {
+            Ok(val) => parse_bool(&val)?,
+            Err(_) => defaults.enable_experimental,
+        };
+
+        Ok(Config {
+            bind_address: SocketAddr::new(host, port),
+            log_level,
+            enable_experimental,
+        })
+    }
+}
+
+const VALID_LOG_LEVELS: &[&str] = &["trace", "debug", "info", "warn", "error"];
+
+fn parse_host(val: &str) -> Result<IpAddr, ConfigError> {
+    val.parse::<IpAddr>()
+        .map_err(|_| ConfigError::InvalidHost(val.to_string()))
+}
+
+fn parse_port(val: &str) -> Result<u16, ConfigError> {
+    let port: u16 = val
+        .parse()
+        .map_err(|_| ConfigError::InvalidPort(val.to_string()))?;
+    if port == 0 {
+        return Err(ConfigError::InvalidPort(val.to_string()));
+    }
+    Ok(port)
+}
+
+fn parse_bool(val: &str) -> Result<bool, ConfigError> {
+    match val.to_lowercase().as_str() {
+        "true" => Ok(true),
+        "false" => Ok(false),
+        _ => Err(ConfigError::InvalidBoolean(val.to_string())),
+    }
+}
+
+#[cfg(test)]
+mod tests {
+    use super::*;
+    use std::net::{Ipv6Addr};
+
+    // Helper to run a closure with a clean environment for the config vars.
+    fn with_clean_env<F>(test: F)
+    where
+        F: FnOnce(),
+    {
+        // Remove the variables we care about so tests are isolated.
+        let vars = [
+            "TOT_BACKEND_HOST",
+            "TOT_BACKEND_PORT",
+            "TOT_LOG_LEVEL",
+            "TOT_ENABLE_EXPERIMENTAL",
+        ];
+        let saved: Vec<_> = vars.iter().map(|&v| (v, env::var(v).ok())).collect();
+        for &v in &vars {
+            env::remove_var(v);
+        }
+
+        test();
+
+        // Restore
+        for (v, val) in saved {
+            match val {
+                Some(s) => env::set_var(v, s),
+                None => env::remove_var(v),
+            }
+        }
+    }
+
+    #[test]
+    fn test_defaults() {
+        with_clean_env(