import type { NextFunction, Request, Response } from "express"
import { StatusCodes } from "http-status-codes";
import { verifyToken } from "../utils/jwt";
import { pool } from "../db";
import sendResponse from "../utils/sendResponse";

const auth = (...roles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.headers.authorization?.split(" ")[1];

            if(!token) {
                return sendResponse(res, StatusCodes.UNAUTHORIZED, {
                    success: false,
                    message: "Unauthorized access",
                })
            }

            const decoded = verifyToken(token)

            const userData = await pool.query(`
                    SELECT * FROM users WHERE email=$1
                `, [decoded.email],
            )

            const user = userData.rows[0]

            // if user not exist
            if(userData.rows.length === 0) {
                return sendResponse(res,StatusCodes.NOT_FOUND, {
                    success: false,
                    message: "User Not Found",
                })
            }

            if(roles.length && !roles.includes(user.role)) {
                return sendResponse(res, StatusCodes.FORBIDDEN, {
                    success: false,
                    message: "Forbidden",
                })
            }

            req.user = decoded;
            next();

        } catch (error) {
            next(error);
        }
    }
}

export default auth;