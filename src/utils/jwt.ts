import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config";

export const createToken = (payload: object) => {
    return jwt.sign(payload, config.secret as string, {
        expiresIn: "1d",
    })
}

export const verifyToken = (token : string) => {
    return jwt.verify(token, config.secret as string) as JwtPayload
}