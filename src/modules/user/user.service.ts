import { pool } from "../../db";
import { createToken } from "../../utils/jwt";
import type { ILoginUser, IUser } from "./user.interface";
import bcrypt from "bcrypt";

const createUserIntoDB = async (payload: IUser) => {
    const { name, email, password, role } = payload;
    const hashedPassword = await bcrypt.hash(
        password,
        Number(process.env.BCRYPT_SALT_ROUNDS)
    );

    const result = await pool.query(`
            INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *
        `, [name, email, hashedPassword, role]
    )

    delete result.rows[0].password;

    return result;
}

const loginUserFromDB = async(payload: ILoginUser) => {
    const { email, password } = payload;

    const userData = await pool.query(`
            SELECT * FROM users WHERE email=$1
        `, [email],
    )

    const user = userData.rows[0];

    // check user or not
    if(!user) {
        throw new Error('User Not Found');
    }

    // compare password
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if(!isPasswordMatch) {
        throw new Error("Password Incorrect");
    }

    // Token
    const token = createToken({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
    })

    delete user.password;

    return { token, user };
}

export const userService = {
    createUserIntoDB,
    loginUserFromDB
}