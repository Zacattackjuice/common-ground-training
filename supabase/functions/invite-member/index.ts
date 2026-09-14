import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } })

const normaliseEmails = (value: unknown) => {
  const items = Array.isArray(value) ? value : String(value || '').split(/[\s,;]+/)
  return [...new Set(items.map((item) => String(item).trim().toLowerCase()).filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)))]
}

const firstSecretValue = (raw: string | undefined) => {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return String(Object.values(parsed)[0] || '')
  } catch {
    return raw
  }
  return undefined
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || firstSecretValue(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS'))
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || firstSecretValue(Deno.env.get('SUPABASE_SECRET_KEYS')) || Deno.env.get('SUPABASE_SECRET_KEY')
  if (!url || !anon || !serviceRole) return json({ error: 'Supabase function secrets are not configured' }, 500)

  const authHeader = req.headers.get('Authorization') || ''
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
  const adminClient = createClient(url, serviceRole)
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return json({ error: 'Authentication required' }, 401)

  let payload: { organisation_id?: string; emails?: unknown; redirect_to?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const organisationId = payload.organisation_id
  const emails = normaliseEmails(payload.emails)
  if (!organisationId || !emails.length) return json({ error: 'Provide an organisation_id and at least one valid email' }, 400)

  const { data: membership, error: membershipError } = await userClient
    .from('organisation_members')
    .select('role,status')
    .eq('organisation_id', organisationId)
    .eq('user_id', userData.user.id)
    .eq('status', 'active')
    .eq('role', 'admin')
    .maybeSingle()

  if (membershipError) return json({ error: membershipError.message }, 400)
  if (!membership) return json({ error: 'Only organisation admins can invite members' }, 403)

  const redirectTo = payload.redirect_to || `${req.headers.get('origin') || ''}/#invite`
  const results = []

  for (const email of emails) {
    const invite = {
      organisation_id: organisationId,
      email,
      role: 'user',
      status: 'pending',
      invited_by: userData.user.id,
    }

    const { error: inviteError } = await adminClient
      .from('organisation_invites')
      .upsert(invite, { onConflict: 'organisation_id,email' })

    if (inviteError) {
      results.push({ email, ok: false, error: inviteError.message })
      continue
    }

    const { error: authError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { organisation_id: organisationId, role: 'user' },
    })

    if (authError) {
      const { data: profile } = await adminClient.from('profiles').select('id').eq('email', email).maybeSingle()
      if (profile?.id) {
        await adminClient.from('organisation_members').upsert(
          { organisation_id: organisationId, user_id: profile.id, role: 'user', status: 'active' },
          { onConflict: 'organisation_id,user_id' },
        )
        await adminClient
          .from('organisation_invites')
          .update({ status: 'accepted', accepted_by: profile.id, accepted_at: new Date().toISOString() })
          .eq('organisation_id', organisationId)
          .eq('email', email)
        results.push({ email, ok: true, existingUser: true })
      } else {
        results.push({ email, ok: false, error: authError.message })
      }
    } else {
      results.push({ email, ok: true })
    }
  }

  return json({ invited: results })
})
