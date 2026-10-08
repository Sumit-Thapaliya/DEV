// A deployment identifier must be stable across independently compiled routes.
// Date.now() caused false mismatches and reloads in the middle of login/CSRF.
export const BUILD_ID = process.env.RENDER_GIT_COMMIT ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'development';
