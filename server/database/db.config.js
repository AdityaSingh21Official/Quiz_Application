import mysql from "mysql2/promise";
import { config } from "dotenv";

config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function testConnection() {
  try {
    console.log(`\n Connecting To Database . . . . .`);
    const connection = await db.getConnection();

    await connection.ping();

    console.log("✅ Database Connection Succesfull\n");

    connection.release();
  } catch (error) {
    console.error("❌Database Connection Error");

    throw new Error(error);
  }
}

export { db, testConnection };
