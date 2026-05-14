import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!
)

export default async function handler(req: any, res: any) {
  const { error } = await supabase
    .from('ping')
    .select('id')
    .limit(1)

  if (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    })
  }

  return res.status(200).json({
    ok: true
  })
}