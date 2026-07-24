'use client'

import { useState, useRef } from 'react'
import { Search, Printer, X, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { ReceiptTemplate } from '@/components/receipt/receipt-template'
import { getSalesByReceiptNo, getSalesByDateRange } from '@/app/actions/pos-queries'
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
  onRefund?: (sale: Sale & { items: SaleItem[] }) => void
}

export function ReceiptReprint({ onClose, settings, onRefund }: ReceiptReprintProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'receipt' | 'date'>('receipt')
  const [sales, setSales] = useState<(Sale & { items: SaleItem[] })[]>([])
  const [selectedSale, setSelectedSale] = useState<(Sale & { items: SaleItem[] }) | null>(null)
  const [searching, setSearching] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Enter search criteria')
      return
    }

    setSearching(true)
    try {
      let results: (Sale & { items: SaleItem[] })[] = []
      
      if (searchType === 'receipt') {
        results = await getSalesByReceiptNo(searchQuery.trim())
        if (results.length === 0) {
          toast.error('No receipts found matching that number')
        } else {
          toast.success(`Found ${results.length} receipt(s)`)
        }
      } else if (searchType === 'date') {
        // Parse date range (format: YYYY-MM-DD or YYYY-MM-DD to YYYY-MM-DD)
        const parts = searchQuery.split('to')
        const startDate = new Date(parts[0].trim())
        const endDate = parts[1] ? new Date(parts[1].trim()) : new Date(parts[0].trim())
        
        if (isNaN(startDate.getTime())) {
          toast.error('Invalid date format. Use YYYY-MM-DD')
          setSearching(false)
          return
        }
        
        endDate.setHours(23, 59, 59, 999)
        results = await getSalesByDateRange(startDate, endDate)
        if (results.length === 0) {
          toast.error('No receipts found for that date range')
        } else {
          toast.success(`Found ${results.length} receipt(s)`)
        }
      }
      
      setSales(results)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to search receipts')
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
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Receipt Preview</h2>
            <button onClick={() => setSelectedSale(null)} className="p-1 hover:bg-gray-100 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={printRef} className="mb-6 border-b pb-4">
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
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium"
            >
              Back
            </button>
            {onRefund && (
              <button
                onClick={() => {
                  onRefund(selectedSale)
                  setSelectedSale(null)
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 font-medium"
              >
                Refund Sale
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium"
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
            <label className="block text-sm font-medium mb-2">Search Type</label>
            <select
              value={searchType}
              onChange={(e) => {
                setSearchType(e.target.value as 'receipt' | 'date')
                setSales([])
                setSearchQuery('')
              }}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="receipt">Receipt Number</option>
              <option value="date">Date Range</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {searchType === 'receipt' ? 'Receipt Number' : 'Date (YYYY-MM-DD)'}
            </label>
            <input
              type={searchType === 'date' ? 'text' : 'text'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchType === 'receipt' ? 'e.g., REC-001' : 'e.g., 2024-01-15 or 2024-01-01 to 2024-01-31'}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={searching}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
          >
            {searching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search
              </>
            )}
          </button>

          {sales.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2 text-sm flex items-center justify-between">
                Search Results ({sales.length})
                <button
                  onClick={() => {
                    setSales([])
                    setSearchQuery('')
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 font-normal flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Clear
                </button>
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sales.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSale(s)}
                    className="w-full p-3 text-left border rounded-lg hover:bg-blue-50 flex justify-between transition-colors"
                  >
                    <div>
                      <div className="font-medium text-sm">{s.receiptNo}</div>
                      <div className="text-xs text-gray-600">{new Date(s.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="font-medium text-sm">{formatCurrency(parseFloat(s.total))}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
