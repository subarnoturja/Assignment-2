import type { Request, Response } from "express";
import { issueService } from "./issue.service";
import sendResponse from "../../utils/sendResponse";
import { StatusCodes } from "http-status-codes";

// Create Issue
const createIssue = async (req: Request, res: Response) => {
    try {
        const user = req.user as { 
            id: number;
        }
        const result = await issueService.createIssueIntoDB(req.body, user.id);

        return sendResponse(res, StatusCodes.CREATED, {
            success: true,
            message: "Issue Created Successfully!",
            data: result.rows[0],
        })
    } catch (error: any) {
        return sendResponse(res, StatusCodes.INTERNAL_SERVER_ERROR, {
            success: false,
            message: error.message,
        })
    }
}

// Get Single Issue
const getSingleIssue = async (req: Request, res: Response) => {
    const { id } = req.params
    try {
       const result = await issueService.getSingleIssueFromDB(id as string) 

       return sendResponse(res, StatusCodes.OK, {
        success: true,
        message: "Issue retrieved successfully!",
        data: result,
       })
    } catch (error : any) {
        return sendResponse(res, StatusCodes.INTERNAL_SERVER_ERROR, {
            success: false,
            message: error.message,
        })
    }
}

export const issueController = {
    createIssue,
    getSingleIssue,
}