import type { BaseCanonicalModel, WorkspaceScoped } from "./common";

export type AutomationTrigger =
  | "episode_published"
  | "episode_scheduled"
  | "guest_confirmed"
  | "sponsor_deal_signed"
  | "manual";

export type AutomationAction = "publish_to_connector" | "send_email" | "post_social" | "create_task" | "notify";
export type AutomationStatus = "enabled" | "disabled" | "error";
export type AutomationRunStatus = "success" | "failure";

export interface AutomationStep {
  action: AutomationAction;
  /** Opaque, action-specific configuration (which connector, which template, ...) — intentionally untyped here for the same reason ConnectorCredentials is: the shape is owned by whatever executes the action, not by this model. */
  config: Record<string, unknown>;
}

/**
 * A configured "when X happens, do Y" workflow — e.g. publish to every
 * connected host when an episode is marked published, or notify the team
 * when a sponsor deal is signed. Podlogix orchestrates; the actual work
 * (an API call, an email send) happens through a Connector or a service,
 * never inside this object.
 */
export interface Automation extends BaseCanonicalModel, WorkspaceScoped {
  name: string;
  trigger: AutomationTrigger;
  status: AutomationStatus;
  steps: AutomationStep[];
  /** ISO 8601. */
  lastRunAt: string | null;
  lastRunStatus: AutomationRunStatus | null;
}
