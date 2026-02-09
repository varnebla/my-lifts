/**
 * Get user's sets with exercise data
 * GET /api/sets
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

  const query = getQuery(event)
  const limit = Number(query.limit) || 50

  const { data, error } = await supabase
    .from('sets')
    .select(`
      *,
      exercise:exercises(id, name, slug, created_at)
    `)
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }

  return data ?? []
})
