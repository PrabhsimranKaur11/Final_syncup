/** Routes where the auth back button may return (never browser history -1). */
const AUTH_BACK_TARGETS = new Set(['/', '/login', '/register']);

/**
 * Resolve back navigation for login/register pages.
 * Uses location.state.from when set by cross-auth links; otherwise home.
 */
export function getAuthBackTarget(location) {
  const from = location.state?.from;
  if (from && AUTH_BACK_TARGETS.has(from)) {
    return from;
  }
  return '/';
}

export function authLinkState(fromPathname) {
  return { from: fromPathname };
}
