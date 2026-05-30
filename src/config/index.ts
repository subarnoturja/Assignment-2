import dotenv from "dotenv";
import path from "path";

dotenv.config({
    path: path.join(process.cwd(), ".env"),
})

const config = {
    port: process.env.PORT,
    connection_string: process.env.DATABASE_URL as string,
    secret: process.env.JWT_SECRET,
    salt_rounds: process.env.BCRYPT_SALT_ROUNDS
}

export default config;