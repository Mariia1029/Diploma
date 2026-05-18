import type { TaskType } from './template';

export type TaskVisibility = 'Public' | 'Private';

export interface SetTaskStatusRequest {
  status: TaskVisibility;
}

export interface TaskItemResponse {
  id: string;
  taskId: string;
  templateItemId: string | null;
  orderIndex: number;
  type: TaskType;
  question: string;
  options: string | null;
  correctAnswer: string | null;
  multiAnswer: boolean;
  explanation: string | null;
  points: number;
}

export interface TaskDetailResponse {
  id: string;
  ownerId: string;
  templateId: string | null;
  title: string;
  status: TaskVisibility;
  language: string;
  aiGenerated: boolean;
  isCopy: boolean;
  timeLimitSeconds: number | null;
  createdAt: string;
  updatedAt: string;
  taskItems: TaskItemResponse[];
}

export interface CreateTaskItemRequest {
  orderIndex: number;
  type: TaskType;
  question: string;
  options: string | null;
  correctAnswer: string;
  multiAnswer: boolean;
  explanation: string | null;
  points: number;
}

export interface CreateTaskRequest {
  title: string;
  language: string;
  templateId: string | null;
  timeLimitSeconds: number | null;
  aiGenerated: boolean;
  taskItems: CreateTaskItemRequest[];
}

export interface AiGeneratedTaskItemResponse {
  orderIndex: number;
  type: TaskType;
  question: string;
  options: string | null;
  correctAnswer: string;
  multiAnswer: boolean;
  explanation: string | null;
  points: number;
}

export interface AiGeneratedTaskResponse {
  title: string;
  language: string;
  taskItems: AiGeneratedTaskItemResponse[];
}

export interface PublicTaskResponse extends TaskDetailResponse {
  ownerFirstName: string;
  ownerLastName: string;
}

export interface GenerateTaskRequest {
  topic: string;
  language: string;
  difficulty: 'easy' | 'medium' | 'hard';
  template: {
    title: string;
    description: string;
    is_public: boolean;
    items: Array<{
      type: TaskType;
      order_index: number;
      content: string;
    }>;
  };
}
