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

export type PublicTestDto = Schemas['PublicTestDto'];
export type PublicAttemptDto = Schemas['PublicAttemptDto'];
export type PublicInvitationDto = Schemas['PublicInvitationDto'];
export type TestInvitationDto = Schemas['TestInvitationDto'];
export type InviteInput = Schemas['InviteInput'];

export type TenantCreateInput = Schemas['TenantCreateInput'];
export type WorkspaceInviteInput = Schemas['WorkspaceInviteInput'];
export type WorkspaceInvitationDto = Schemas['WorkspaceInvitationDto'];

/** A topic with its sub-topics, built in the browser from the flat topic lists the API returns. */
export interface TopicNode {
  id: number;
  name: string;
  description?: string;
  parentId?: number;
  /** Display order among siblings (lowest first); topics without one come after, by name. */
  position?: number;
  /** Shared library content the user may read and generate tests from, but not change (ADR010). */
  readOnly: boolean;
  /** Belongs to the shared library, whoever is asking (an admin may still change it): groups the Library tree. */
  shared: boolean;
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

export type CurrentUserDto = Schemas['CurrentUserDto'];
export type UserPreferencesDto = Schemas['UserPreferencesDto'];
export type UsageSummaryDto = Schemas['UsageSummaryDto'];
/** The colour scheme a user can choose; SYSTEM follows the device. */
export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';
export type TenantSummaryDto = Schemas['TenantSummaryDto'];
export type SystemSettingDto = Schemas['SystemSettingDto'];
export type TenantSettingDto = Schemas['TenantSettingDto'];
export type EmbeddingInfoDto = Schemas['EmbeddingInfoDto'];
export type TokenPriceDto = Schemas['TokenPriceDto'];
export type TokenPricesDto = Schemas['TokenPricesDto'];
export type TokenPriceInput = Schemas['TokenPriceInput'];
export type TokenPriceSuggestionDto = Schemas['TokenPriceSuggestionDto'];
