/**
 * Get sets for a specific exercise
 * GET /api/sets/[exerciseId]
 */
export default defineEventHandler(async (event) => {
  const supabase = getServerSupabase(event)

  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw createError({
      statusCode: 401,
      message: 'No autenticado'
    })
  }

  const exerciseId = getRouterParam(event, 'exerciseId')

  if (!exerciseId) {
    throw createError({
      statusCode: 400,
      message: 'Exercise ID required'
    })
  }

  const { data, error } = await supabase
    .from('sets')
    .select(`
      *,
      exercise:exercises(id, name, slug, created_at)
    `)
    .eq('user_id', user.id)
    .eq('exercise_id', exerciseId)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }

  return data ?? []
})
