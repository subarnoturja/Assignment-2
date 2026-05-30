import express, { type Application, type Request, type Response } from "express";

const app : Application = express();

// Middlewares
app.use(express.json())

app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        message: "Express Server",
        author: "Assignment-2",
    })
})

export default app;