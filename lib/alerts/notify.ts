/**
 * WhatsApp notification via WATI
 *
 * Required env vars:
 *   WATI_API_URL   — e.g. https://live-server-XXXXX.wati.io
 *   WATI_API_TOKEN — Bearer token from WATI dashboard → API → Access Token
 *   WATI_PHONE     — default recipient number with country code, no + (e.g. 919876543210)
 *
 * WATI free trial: only pre-approved template messages can be sent to numbers
 * not yet in a 24-hour session window. Use sendTemplateMessage for first contact.
 */

interface WATIResponse {
  result: boolean
  info?: string
}

/**
 * Send a plain text session message (works when user has messaged within 24h)
 */
export async function notifyWhatsApp(
  message: string,
  number?: string
): Promise<void> {
  const apiUrl = process.env.WATI_API_URL
  const token = process.env.WATI_API_TOKEN
  const defaultPhone = process.env.WATI_PHONE

  const recipient = number ?? defaultPhone

  if (!apiUrl || !token || !recipient) {
    console.warn('[WhatsApp] Missing WATI_API_URL, WATI_API_TOKEN, or WATI_PHONE — skipping')
    return
  }

  // Strip leading + if present
  const phone = recipient.replace(/^\+/, '')

  try {
    const res = await fetch(
      `${apiUrl}/api/v1/sendSessionMessage/${phone}?messageText=${encodeURIComponent(message)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = (await res.json()) as WATIResponse

    if (!res.ok || !data.result) {
      console.error('[WhatsApp] WATI error:', data.info ?? res.statusText)
      // Fallback: try template message if session expired
      await notifyWhatsAppTemplate(message, phone, apiUrl, token)
    } else {
      console.log(`[WhatsApp] Sent to ${phone}`)
    }
  } catch (err) {
    console.error('[WhatsApp] Network error:', err)
  }
}

/**
 * Send a template message — works even without an active session.
 * Uses the "alert_notification" template — create this in WATI dashboard.
 * Template body (single variable): "{{1}}" — the alert message.
 */
async function notifyWhatsAppTemplate(
  message: string,
  phone: string,
  apiUrl: string,
  token: string
): Promise<void> {
  const templateName = process.env.WATI_TEMPLATE_NAME ?? 'alert_notification'

  try {
    const res = await fetch(`${apiUrl}/api/v1/sendTemplateMessage`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_name: templateName,
        broadcast_name: `alert_${Date.now()}`,
        receivers: [
          {
            whatsappNumber: phone,
            customParams: [{ name: '1', value: message.slice(0, 1024) }],
          },
        ],
      }),
    })

    const data = (await res.json()) as WATIResponse
    if (!res.ok || !data.result) {
      console.error('[WhatsApp] Template fallback also failed:', data.info ?? res.statusText)
    } else {
      console.log(`[WhatsApp] Template sent to ${phone}`)
    }
  } catch (err) {
    console.error('[WhatsApp] Template error:', err)
  }
}

/**
 * Send alert to all configured recipients.
 * WATI_PHONE can be comma-separated for multiple numbers.
 * e.g. WATI_PHONE=919876543210,919123456789
 */
export async function notifyAlertWhatsApp(alertMessage: string): Promise<void> {
  const phones = (process.env.WATI_PHONE ?? '').split(',').map((p) => p.trim()).filter(Boolean)
  if (phones.length === 0) {
    console.warn('[WhatsApp] No WATI_PHONE configured')
    return
  }
  await Promise.all(phones.map((phone) => notifyWhatsApp(alertMessage, phone)))
}
