import { Pool } from "pg";
import config from "../config";

export const pool = new Pool({
    connectionString: config.connection_string,
})

// Table
export const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users(
                id SERIAL PRIMARY KEY,
                name VARCHAR(30) NOT NULL,
                email VARCHAR(40) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'contributor',

                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
            `)

        await pool.query(`
            CREATE TABLE IF NOT EXISTS issues(
                id SERIAl PRIMARY KEY,
                title VARCHAR(50) NOT NULL,
                description TEXT NOT NULL,
                type VARCHAR(30) NOT NULL,
                status VARCHAR(30) DEFAULT 'open',
                reporter_id INT NOT NULL,

                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
            `)

    console.log("NEON DB connected successfully!!")
    } catch (error) {
        console.log(error);
    }
}