// dsh-session-delete-menu — Host half.
//
// Intentionally empty. The feature is a client-side context-menu contribution;
// the actual deletion route (`POST /api/mobile-nav.session.delete`) is served by
// the dsh-web-mobile plugin on the same host. This bundle exists so the client
// module can be composed into the web boot graph.

export const name = 'dsh-session-delete-menu'

export function apply() {}
