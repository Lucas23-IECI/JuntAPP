// Deno Edge Function: create-payment
// Path: backend/supabase/functions/create-payment/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { socioId, amount, concept, email } = await req.json()

    // 1. Register a pending transaction in database
    const { data: tx, error: txError } = await supabaseClient
      .from('transactions')
      .insert({
        type: 'ingreso',
        description: `PENDIENTE: ${concept} — Socio ID: ${socioId}`,
        amount: amount || 5000,
        date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (txError) throw txError

    // 2. Simulate Webpay/Flow session initiation
    // In production, you would do a fetch() call to Flow.cl or Transbank API:
    // const flowResponse = await fetch('https://sandbox.flow.cl/api/payment/create', { ... })
    // const flowData = await flowResponse.json()
    
    // For our secure simulator, we generate a mock token and return redirect info
    const token = crypto.randomUUID()
    const redirectUrl = `${req.headers.get('origin') || 'http://localhost:3000'}/#tesoreria?token=${token}&tx=${tx.id}&socio=${socioId}`

    return new Response(
      JSON.stringify({ 
        success: true, 
        paymentUrl: redirectUrl, 
        token: token,
        transactionId: tx.id 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    )
  }
})
