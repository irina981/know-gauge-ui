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

/**
 * Test name and description are new in the backend. They are added here by hand until `schema.d.ts` is
 * regenerated (`npm run gen:api` with the updated backend running); then the `& {...}` parts can go.
 */
type TestNaming = { name?: string; description?: string };
export type TestDto = Schemas['TestDto'] & TestNaming;
export type TestInput = Schemas['TestInput'] & TestNaming;
export type TestQuestionDto = Schemas['TestQuestionDto'];
export type TestQuestionOptionDto = Schemas['TestQuestionOptionDto'];
export type TestQuestionVersionDto = Schemas['TestQuestionVersionDto'];
export type TestEventDto = Schemas['TestEventDto'];
/**
 * The prompt and request settings of each LLM call are also new in the backend (same as TestNaming above).
 */
type GenerationRunRequest = { prompt?: string; requestParams?: Record<string, unknown> };
export type GenerationRunDto = Schemas['GenerationRunDto'] & GenerationRunRequest;
export type ManualQuestionInput = Schemas['ManualQuestionInput'];

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
