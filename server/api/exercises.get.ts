export default defineEventHandler(async (event) => {
  const supabase = getServerSupabase(event)

  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return data ?? []
})
