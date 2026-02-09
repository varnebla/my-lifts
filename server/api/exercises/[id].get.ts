export default defineEventHandler(async (event) => {
  const exerciseId = getRouterParam(event, 'id')

  if (!exerciseId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Exercise ID is required'
    })
  }

  const supabase = getServerSupabase(event)

  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', exerciseId)
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
