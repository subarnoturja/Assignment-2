import { pool } from "../../db";
import type { IIssue } from "./issue.interface";

// Create Issue Into DB
const createIssueIntoDB = async (payload: IIssue, reporterId: number) => {
    const { title, description, type } = payload;

    const result = await pool.query(`
        INSERT INTO issues (title, description, type, reporter_id) VALUES ($1, $2, $3, $4) RETURNING *
        `, [title, description, type, reporterId],
    )

    return result;
}

const getSingleIssueFromDB = async (id: string) => {
    const issueResult = await pool.query(`
            SELECT * FROM issues WHERE id=$1
        `, [id]
    )

    const issue = issueResult.rows[0];

    if(!issue) {
        throw new Error("Issue Not Found");
    }

    const reporterResult = await pool.query(`
            SELECT id, name, role FROM users WHERE id=$1
        `, [issue.reporter_id]
    )

    const reporter = reporterResult.rows[0];

    return { issue, reporter };
}

export const issueService = {
    createIssueIntoDB,
    getSingleIssueFromDB,
}