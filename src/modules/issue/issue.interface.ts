export type IssueType = 'bug' | 'feature_request';

export type IssueStatus = 'open' | 'in_progress' | 'resolved';

export interface IIssue {
    id: string;
    title: string;
    description: string;
    type: IssueType;
    status?: IssueStatus;
    reporter_id?: number;
    created_at?: Date;
    update_at?: Date;
}