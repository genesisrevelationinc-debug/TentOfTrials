```diff
--- a/backend/src/main.rs
+++ b/backend/src/main.rs
@@ -1,5 +1,7 @@
 use actix_web::{web, App, HttpServer, HttpResponse, middleware};
 use actix_cors::Cors;
+use actix_web::HttpRequest;
+use uuid::Uuid;
 use std::sync::Mutex;
 use log::{info, error};
 
@@ -7,6 +9,7 @@ mod routes;
 mod models;
 mod services;
 mod config;
+mod request_id;
 
 pub struct AppState {
     pub health_check_response: String,
@@ -14,6 +17,7 @@ pub struct AppState {
 }
 
 async fn manual_health() -> HttpResponse {
+    log::info!("Health check endpoint called");
     HttpResponse::Ok().json(serde_json::json!({"status": "ok"}))
 }
 
@@ -22,6 +26,7 @@ async fn main() -> std::io::Result<()> {
     std::env::set_var("RUST_LOG", "info");
     env_logger::init();
 
+    info!("Starting Tent of Trials backend server");
     let config = config::load_config();
     
     let data = web::Data::new(AppState {
@@ -33,6 +38,7 @@ async fn main() -> std::io::Result<()> {
         .wrap(Cors::permissive())
         .wrap(middleware::Logger::default())
         .wrap(middleware::Compress::default())
+        .wrap(request_id::RequestIdMiddleware)
         .app_data(data.clone())
         .configure(routes::configure)
     })
@@ -40,5 +46,6 @@ async fn main() -> std::io::Result<()> {
         .workers(4)
         .run()
         .await
+        .map_err(|e| { error!("Server failed to start: {}", e); e })
 }
 
--- a/backend/Cargo.toml
+++ b/backend/Cargo.toml
@@ -10,6 +10,7 @@ actix-web = "4"
 actix-cors = "0.7"
 serde = { version = "1.0", features = ["derive"] }
 serde_json = "1.0"
+uuid = { version = "1", features = ["v4"] }
 log = "0.4"
 env_logger = "0.11"
 tokio = { version = "1", features = ["full"] }
--- /dev/null
+++ b/backend/src/request_id.rs
@@ -0,0 +1,107 @@
+use actix_web::{
+    dev::{Service, ServiceRequest, ServiceResponse, Transform},
+    Error, HttpMessage, HttpResponse,
+};
+use futures::future::{ok, LocalBoxFuture, Ready};
+use log::info;
+use uuid::Uuid;
+
+const REQUEST_ID_HEADER: &str = "X-Request-Id";
+const MAX_REQUEST_ID_LENGTH: usize = 128;
+
+#[derive(Clone, Debug)]
+pub struct RequestIdMiddleware;
+
+impl<S, B> Transform<S, ServiceRequest> for RequestIdMiddleware
+where
+    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
+    S::Future: 'static,
+    B: 'static,
+{
+    type Response = ServiceResponse<B>;
+    type Error = Error;
+    type InitError = ();
+    type Transform = RequestIdMiddlewareService<S>;
+    type Future = Ready<Result<Self::Transform, Self::InitError>>;
+
+    fn new_transform(&self, service: S) -> Self::Future {
+        ok(RequestIdMiddlewareService { service })
+    }
+}
+
+pub struct RequestIdMiddlewareService<S> {
+    service: S,
+}
+
+impl<S, B> Service<ServiceRequest> for RequestIdMiddlewareService<S>
+where
+    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
+    S::Future: 'static,
+    B: 'static,
+{
+    type Response = ServiceResponse<B>;
+    type Error = Error;
+    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;
+
+    fn poll_ready(
+        &self,
+        cx: &mut std::task::Context<'_>,
+    ) -> std::task::Poll<Result<(), Self::Error>> {
+        self.service.poll_ready(cx)
+    }
+
+    fn call(&self, req: ServiceRequest) -> Self::Future {
+        let request_id = extract_or_generate_request_id(&req);
+        
+        info!(
+            "Request {} {} - request_id={}",
+            req.method(),
+            req.path(),
+            request_id
+        );
+
+        req.extensions_mut().insert(request_id.clone());
+
+        let fut = self.service.call(req);
+
+        Box::pin(async move {
+            let mut res = fut.await?;
+            
+            if let Some(request_id) = res.request().extensions().get::<String>() {
+                res.headers_mut()
+                    .insert(
+                        actix_web::http::header::HeaderName::from_static(REQUEST_ID_HEADER),
+                        actix_web::http::header::HeaderValue::from_str(request_id).unwrap(),
+                    );
+            }
+            
+            Ok(res)
+        })
+    }
+}
+
+fn extract_or_generate_request_id(req: &ServiceRequest) -> String {
+    if let Some(header_value) = req.headers().get(REQUEST_ID_HEADER) {
+        if let Ok(value) = header_value.to_str() {
+            let trimmed = value.trim();
+            if !trimmed.is_empty() && trimmed.len() <= MAX_REQUEST_ID_LENGTH {
+                return trimmed.to_string();
+            }
+        }
+    }
+    
+    Uuid::new_v4().to_string()
+}
+
+#[cfg(test)]
+mod tests {
+    use super::*;
+    use actix_web::test;
+
+    #[actix_web::test]
+    async fn test_request_id_middleware() {
+        // Tests are implemented in the integration test module
+    }
+}
--- /dev/null
+++ b/backend/tests/request_id_tests.rs
@@ -0,0 +1,120 @@
+use actix_web::{test, web, App, HttpResponse, http::header::HeaderValue};
+use backend::request_id::RequestIdMiddleware;
+
+async fn test_handler() -> HttpResponse {
+    HttpResponse::Ok().json(serde_json::json!({"status": "ok"}))
+}
+
+#[actix