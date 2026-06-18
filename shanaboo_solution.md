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
+    /// Host address to bind to (default: 127.0.0.1)
+    pub host: IpAddr,
+    /// Port to listen on (default: 8080)
+    pub port: u16,
+    /// Log level for the application (default: info)
+    pub log_level: String,
+    /// Enable experimental features (default: false)
+    pub enable_experimental: bool,
+}
+
+impl Config {
+    /// Load configuration from environment variables with safe defaults.
+    ///
+    /// Supported environment variables:
+    /// - `TOT_BACKEND_HOST`: IP address to bind to (default: 127.0.0.1)
+    /// - `TOT_BACKEND_PORT`: Port to listen on (default: 8080)
+    /// - `TOT_LOG_LEVEL`: Log level (default: info)
+    /// - `TOT_ENABLE_EXPERIMENTAL`: Enable experimental features (default: false)
+    ///
+    /// # Errors
+    ///
+    /// Returns an error if:
+    /// - `TOT_BACKEND_HOST` is set to an invalid IP address
+    /// - `TOT_BACKEND_PORT` is set to an invalid port number (not in range 1-65535)
+    /// - `TOT_ENABLE_EXPERIMENTAL` is set to an invalid boolean value
+    pub fn from_env() -> Result<Self, String> {
+        let host = match env::var("TOT_BACKEND_HOST") {
+            Ok(val) => val
+                .parse::<IpAddr>()
+                .map_err(|_| format!("Invalid TOT_BACKEND_HOST: '{}' is not a valid IP address", val))?,
+            Err(env::VarError::NotPresent) => IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)),
+            Err(e) => return Err(format!("Failed to read TOT_BACKEND_HOST: {}", e)),
+        };
+
+        let port = match env::var("TOT_BACKEND_PORT") {
+            Ok(val) => {
+                let port_num: u16 = val
+                    .parse()
+                    .map_err(|_| format!("Invalid TOT_BACKEND_PORT: '{}' is not a valid port number", val))?;
+                if port_num == 0 {
+                    return Err(format!(
+                        "Invalid TOT_BACKEND_PORT: '{}' is not a valid port number (must be 1-65535)",
+                        val
+                    ));
+                }
+                port_num
+            }
+            Err(env::VarError::NotPresent) => 8080,
+            Err(e) => return Err(format!("Failed to read TOT_BACKEND_PORT: {}", e)),
+        };
+
+        let log_level = match env::var("TOT_LOG_LEVEL") {
+            Ok(val) => val,
+            Err(env::VarError::NotPresent) => "info".to_string(),
+            Err(e) => return Err(format!("Failed to read TOT_LOG_LEVEL: {}", e)),
+        };
+
+        let enable_experimental = match env::var("TOT_ENABLE_EXPERIMENTAL") {
+            Ok(val) => match val.to_lowercase().as_str() {
+                "true" | "1" | "yes" | "on" => true,
+                "false" | "0" | "no" | "off" => false,
+                _ => {
+                    return Err(format!(
+                        "Invalid TOT_ENABLE_EXPERIMENTAL: '{}' is not a valid boolean value (expected true/false, 1/0, yes/no, on/off)",
+                        val
+                    ))
+                }
+            },
+            Err(env::VarError::NotPresent) => false,
+            Err(e) => return Err(format!("Failed to read TOT_ENABLE_EXPERIMENTAL: {}", e)),
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
+    /// Returns the socket address derived from host and port.
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
+        assert