import type { Request, Response } from "express";
import { userService } from "./user.service";
import sendResponse from "../../utils/sendResponse";
import { StatusCodes } from "http-status-codes";

const createUser = async (req: Request, res: Response) => {
    try {
        const result = await userService.createUserIntoDB(req.body);

        return sendResponse(res, StatusCodes.CREATED, {
            success: true,
            message: "User registered successfully",
            data: result.rows[0],
        })

    } catch (error : any) {
        return sendResponse(res, StatusCodes.INTERNAL_SERVER_ERROR, {
            success: false,
            message: error.message,
        })
    }
}

const loginUser = async (req: Request, res: Response) => {
    try {
        const result = await userService.loginUserFromDB(req.body);

        return sendResponse(res,StatusCodes.OK, {
            success: true,
            message: "Login successfully",
            data: result,
        })
    } catch (error : any) {
        return sendResponse(res,StatusCodes.INTERNAL_SERVER_ERROR, {
            success: false,
            message: error.message,
        })
    }
}

export const userController = {
    createUser,
    loginUser
}