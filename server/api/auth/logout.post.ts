/**
 * Logout endpoint
 * POST /api/auth/logout
 */
export default defineEventHandler(async (event) => {
  const supabase = getServerSupabase(event)

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw createError({
      statusCode: 500,
      message: 'Error al cerrar sesión'
    })
  }

  return { success: true }
})
