import type { ID, BaseCanonicalModel, WorkspaceScoped, EntityRef } from "./common";

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

/**
 * A unit of production/business work — "Team & Workflow." Optionally tied
 * to whatever it's actually about via `relatedTo` (record the edit for
 * Episode X, chase the release form for Guest Y) without Task needing to
 * know the specifics of every entity it might reference.
 */
export interface Task extends BaseCanonicalModel, WorkspaceScoped {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: ID | null;
  /** ISO 8601. */
  dueAt: string | null;
  /** ISO 8601. */
  completedAt: string | null;
  relatedTo: EntityRef | null;
}
