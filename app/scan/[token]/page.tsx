import { WirelessScannerPhone } from '@/components/barcode/wireless-scanner-phone'

export const metadata = { title: 'Phone Scanner | Pesaby' }

export default async function PhoneScannerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <WirelessScannerPhone token={token} />
}
