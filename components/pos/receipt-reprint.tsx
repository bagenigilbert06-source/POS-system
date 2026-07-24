'use client'

import { useState, useRef } from 'react'
import { Search, Printer, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { ReceiptTemplate } from '@/components/receipt/receipt-template'
import type { Sale, SaleItem } from '@/lib/db/schema'

interface ReceiptReprintProps {
  onClose: () => void
  settings: {
    receiptBusinessName: string
    receiptPhone: string
    receiptAddress: string
    receiptFooter: string
    taxName: string
  }
}

export function ReceiptReprint({ onClose, settings }: ReceiptReprintProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sales, setSales] = useState<(Sale & { items: SaleItem[] })[]>([])
  const [selectedSale, setSelectedSale] = useState<(Sale & { items: SaleItem[] }) | null>(null)
  const [searching, setSearching] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Enter receipt number or search criteria')
      return
    }

    setSearching(true)
    try {
      // Mock search - in production, fetch from API
      // This would search for sales by receipt number, date range, etc.
      toast.info('Receipt search feature coming soon')
    } catch (error) {
      toast.error('Failed to search receipts')
    } finally {
      setSearching(false)
    }
  }

  const handlePrint = () => {
    if (printRef.current) {
      window.print()
    }
  }

  if (selectedSale) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Receipt Preview</h2>
            <button onClick={() => setSelectedSale(null)} className="p-1 hover:bg-gray-100 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={printRef} className="mb-6">
            <ReceiptTemplate
              sale={selectedSale}
              businessName={settings.receiptBusinessName}
              businessPhone={settings.receiptPhone}
              businessAddress={settings.receiptAddress}
              receiptFooter={settings.receiptFooter}
              taxName={settings.taxName}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setSelectedSale(null)}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Reprint Receipt</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Receipt Number or Date</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., REC-123456 or 2024-01-15"
              className="w-full px-3 py-2 border rounded-lg"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={searching}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            Search
          </button>

          {sales.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Search Results</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sales.map(sale => (
                  <button
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className="w-full p-3 text-left border rounded-lg hover:bg-blue-50 flex justify-between"
                  >
                    <div>
                      <div className="font-medium">{sale.receiptNo}</div>
                      <div className="text-xs text-gray-600">{new Date(sale.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="font-medium">{formatCurrency(parseFloat(sale.total))}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
