import type { components } from './schema';

/**
 * Short names for the backend DTOs. They come from the generated `schema.d.ts`, so after a backend change
 * run `npm run gen:api` and the compiler shows every place that needs updating.
 */
type Schemas = components['schemas'];

export type TopicDto = Schemas['TopicDto'];
export type TopicCreateInput = Schemas['TopicCreateInput'];
export type TopicUpdateInput = Schemas['TopicUpdateInput'];
export type TopicTreeNodeInput = Schemas['TopicTreeNodeInput'];

export type DocumentDto = Schemas['DocumentDto'];

export type TestDto = Schemas['TestDto'];
export type TestInput = Schemas['TestInput'];
export type TestQuestionDto = Schemas['TestQuestionDto'];
export type TestQuestionOptionDto = Schemas['TestQuestionOptionDto'];
export type TestQuestionVersionDto = Schemas['TestQuestionVersionDto'];
export type TestEventDto = Schemas['TestEventDto'];
export type GenerationRunDto = Schemas['GenerationRunDto'];
export type ManualQuestionInput = Schemas['ManualQuestionInput'];

export type AttemptDto = Schemas['AttemptDto'];
export type AttemptDetailDto = Schemas['AttemptDetailDto'];
export type AttemptQuestionDto = Schemas['AttemptQuestionDto'];
export type SubmitAttemptInput = Schemas['SubmitAttemptInput'];

/** A topic with its sub-topics, built in the browser from the flat topic lists the API returns. */
export interface TopicNode {
  id: number;
  name: string;
  description?: string;
  parentId?: number;
  children: TopicNode[];
}

/** A paged response: Spring Data's PagedModel, with the paging details under `page`. */
export interface Page<T> {
  content: T[];
  page: {
    size: number;
    /** 0-based page index */
    number: number;
    totalElements: number;
    totalPages: number;
  };
}
