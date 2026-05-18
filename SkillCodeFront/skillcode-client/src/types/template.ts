export type TaskType =
  | 'SingleChoice'
  | 'MultiChoice'
  | 'Matching'
  | 'Ordering'
  | 'FillBlank'
  | 'TrueFalse'
  | 'Open'
  | 'FlashCards'
  | 'Coding';

export interface TemplateItemResponse {
  id: string;
  templateId: string;
  type: TaskType;
  content: string;
  orderIndex: number;
}

export interface TemplateResponse {
  id: string;
  ownerId: string | null;
  title: string;
  description: string | null;
  isSystem: boolean;
  isPublic: boolean;
  createdAt: string;
}

export interface TemplateDetailResponse extends TemplateResponse {
  items: TemplateItemResponse[];
}

export interface CreateTemplateItemRequest {
  type: TaskType;
  content: string;
  orderIndex: number;
}

export interface CreateTemplateRequest {
  title: string;
  description: string;
  isPublic: boolean;
  items: CreateTemplateItemRequest[];
}
