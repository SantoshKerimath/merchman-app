export async function notifyWhatsApp(message: string, number: string): Promise<void> {
  console.log(`[WhatsApp stub] → ${number}: ${message}`)
  // TODO(day15): replace with WATI API call
  // const res = await fetch(`${process.env.WATI_API_URL}/sendSessionMessage/${number}`, {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${process.env.WATI_API_TOKEN}` },
  //   body: JSON.stringify({ messageText: message }),
  // })
}
