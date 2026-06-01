// Removed — admin access is controlled by ADMIN_USER_ID in .env.local, not the database
export async function POST() {
  return Response.json(
    { message: 'Admin is now set via ADMIN_USER_ID env var, not per-user flags.' },
    { status: 410 }
  )
}
