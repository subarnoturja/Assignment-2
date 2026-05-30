import { pool } from "../../db";
import type { IIssue, IUserPayload } from "./issue.interface";

// Create Issue Into DB
const createIssueIntoDB = async (payload: IIssue, reporterId: number) => {
    const { title, description, type } = payload;

    const result = await pool.query(`
        INSERT INTO issues (title, description, type, reporter_id) VALUES ($1, $2, $3, $4) RETURNING *
        `, [title, description, type, reporterId],
    )

    return result;
}

// Get Single Issue From DB
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

// Get All Issues From DB
const getAllIssuesFromDB = async (sort = "newest", type?: string, status?: string) => {
    const conditions : string[] = [];
    const values: string[] = [];

    if(type) {
        values.push(type);
        conditions.push(`type=$${values.length}`)
    }

    if(status) {
        values.push(status);
        conditions.push(`status = $${values.length}`);
    }

    let query = `SELECT * FROM issues`;

    if(conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`
    }

    query += `
        ORDER BY created_at ${
            sort === 'oldest' ? 'ASC' : 'DESC'
        }
    `

    const result = await pool.query(query, values);

    const issues = result.rows;

    const reporterIds = [
        ...new Set(
            issues.map(issue => issue.reporter_id)
        )
    ]

    const reporterQuery = `
        SELECT id, name, role FROM users WHERE id=ANY($1)
    `;

    const reporterResult = await pool.query(reporterQuery, [reporterIds])

    const reporters = reporterResult.rows

    const finalIssues = issues.map(issue => ({
    id: issue.id,
    title: issue.title,
    description: issue.description,
    type: issue.type,
    status: issue.status,
    reporter:
      reporters.find(
        reporter => reporter.id === issue.reporter_id
      ) || null,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  }));

  return finalIssues;

}

// Update Issue Into DB
const updateIssueIntoDB = async (id: string, payload: Partial<IIssue>, user: IUserPayload) => {

    const { title, description, type, status } = payload;

    const existingIssueResult = await pool.query(`
        SELECT * FROM issues WHERE id=$1
        `, [id]
    )

    const existingIssue = existingIssueResult.rows[0]

    if(!existingIssue) {
        throw new Error("Issue Not Found")
    }

    // Contributor check
    if(user.role === "contributor") {
        if(existingIssue.reporter_id !== user.id) {
            throw new Error(
                "You can only update your own issue"
            );
        }

        if(existingIssue.status !== 'open') {
            throw new Error(
                "You cannot update non-open issues"
            )
        }
    }

    const result = await pool.query(`
        UPDATE issues
        SET
            title=COALESCE($1, title),
            description=COALESCE($2, description),
            type=COALESCE($3, type),
            status=COALESCE($4, status),
            updated_at=CURRENT_TIMESTAMP

            WHERE id=$5 RETURNING *
        `, [title, description, type, status, id],
    )

    return result.rows[0];
}

// Delete Issue From DB
const deleteIssueFromDB = async (id: string) => {
    const existingIssueResult = await pool.query(`
        SELECT * FROM issues WHERE id=$1
        `, [id]
    )

    const existingIssue = existingIssueResult.rows[0];

    if(!existingIssue) {
        throw new Error("Issue Not Found");
    }

    const result = await pool.query(`
        DELETE FROM issues where id=$1
        `, [id]
    )

    return result;
}

export const issueService = {
    createIssueIntoDB,
    getSingleIssueFromDB,
    getAllIssuesFromDB,
    updateIssueIntoDB,
    deleteIssueFromDB
}