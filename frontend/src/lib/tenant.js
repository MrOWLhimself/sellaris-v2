// Pilot/bootstrap tenant ID. Used ONLY by the first-time "claim
// ownership" flow on the login page, since that RPC needs an explicit
// tenant to target before any staff session exists. Never render this
// business's name as hardcoded UI text anywhere in the app — Sellaris
// is a multi-tenant platform for any business, not built around this
// one. All on-screen business/branch names must come from the database
// (staff.businessName / staff.branchName via AuthContext), never a
// string literal in a component.
export const CURRENT_TENANT_ID = 'a59ac3ab-1b0c-449d-a1fd-60371d3aa500'
