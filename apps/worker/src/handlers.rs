pub async fn healthcheck_handler() -> &'static str {
    "Rust Axum server is healthy!"
}

pub async fn root_handler() -> &'static str {
    "Hello world"
}