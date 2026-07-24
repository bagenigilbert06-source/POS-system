import { getSales, getSaleWithItems } from '@/app/actions/sales'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, Package, Clock } from 'lucide-react'

export default async function POSSalesHistoryPage() {
  const sales = await getSales(100)

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
            <Link key={s.id} href={`/dashboard/sales/${s.id}`}>
              <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
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
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{formatCurrency(parseFloat(s.total))}</div>
                    <div className="text-xs text-muted-foreground capitalize">{s.paymentMethod}</div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
