import tenants from "../../tenants.json";

/** Typed lookup over `tenants.json`, which maps Discord server IDs to the hackathon tenant that owns them. */

/** Public tenant information stored for one Discord server. */
export interface Tenant {
  /** Stable lowercase identifier, e.g. `"cutiehack"`. */
  slug: string;
  /** Display name used in bot responses, e.g. `"Cutie Hack"`. */
  name: string;
  /** Current event name, e.g. `"Cutie Hack 2026"`. */
  event: string;
}

const tenantByServerId: Record<string, Tenant> = {};

/** Whether a registry value is a tenant entry (skips `$schema`/`$comment`). */
function isTenant(value: unknown): value is Tenant {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<Tenant>;
  return (
    typeof candidate.slug === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.event === "string"
  );
}

for (const [serverId, value] of Object.entries(tenants)) {
  if (isTenant(value)) {
    tenantByServerId[serverId] = value;
  }
}

/** The tenant for a Discord server ID, or `undefined` when it has no `tenants.json` entry. */
export function getTenantByServerId(serverId: string): Tenant | undefined {
  return tenantByServerId[serverId];
}
