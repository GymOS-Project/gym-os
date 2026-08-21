struct Database {
  conn: Connection,
}

impl Database {
  pub fn new(conn: Connection) -> Self {
    Self { conn }
  }
}