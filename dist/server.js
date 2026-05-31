
        import { createRequire } from 'module';
        const require = createRequire(import.meta.url);
    

// src/app.ts
import express from "express";

// src/modules/user/user.route.ts
import { Router } from "express";

// src/db/index.ts
import { Pool } from "pg";

// src/config/index.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.join(process.cwd(), ".env")
});
var config = {
  port: process.env.PORT,
  connection_string: process.env.DATABASE_URL,
  secret: process.env.JWT_SECRET,
  salt_rounds: process.env.BCRYPT_SALT_ROUNDS
};
var config_default = config;

// src/db/index.ts
var pool = new Pool({
  connectionString: config_default.connection_string
});
var initDB = async () => {
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
            `);
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
            `);
    console.log("NEON DB connected successfully!!");
  } catch (error) {
    console.log(error);
  }
};

// src/utils/jwt.ts
import jwt from "jsonwebtoken";
var createToken = (payload) => {
  return jwt.sign(payload, config_default.secret, {
    expiresIn: "1d"
  });
};
var verifyToken = (token) => {
  return jwt.verify(token, config_default.secret);
};

// src/modules/user/user.service.ts
import bcrypt from "bcrypt";
var createUserIntoDB = async (payload) => {
  const { name, email, password, role } = payload;
  const hashedPassword = await bcrypt.hash(
    password,
    Number(process.env.BCRYPT_SALT_ROUNDS)
  );
  const result = await pool.query(
    `
            INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *
        `,
    [name, email, hashedPassword, role]
  );
  delete result.rows[0].password;
  return result;
};
var loginUserFromDB = async (payload) => {
  const { email, password } = payload;
  const userData = await pool.query(
    `
            SELECT * FROM users WHERE email=$1
        `,
    [email]
  );
  const user = userData.rows[0];
  if (!user) {
    throw new Error("User Not Found");
  }
  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    throw new Error("Password Incorrect");
  }
  const token = createToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });
  delete user.password;
  return { token, user };
};
var userService = {
  createUserIntoDB,
  loginUserFromDB
};

// src/utils/sendResponse.ts
var sendResponse = (res, statusCode, data) => {
  res.status(statusCode).json(data);
};
var sendResponse_default = sendResponse;

// src/modules/user/user.controller.ts
import { StatusCodes } from "http-status-codes";
var createUser = async (req, res) => {
  try {
    const result = await userService.createUserIntoDB(req.body);
    return sendResponse_default(res, StatusCodes.CREATED, {
      success: true,
      message: "User registered successfully",
      data: result.rows[0]
    });
  } catch (error) {
    return sendResponse_default(res, StatusCodes.INTERNAL_SERVER_ERROR, {
      success: false,
      message: error.message
    });
  }
};
var loginUser = async (req, res) => {
  try {
    const result = await userService.loginUserFromDB(req.body);
    return sendResponse_default(res, StatusCodes.OK, {
      success: true,
      message: "Login successfully",
      data: result
    });
  } catch (error) {
    return sendResponse_default(res, StatusCodes.INTERNAL_SERVER_ERROR, {
      success: false,
      message: error.message
    });
  }
};
var userController = {
  createUser,
  loginUser
};

// src/modules/user/user.route.ts
var router = Router();
router.post("/signup", userController.createUser);
router.post("/login", userController.loginUser);
var userRoute = router;

// src/modules/issue/issue.route.ts
import { Router as Router2 } from "express";

// src/modules/issue/issue.service.ts
var createIssueIntoDB = async (payload, reporterId) => {
  const { title, description, type } = payload;
  const result = await pool.query(
    `
        INSERT INTO issues (title, description, type, reporter_id) VALUES ($1, $2, $3, $4) RETURNING *
        `,
    [title, description, type, reporterId]
  );
  return result;
};
var getSingleIssueFromDB = async (id) => {
  const issueResult = await pool.query(
    `
            SELECT * FROM issues WHERE id=$1
        `,
    [id]
  );
  const issue = issueResult.rows[0];
  if (!issue) {
    throw new Error("Issue Not Found");
  }
  const reporterResult = await pool.query(
    `
            SELECT id, name, role FROM users WHERE id=$1
        `,
    [issue.reporter_id]
  );
  const reporter = reporterResult.rows[0];
  return { issue, reporter };
};
var getAllIssuesFromDB = async (sort = "newest", type, status) => {
  const conditions = [];
  const values = [];
  if (type) {
    values.push(type);
    conditions.push(`type=$${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  let query = `SELECT * FROM issues`;
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }
  query += `
        ORDER BY created_at ${sort === "oldest" ? "ASC" : "DESC"}
    `;
  const result = await pool.query(query, values);
  const issues = result.rows;
  const reporterIds = [
    ...new Set(
      issues.map((issue) => issue.reporter_id)
    )
  ];
  const reporterQuery = `
        SELECT id, name, role FROM users WHERE id=ANY($1)
    `;
  const reporterResult = await pool.query(reporterQuery, [reporterIds]);
  const reporters = reporterResult.rows;
  const finalIssues = issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    description: issue.description,
    type: issue.type,
    status: issue.status,
    reporter: reporters.find(
      (reporter) => reporter.id === issue.reporter_id
    ) || null,
    created_at: issue.created_at,
    updated_at: issue.updated_at
  }));
  return finalIssues;
};
var updateIssueIntoDB = async (id, payload, user) => {
  const { title, description, type, status } = payload;
  const existingIssueResult = await pool.query(
    `
        SELECT * FROM issues WHERE id=$1
        `,
    [id]
  );
  const existingIssue = existingIssueResult.rows[0];
  if (!existingIssue) {
    throw new Error("Issue Not Found");
  }
  if (user.role === "contributor") {
    if (existingIssue.reporter_id !== user.id) {
      throw new Error(
        "You can only update your own issue"
      );
    }
    if (existingIssue.status !== "open") {
      throw new Error(
        "You cannot update non-open issues"
      );
    }
  }
  const result = await pool.query(
    `
        UPDATE issues
        SET
            title=COALESCE($1, title),
            description=COALESCE($2, description),
            type=COALESCE($3, type),
            status=COALESCE($4, status),
            updated_at=CURRENT_TIMESTAMP

            WHERE id=$5 RETURNING *
        `,
    [title, description, type, status, id]
  );
  return result.rows[0];
};
var deleteIssueFromDB = async (id) => {
  const existingIssueResult = await pool.query(
    `
        SELECT * FROM issues WHERE id=$1
        `,
    [id]
  );
  const existingIssue = existingIssueResult.rows[0];
  if (!existingIssue) {
    throw new Error("Issue Not Found");
  }
  const result = await pool.query(
    `
        DELETE FROM issues where id=$1
        `,
    [id]
  );
  return result;
};
var issueService = {
  createIssueIntoDB,
  getSingleIssueFromDB,
  getAllIssuesFromDB,
  updateIssueIntoDB,
  deleteIssueFromDB
};

// src/modules/issue/issue.controller.ts
import { StatusCodes as StatusCodes2 } from "http-status-codes";
var createIssue = async (req, res) => {
  try {
    const user = req.user;
    const result = await issueService.createIssueIntoDB(req.body, user.id);
    return sendResponse_default(res, StatusCodes2.CREATED, {
      success: true,
      message: "Issue Created Successfully!",
      data: result.rows[0]
    });
  } catch (error) {
    return sendResponse_default(res, StatusCodes2.INTERNAL_SERVER_ERROR, {
      success: false,
      message: error.message
    });
  }
};
var getSingleIssue = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await issueService.getSingleIssueFromDB(id);
    return sendResponse_default(res, StatusCodes2.OK, {
      success: true,
      message: "Issue retrieved successfully!",
      data: result
    });
  } catch (error) {
    return sendResponse_default(res, StatusCodes2.INTERNAL_SERVER_ERROR, {
      success: false,
      message: error.message
    });
  }
};
var GetAllIssues = async (req, res) => {
  try {
    const { sort, type, status } = req.query;
    const result = await issueService.getAllIssuesFromDB(sort, type, status);
    return sendResponse_default(res, StatusCodes2.OK, {
      success: true,
      message: "Issues retrieved Successfully!!",
      data: result
    });
  } catch (error) {
    return sendResponse_default(res, StatusCodes2.INTERNAL_SERVER_ERROR, {
      success: false,
      message: error.message
    });
  }
};
var updateIssue = async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  try {
    const result = await issueService.updateIssueIntoDB(id, req.body, user);
    return sendResponse_default(res, StatusCodes2.OK, {
      success: true,
      message: "Issue Updated Successfully",
      data: result
    });
  } catch (error) {
    return sendResponse_default(res, StatusCodes2.INTERNAL_SERVER_ERROR, {
      success: false,
      message: error.message
    });
  }
};
var deleteIssue = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await issueService.deleteIssueFromDB(id);
    if (result.rowCount === 0) {
      return sendResponse_default(res, StatusCodes2.NOT_FOUND, {
        success: false,
        message: "User Not found!"
      });
    }
    return sendResponse_default(res, StatusCodes2.OK, {
      success: true,
      message: "Issue Deleted Successfully!!!"
    });
  } catch (error) {
    return sendResponse_default(res, StatusCodes2.INTERNAL_SERVER_ERROR, {
      success: false,
      message: error.message
    });
  }
};
var issueController = {
  createIssue,
  getSingleIssue,
  GetAllIssues,
  updateIssue,
  deleteIssue
};

// src/middleware/auth.ts
import { StatusCodes as StatusCodes3 } from "http-status-codes";
var auth = (...roles) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return sendResponse_default(res, StatusCodes3.UNAUTHORIZED, {
          success: false,
          message: "Unauthorized access"
        });
      }
      const decoded = verifyToken(token);
      const userData = await pool.query(
        `
                    SELECT * FROM users WHERE email=$1
                `,
        [decoded.email]
      );
      const user = userData.rows[0];
      if (userData.rows.length === 0) {
        return sendResponse_default(res, StatusCodes3.NOT_FOUND, {
          success: false,
          message: "User Not Found"
        });
      }
      if (roles.length && !roles.includes(user.role)) {
        return sendResponse_default(res, StatusCodes3.FORBIDDEN, {
          success: false,
          message: "Forbidden"
        });
      }
      req.user = decoded;
      next();
    } catch (error) {
      next(error);
    }
  };
};
var auth_default = auth;

// src/modules/issue/issue.route.ts
var route = Router2();
route.post("/", auth_default("contributor", "maintainer"), issueController.createIssue);
route.get("/", issueController.GetAllIssues);
route.get("/:id", issueController.getSingleIssue);
route.patch("/:id", auth_default("contributor", "maintainer"), issueController.updateIssue);
route.delete("/:id", auth_default("maintainer"), issueController.deleteIssue);
var issueRoute = route;

// src/app.ts
var app = express();
app.use(express.json());
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Express Server",
    author: "Assignment-2"
  });
});
app.use("/api/auth", userRoute);
app.use("/api/issues", issueRoute);
var app_default = app;

// src/server.ts
var mainServer = () => {
  initDB();
  app_default.listen(config_default.port, () => {
    console.log(`This app is running on port ${config_default.port}`);
  });
};
mainServer();
//# sourceMappingURL=server.js.map