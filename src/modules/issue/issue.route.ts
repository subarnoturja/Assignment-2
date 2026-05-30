import { Router } from "express";
import { issueController } from "./issue.controller";
import auth from "../../middleware/auth";

const route = Router()

// Issue Route
route.post('/',auth('contributor', 'maintainer'), issueController.createIssue);
route.get('/', issueController.GetAllIssues);
route.get('/:id', issueController.getSingleIssue);
route.patch('/:id', auth('contributor', 'maintainer'), issueController.updateIssue);
route.delete('/:id', auth('maintainer'),issueController.deleteIssue);

export const issueRoute = route;