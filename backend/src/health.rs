use axum::Json;
use serde::Serialize;
use std::time::{Duration, Instant};

static START_TIME: std::sync::OnceLock<Instant> = std::sync::OnceLock::new();

fn get_start_time() -> Instant {
    *START_TIME.get_or_init(Instant::now)
}

#[derive(Serialize, Debug)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub commit: String,
    pub uptime_seconds: u64,
    pub features: Vec<String>,
}

pub async fn handler() -> Json<HealthResponse> {
    let uptime = get_start_time().elapsed().as_secs();
    
    let commit = std::env::var("GIT_COMMIT").unwrap_or_else(|_| "unknown".to_string());
    
    let features = Vec::new();
    
    Json(HealthResponse {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        commit,
        uptime_seconds: uptime,
        features,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use serde_json::Value;
    use tower::ServiceExt;

    fn create_app() -> axum::Router {
        axum::Router::new().route("/health", get(handler))
    }

    #[tokio::test]
    async fn test_health_json_shape() {
        let app = create_app();

        let response = app
            .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        
        let body = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let json: Value = serde_json::from_slice(&body).unwrap();
        
        assert!(json.get("status").is_some());
        assert!(json.get("version").is_some());
        assert!(json.get("commit").is_some());
        assert!(json.get("uptime_seconds").is_some());
        assert!(json.get("features").is_some());
    }

    #[tokio::test]
    async fn test_health_required_fields() {
        let app = create_app();

        let response = app
            .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
            .await
            .unwrap();

        let body = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let json: Value = serde_json::from_slice(&body).unwrap();
        
        assert_eq!(json["status"], "ok");
        assert_eq!(json["version"], "0.1.0");
        assert!(json["uptime_seconds"].as_u64().is_some());
        assert!(json["features"].is_array());
    }

    #[tokio::test]
    async fn test_health_commit_fallback() {
        std::env::remove_var("GIT_COMMIT");
        
        let response = handler().await;
        assert_eq!(response.commit, "unknown");
    }
}