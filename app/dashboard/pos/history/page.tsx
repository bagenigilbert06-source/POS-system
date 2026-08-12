import { getRecentSales } from '@/app/actions/pos-queries'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, Package, Clock } from 'lucide-react'
import { getCurrentSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'

export default async function POSSalesHistoryPage() {
  if (!(await getCurrentSession())?.user && !(await getPosAuthorizationContext())) redirect('/sign-in')
  const sales = await getRecentSales(100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales History</h1>
          <p className="text-muted-foreground mt-1">Recent POS transactions and receipts</p>
        </div>
        <Link href="/dashboard/pos">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to POS
          </Button>
        </Link>
      </div>

      {sales.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">No sales recorded yet</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sales.map((s) => (
            <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{s.receiptNo}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.status === 'completed' ? 'bg-green-100 text-green-800' :
                        s.status === 'refunded' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(s.createdAt).toLocaleString()}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {s.items.map((item) => `${item.quantity}× ${item.productName}`).join(', ') || 'No item details'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{formatCurrency(parseFloat(s.total))}</div>
                    <div className="text-xs text-muted-foreground capitalize">{s.paymentMethod}</div>
                  </div>
                </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
