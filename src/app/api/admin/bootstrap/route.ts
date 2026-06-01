// Removed — admin access is now controlled by ADMIN_USER_ID in .env.local
export async function GET() {
  return Response.json({ message: 'Use /api/admin/setup-info instead' }, { status: 410 })
}
export async function POST() {
  return Response.json({ message: 'Bootstrap removed. Set ADMIN_USER_ID in .env.local' }, { status: 410 })
}
