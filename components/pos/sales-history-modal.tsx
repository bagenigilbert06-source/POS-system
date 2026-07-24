'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, History } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { getRecentSales } from '@/app/actions/pos-queries'
import type { Sale, SaleItem } from '@/lib/db/schema'

interface SalesHistoryModalProps {
  onClose: () => void
  onSelectSale?: (sale: Sale & { items: SaleItem[] }) => void
}

export function SalesHistoryModal({ onClose, onSelectSale }: SalesHistoryModalProps) {
  const [sales, setSales] = useState<(Sale & { items: SaleItem[] })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const data = await getRecentSales(30)
        setSales(data)
      } catch (error) {
        toast.error('Failed to load sales history')
      } finally {
        setLoading(false)
      }
    }
    fetchSales()
  }, [])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <History className="h-5 w-5" />
            Sales History
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : sales.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center py-12">
            <p className="text-gray-500">No sales history available</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-2">
              {sales.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectSale?.(s)}
                  className="w-full p-3 text-left border rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-sm">{s.receiptNo}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {new Date(s.createdAt).toLocaleString()}
                      <span className="mx-2">•</span>
                      {s.items.length} item{s.items.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">{formatCurrency(parseFloat(s.total))}</div>
                    <div className="text-xs text-gray-600 capitalize">{s.paymentMethod}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium"
        >
          Close
        </button>
      </div>
    </div>
  )
}
