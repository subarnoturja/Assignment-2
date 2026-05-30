import express, { type Application, type Request, type Response } from "express";
import { userRoute } from "./modules/user/user.route";
import { issueRoute } from "./modules/issue/issue.route";

const app : Application = express();

// Middlewares
app.use(express.json())

app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        message: "Express Server",
        author: "Assignment-2",
    })
})

// Routes
app.use('/api/auth', userRoute);
app.use('/api/issues', issueRoute);

export default app;