// Deno Edge Function: payment-webhook
// Path: backend/supabase/functions/payment-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { transactionId, socioId, status } = await req.json()

    if (status === 'approved') {
      // 1. Fetch current transaction
      const { data: tx, error: txError } = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single()

      if (txError) throw txError

      // 2. Clean the description (remove PENDIENTE prefix)
      const cleanDesc = tx.description.replace('PENDIENTE: ', '').split(' — Socio')[0];

      const { error: updateTxError } = await supabaseClient
        .from('transactions')
        .update({
          description: `${cleanDesc} (Webpay Aprobado)`
        })
        .eq('id', transactionId)

      if (updateTxError) throw updateTxError

      // 3. Update profile cuota status
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({
          cuota_status: 'al_dia'
        })
        .eq('id', socioId)

      if (profileError) throw profileError

      // 4. Send success notification
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: socioId,
          type: 'cuota',
          title: 'Pago Recibido con Éxito',
          message: `Tu pago de Cuota de $5.000 ha sido procesado correctamente. ¡Gracias por mantenerte al día!`,
          read: false
        })

      return new Response(
        JSON.stringify({ success: true, message: 'Payment successfully processed' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      )
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Payment not approved' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    )
  }
})
