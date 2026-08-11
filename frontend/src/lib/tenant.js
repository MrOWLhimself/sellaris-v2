// Roger's Lounge tenant/branch IDs. Used by claim_tenant_owner() during
// first-time login setup, since the RPC call needs an explicit tenant to
// claim. Once a user is logged in, the REAL source of truth is
// `staff.tenant_id` / `staff.branch_id` from AuthContext — pages should
// read from `useAuth().staff`, not these constants, for data queries.
export const CURRENT_TENANT_ID = 'a59ac3ab-1b0c-449d-a1fd-60371d3aa500' // Roger's Lounge
export const CURRENT_BRANCH_ID = 'dfc2135f-b31f-46d3-ab8b-66ad9abc8a83' // Ijagun
