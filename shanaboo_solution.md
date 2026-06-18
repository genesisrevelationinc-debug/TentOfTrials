```diff
--- a/backend/src/config.rs
+++ b/backend/src/config.rs
@@ -0,0 +1,178 @@
+use std::env;
+use std::net::{IpAddr, Ipv4Addr, SocketAddr};
+
+/// Configuration for the Tent of Trials backend, loaded from environment variables.
+#[derive(Debug, Clone, PartialEq)]
+pub struct Config {
+    /// The host address to bind to.
+    pub host: IpAddr,
+    /// The port to listen on.
+    pub port: u16,
+    /// The log level for the application.
+    pub log_level: String,
+    /// Whether experimental features are enabled.
+    pub enable_experimental: bool,
+}
+
+impl Config {
+    /// Load configuration from environment variables with safe defaults.
+    ///
+    /// # Environment Variables
+    ///
+    /// - `TOT_BACKEND_HOST` — IP address to bind to (default: `127.0.0.1`)
+    /// - `TOT_BACKEND_PORT` — Port to listen on (default: `8080`)
+    /// - `TOT_LOG_LEVEL` — Log level: `trace`, `debug`, `info`, `warn`, `error` (default: `info`)
+    /// - `TOT_ENABLE_EXPERIMENTAL` — Enable experimental features: `true` or `false` (default: `false`)
+    ///
+    /// # Errors
+    ///
+    /// Returns an error if:
+    /// - `TOT_BACKEND_HOST` is set to an invalid IP address
+    /// - `TOT_BACKEND_PORT` is set to an invalid port number (not in range 1–65535)
+    /// - `TOT_ENABLE_EXPERIMENTAL` is set to a value that is not `true` or `false`
+    pub fn from_env() -> Result<Self, String> {
+        let host = match env::var("TOT_BACKEND_HOST") {
+            Ok(val) => val
+                .parse::<IpAddr>()
+                .map_err(|_| format!("Invalid TOT_BACKEND_HOST: '{}'. Must be a valid IP address.", val))?,
+            Err(_) => IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)),
+        };
+
+        let port = match env::var("TOT_BACKEND_PORT") {
+            Ok(val) => {
+                let port_num: u16 = val
+                    .parse()
+                    .map_err(|_| format!("Invalid TOT_BACKEND_PORT: '{}'. Must be a valid port number (1-65535).", val))?;
+                if port_num == 0 {
+                    return Err(format!(
+                        "Invalid TOT_BACKEND_PORT: '{}'. Port must be between 1 and 65535.",
+                        val
+                    ));
+                }
+                port_num
+            }
+            Err(_) => 8080,
+        };
+
+        let log_level = env::var("TOT_LOG_LEVEL").unwrap_or_else(|_| "info".to_string());
+
+        let enable_experimental = match env::var("TOT_ENABLE_EXPERIMENTAL") {
+            Ok(val) => match val.to_lowercase().as_str() {
+                "true" | "1" => true,
+                "false" | "0" => false,
+                _ => {
+                    return Err(format!(
+                        "Invalid TOT_ENABLE_EXPERIMENTAL: '{}'. Must be 'true' or 'false'.",
+                        val
+                    ))
+                }
+            },
+            Err(_) => false,
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
+    /// Returns the socket address derived from the host and port.
+    pub fn socket_addr(&self) -> SocketAddr {
+        SocketAddr::new(self.host, self.port)
+    }
+}
+
+#[cfg(test)]
+mod tests {
+    use super::*;
+    use std::env;
+
+    fn clear_env() {
+        env::remove_var("TOT_BACKEND_HOST");
+        env::remove_var("TOT_BACKEND_PORT");
+        env::remove_var("TOT_LOG_LEVEL");
+        env::remove_var("TOT_ENABLE_EXPERIMENTAL");
+    }
+
+    #[test]
+    fn test_defaults() {
+        clear_env();
+        let config = Config::from_env().expect("should load defaults");
+        assert_eq!(config.host, IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)));
+        assert_eq!(config.port, 8080);
+        assert_eq!(config.log_level, "info");
+        assert!(!config.enable_experimental);
+    }
+
+    #[test]
+    fn test_valid_overrides() {
+        clear_env();
+        env::set_var("TOT_BACKEND_HOST", "0.0.0.0");
+        env::set_var("TOT_BACKEND_PORT", "9090");
+        env::set_var("TOT_LOG_LEVEL", "debug");
+        env::set_var("TOT_ENABLE_EXPERIMENTAL", "true");
+
+        let config = Config::from_env().expect("should load overrides");
+        assert_eq!(config.host, IpAddr::V4(Ipv4Addr::new(0, 0, 0, 0)));
+        assert_eq!(config.port, 9090);
+        assert_eq!(config.log_level, "debug");
+        assert!(config.enable_experimental);
+    }
+
+    #[test]
+    fn test_invalid_port_zero() {
+        clear_env();
+        env::set_var("TOT_BACKEND_PORT", "0");
+        let result = Config::from_env();
+        assert!(result.is_err());
+        assert!(result.unwrap_err().contains("TOT_BACKEND_PORT"));
+    }
+
+    #[test]
+    fn test_invalid_port_negative() {
+        clear_env();
+        env::set_var("TOT_BACKEND_PORT", "-5");
+        let result = Config::from_env();
+        assert!(result.is_err());
+        assert!(result.unwrap_err().contains("TOT_BACKEND_PORT"));
+    }
+
+    #[test]
+    fn test_invalid_port_string() {
+        clear_env();
+        env::set_var("TOT_BACKEND_PORT", "abc");
+        let result