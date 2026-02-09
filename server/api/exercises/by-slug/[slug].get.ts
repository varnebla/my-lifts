export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Exercise slug is required'
    })
  }

  const supabase = getServerSupabase(event)

  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Exercise not found'
      })
    }
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return data
})
