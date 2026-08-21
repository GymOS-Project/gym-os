use axum::{Router, routing::get};
use tokio::net::{TcpListener, SocketAddr};
use log::Level;
use std::net::{IpAddr, Ipv4Addr};
use handlers::{healthcheck_handler, root_handler};

#[tokio::main]
async fn main() {
    simple_logger::init_with_level(Level::Info).unwrap();
    let app = Router::new()
        .route("/healthcheck", get(healthcheck_handler))
        .route("/", get(root_handler));
    let address = SocketAddr::from((IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 3001));
    let listener = TcpListener::bind(address).await.unwrap();
    log::info!("Server running in port http://{}", address);
    axum::serve(listener, app).await.unwrap();
}


