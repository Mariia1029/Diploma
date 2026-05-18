export interface ShareUserInfo {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ReceivedShareResponse {
  shareId: string;
  taskId: string;
  taskTitle: string;
  sender: ShareUserInfo;
  sentAt: string;
  isRead: boolean;
  isSaved: boolean;
}

export interface SentShareResponse {
  shareId: string;
  taskId: string;
  taskTitle: string;
  receiver: ShareUserInfo;
  sentAt: string;
  isRead: boolean;
  isSaved: boolean;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
}

export interface SharesQueryParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
}

export interface EphemeralAnswer {
  taskItemId: string;
  answer: unknown;
}

export interface EphemeralItemResult {
  taskItemId: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
}

export interface EphemeralAttemptResult {
  earnedPoints: number;
  maxPoints: number;
  results: EphemeralItemResult[];
}

export interface ShareTaskRequest {
  receiverId: string;
}

export interface MarkReadResponse {
  shareId: string;
  isRead: boolean;
}

export interface SaveShareResponse {
  savedTaskId: number;
  taskId: string;
}
