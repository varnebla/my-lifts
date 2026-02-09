/**
 * Get sets for a specific exercise by slug
 * GET /api/sets/by-exercise-slug/[slug]
 */
export default defineEventHandler(async (event) => {
  const supabase = getServerSupabase(event)

  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No autenticado'
    })
  }

  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Exercise slug required'
    })
  }

  // First get the exercise ID from slug
  const { data: exercise, error: exerciseError } = await supabase
    .from('exercises')
    .select('id')
    .eq('slug', slug)
    .single()

  if (exerciseError || !exercise) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Exercise not found'
    })
  }

  const { data, error } = await supabase
    .from('sets')
    .select(`
      *,
      exercise:exercises(id, name, slug, created_at)
    `)
    .eq('user_id', user.id)
    .eq('exercise_id', exercise.id)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return data ?? []
})
