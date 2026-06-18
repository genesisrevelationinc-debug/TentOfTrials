 ```diff
--- a/backend/src/config.rs
+++ b/backend/src/config.rs
@@ -0,0 +1,218 @@
+use std::env;
+use std::fmt;
+use std::net::SocketAddr;
+use std::str::FromStr;
+
+/// Error type for configuration loading failures.
+#[derive(Debug, PartialEq)]
+pub enum ConfigError {
+    InvalidPort(String),
+    InvalidBoolean {
+        var: String,
+        value: String,
+    },
+    InvalidHost(String),
+    InvalidLogLevel(String),
+}
+
+impl fmt::Display for ConfigError {
+    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
+        match self {
+            ConfigError::InvalidPort(v) => write!(f, "invalid port: '{}'", v),
+            ConfigError::InvalidBoolean { var, value } => {
+                write!(f, "invalid boolean for {}: '{}'", var, value)
+            }
+            ConfigError::InvalidHost(v) => write!(f, "invalid host: '{}'", v),
+            ConfigError::InvalidLogLevel(v) => write!(f, "invalid log level: '{}'", v),
+        }
+    }
+}
+
+impl std::error::Error for ConfigError {}
+
+/// Typed configuration for the backend service.
+///
+/// Environment variables:
+/// - `TOT_BACKEND_HOST` - Bind address (default: "127.0.0.1")
+/// - `TOT_BACKEND_PORT` - Bind port (default: "8080")
+/// - `TOT_LOG_LEVEL` - Log level: trace, debug, info, warn, error (default: "info")
+/// - `TOT_ENABLE_EXPERIMENTAL` - Enable experimental features: true/false (default: "false")
+#[derive(Debug, PartialEq)]
+pub struct Config {
+    pub host: String,
+    pub port: u16,
+    pub log_level: String,
+    pub enable_experimental: bool,
+}
+
+impl Default for Config {
+    fn default() -> Self {
+        Config {
+            host: "127.0.0.1".to_string(),
+            port: 8080,
+            log_level: "info".to_string(),
+            enable_experimental: false,
+        }
+    }
+}
+
+impl Config {
+    /// Load configuration from environment variables with safe defaults.
+    pub fn from_env() -> Result<Self, ConfigError> {
+        let mut config = Config::default();
+
+        if let Ok(val) = env::var("TOT_BACKEND_HOST") {
+            config.host = val;
+        }
+
+        if let Ok(val) = env::var("TOT_BACKEND_PORT") {
+            config.port = parse_port(&val)?;
+        }
+
+        if let Ok(val) = env::var("TOT_LOG_LEVEL") {
+            config.log_level = validate_log_level(&val)?;
+        }
+
+        if let Ok(val) = env::var("TOT_ENABLE_EXPERIMENTAL") {
+            config.enable_experimental = parse_bool(&val, "TOT_ENABLE_EXPERIMENTAL")?;
+        }
+
+        Ok(config)
+    }
+
+    /// Return a SocketAddr from the configured host and port.
+    pub fn socket_addr(&self) -> Result<SocketAddr, std::net::AddrParseError> {
+        format!("{}:{}", self.host, self.port).parse()
+    }
+}
+
+fn parse_port(s: &str) -> Result<u16, ConfigError> {
+    s.parse::<u16>()
+        .map_err(|_| ConfigError::InvalidPort(s.to_string()))
+}
+
+fn parse_bool(s: &str, var: &str) -> Result<bool, ConfigError> {
+    match s.to_lowercase().as_str() {
+        "true" | "1" | "yes" => Ok(true),
+        "false" | "0" | "no" => Ok(false),
+        _ => Err(ConfigError::InvalidBoolean {
+            var: var.to_string(),
+            value: s.to_string(),
+        }),
+    }
+}
+
+fn validate_log_level(s: &str) -> Result<String, ConfigError> {
+    match s.to_lowercase().as_str() {
+        "trace" | "debug" | "info" | "warn" | "error" => Ok(s.to_lowercase()),
+        _ => Err(ConfigError::InvalidLogLevel(s.to_string())),
+    }
+}
+
+#[cfg(test)]
+mod tests {
+    use super::*;
+
+    #[test]
+    fn test_defaults() {
+        let config = Config::default();
+        assert_eq!(config.host, "127.0.0.1");
+        assert_eq!(config.port, 8080);
+        assert_eq!(config.log_level, "info");
+        assert_eq!(config.enable_experimental, false);
+    }
+
+    #[test]
+    fn test_valid_port() {
+        assert_eq!(parse_port("8080"), Ok(8080));
+        assert_eq!(parse_port("1"), Ok(1));
+        assert_eq!(parse_port("65535"), Ok(65535));
+    }
+
+    #[test]
+    fn test_invalid_port() {
+        assert_eq!(parse_port("0"), Ok(0));
+        assert_eq!(parse_port("65536"), Err(ConfigError::InvalidPort("65536".to_string())));
+        assert_eq!(parse_port("abc"), Err(ConfigError::InvalidPort("abc".to_string())));
+        assert_eq!(parse_port(""), Err(ConfigError::InvalidPort("".to_string())));
+    }
+
+    #[test]
+    fn test_valid_bool() {
+        assert_eq!(parse_bool("true", "VAR"), Ok(true));
+        assert_eq!(parse_bool("TRUE", "VAR"), Ok(true));
+        assert_eq!(parse_bool("1", "VAR"), Ok(true));
+        assert_eq!(parse_bool("yes", "VAR"), Ok(true));
+        assert_eq!(parse_bool("false", "VAR"), Ok(false));
+        assert_eq!(parse_bool("FALSE", "VAR"), Ok(false));
+        assert_eq!(parse_bool("0", "VAR"), Ok(false));
+        assert_eq!(parse_bool("no", "VAR"), Ok(false));
+    }
+
+    #[test]
+    fn test_invalid_bool() {
+        assert_eq!(
+            parse_bool("maybe", "TOT_ENABLE_EXPERIMENTAL"),
+            Err(ConfigError::InvalidBoolean {
+                var: "TOT_ENABLE_EXPERIMENTAL".to_string(),
+                value: "maybe".to_string(),
+            })
+        );
+    }
+
+    #[test]
+    fn test_valid_log_level() {
+        assert_eq!(validate_log_level("info"), Ok("info".to_string()));
+        assert_eq