 ```diff
--- a/backend/src/config.rs
+++ b/backend/src/config.rs
@@ -0,0 +1,218 @@
+use std::env;
+use std::fmt;
+use std::net::SocketAddr;
+use std::str::FromStr;
+
+/// Configuration for the TentOfTrials backend.
+///
+/// Loaded from environment variables with safe defaults for local development.
+#[derive(Debug, Clone, PartialEq)]
+pub struct Config {
+    /// Host address to bind to
+    pub host: String,
+    /// Port to listen on
+    pub port: u16,
+    /// Log level (e.g., "info", "debug", "warn", "error")
+    pub log_level: String,
+    /// Enable experimental features
+    pub enable_experimental: bool,
+}
+
+/// Errors that can occur when loading configuration.
+#[derive(Debug, PartialEq)]
+pub enum ConfigError {
+    InvalidPort(String),
+    InvalidBoolean(String),
+    MissingValue(String),
+}
+
+impl fmt::Display for ConfigError {
+    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
+        match self {
+            ConfigError::InvalidPort(val) => write!(f, "invalid port '{}': must be a number between 1 and 65535", val),
+            ConfigError::InvalidBoolean(val) => write!(f, "invalid boolean '{}': expected 'true' or 'false'", val),
+            ConfigError::MissingValue(var) => write!(f, "missing required value for {}", var),
+        }
+    }
+}
+
+impl std::error::Error for ConfigError {}
+
+impl Config {
+    /// Default host for local development.
+    const DEFAULT_HOST: &'static str = "127.0.0.1";
+    /// Default port for local development.
+    const DEFAULT_PORT: u16 = 8080;
+    /// Default log level.
+    const DEFAULT_LOG_LEVEL: &'static str = "info";
+    /// Default experimental features flag.
+    const DEFAULT_ENABLE_EXPERIMENTAL: bool = false;
+
+    /// Environment variable for host.
+    const ENV_HOST: &'static str = "TOT_BACKEND_HOST";
+    /// Environment variable for port.
+    const ENV_PORT: &'static str = "TOT altriT_BACKEND_PORT";
+    /// Environment variable for log level.
+    const ENV_LOG_LEVEL: &'static str = "TOT_LOG_LEVEL";
+    /// Environment variable for experimental features.
+    const ENV_ENABLE_EXPERIMENTAL: &'static str = "TOT_ENABLE_EXPERIMENTAL";
+
+    /// Load configuration from environment variables with safe defaults.
+    pub fn from_env() -> Result<Self, ConfigError> {
+        let host = env::var(Self::ENV_HOST)
+            .unwrap_or_else(|_| Self::DEFAULT_HOST.to_string());
+
+        let port = if let Ok(port_str) = env::var(Self::ENV_PORT) {
+            if port_str.is_empty() {
+                Self::DEFAULT_PORT
+            } else {
+                port_str
+                    .parse::<u16>()
+                    .map_err(|_| ConfigError::InvalidPort(port_str))?
+            }
+        } else {
+            Self::DEFAULT_PORT
+        };
+
+        let log_level = env::var(Self::ENV_LOG_LEVEL)
+            .unwrap_or_else(|_| Self::DEFAULT_LOG_LEVEL.to_string());
+
+        let enable_experimental = if let Ok(val) = env::var(Self::ENV_ENABLE_EXPERIMENTAL) {
+            parse_bool(&val)?
+        } else {
+            Self::DEFAULT_ENABLE_EXPERIMENTAL
+        };
+
+        Ok(Config {
+            host,
+            port,
+            log_level,
+            enable_experimental,
+        })
+    }
+
+    /// Get the socket address for binding.
+    pub fn socket_addr(&self) -> Result<SocketAddr, std::net::AddrParseError> {
+        let addr_str = format!("{}:{}", self.host, self.port);
+        SocketAddr::from_str(&addr_str)
+    }
+
+    /// Get the socket address string.
+    pub fn bind_address(&self) -> String {
+        format!("{}:{}", self.host, self.port)
+    }
+}
+
+/// Parse a boolean value from a string.
+fn parse_bool(val: &str) -> Result<bool, ConfigError> {
+    match val.to_lowercase().as_str() {
+        "true" | "1" | "yes" | "on" => Ok(true),
+        "false" | "0" | "no" | "off" => Ok(false),
+        _ => Err(ConfigError::InvalidBoolean(val.to_string())),
+    }
+}
+
+#[cfg(test)]
+mod tests {
+    use super::*;
+
+    #[test]
+    fn test_config_defaults() {
+        // Ensure no env vars are set
+        env::remove_var(Config::ENV_HOST);
+        env::remove_var(Config::ENV_PORT);
+        env::remove_var(Config::ENV_LOG_LEVEL);
+        env::remove_var(Config::ENV_ENABLE_EXPERIMENTAL);
+
+        let config = Config::from_env().unwrap();
+        assert_eq!(config.host, "127.0.0.1");
+        assert_eq!(config.port, 8080);
+        assert_eq!(config.log_level, "info");
+        assert_eq!(config.enable_experimental, false);
+    }
+
+    #[test]
+    fn test_config_valid_overrides() {
+        env::set_var("TOT_BACKEND_HOST", "0.0.0.0");
+        env::set_var("TOT_BACKEND_PORT", "9000");
+        env::set_var("TOT_LOG_LEVEL", "debug");
+        env::set_var("TOT_ENABLE_EXPERIMENTAL", "true");
+
+        let config = Config::from_env().unwrap();
+        assert_eq!(config.host, "0.0.0.0");
+        assert_eq!(config.port, 9000);
+        assert_eq!(config.log_level, "debug");
+        assert_eq!(config.enable_experimental, true);
+
+        // Clean up
+        env::remove_var("TOT_BACKEND_HOST");
+        env::remove_var("TOT_BACKEND_PORT");
+        env::remove_var("TOT_LOG_LEVEL");
+        env::remove_var("TOT_ENABLE_EXPERIMENTAL");
+    }
+
+    #[test]
+    fn test_config_invalid_port() {
+        env::set_var("TOT_BACKEND_PORT", "not_a_port");
+
+        let result = Config::from_env();
+        assert!(matches!(result, Err(ConfigError::InvalidPort(_))));
+
+        env::remove_var("TOT_BACKEND_PORT");
+    }
+
+    #[test]
+    fn test_config_invalid_port_zero() {
+        env::set_var("