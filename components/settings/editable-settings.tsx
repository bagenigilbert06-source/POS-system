'use client'

import { useState } from 'react'
import { Loader2, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { updateBusinessSettings, updateOrganizationSettings } from '@/app/actions/settings-actions'
import type { BusinessSettings, Organization } from '@/lib/db/schema'

interface EditableSettingsProps {
  businessSettings: BusinessSettings | null
  organization: Organization
}

export function EditableSettings({ businessSettings, organization }: EditableSettingsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    displayName: businessSettings?.displayName || organization.name,
    address: businessSettings?.address || '',
    city: businessSettings?.city || '',
    region: businessSettings?.region || '',
    taxRate: businessSettings?.taxRate?.toString() || '16',
    taxName: businessSettings?.taxName || 'VAT',
    receiptBusinessName: businessSettings?.receiptBusinessName || '',
    receiptPhone: businessSettings?.receiptPhone || '',
    receiptAddress: businessSettings?.receiptAddress || '',
    receiptFooter: businessSettings?.receiptFooter || '',
    defaultPaymentMethod: businessSettings?.defaultPaymentMethod || 'cash',
    currency: organization.currency,
    timezone: organization.timezone || 'Africa/Nairobi',
  })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await Promise.all([
        updateBusinessSettings({
          displayName: formData.displayName,
          address: formData.address,
          city: formData.city,
          region: formData.region,
          taxRate: parseFloat(formData.taxRate),
          taxName: formData.taxName,
          receiptBusinessName: formData.receiptBusinessName,
          receiptPhone: formData.receiptPhone,
          receiptAddress: formData.receiptAddress,
          receiptFooter: formData.receiptFooter,
          defaultPaymentMethod: formData.defaultPaymentMethod,
        }),
        updateOrganizationSettings({
          name: formData.displayName,
          currency: formData.currency,
          timezone: formData.timezone,
          taxRate: parseFloat(formData.taxRate),
        }),
      ])

      toast.success('Settings updated successfully')
      setIsEditing(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {isEditing ? (
        <div className="space-y-6 rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold">Edit Business Settings</h3>

          {/* Business Profile */}
          <div className="space-y-4 border-b pb-6">
            <h4 className="font-medium">Business Profile</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Business Name</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="KES">KES (Kenya Shilling)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Region</label>
              <input
                type="text"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Tax Settings */}
          <div className="space-y-4 border-b pb-6">
            <h4 className="font-medium">Tax Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tax Name</label>
                <input
                  type="text"
                  value={formData.taxName}
                  onChange={(e) => setFormData({ ...formData, taxName: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tax Rate (%)</label>
                <input
                  type="number"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Receipt Settings */}
          <div className="space-y-4 border-b pb-6">
            <h4 className="font-medium">Receipt Settings</h4>
            <div>
              <label className="text-sm font-medium">Receipt Business Name</label>
              <input
                type="text"
                value={formData.receiptBusinessName}
                onChange={(e) => setFormData({ ...formData, receiptBusinessName: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Receipt Phone</label>
                <input
                  type="text"
                  value={formData.receiptPhone}
                  onChange={(e) => setFormData({ ...formData, receiptPhone: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Default Payment Method</label>
                <select
                  value={formData.defaultPaymentMethod}
                  onChange={(e) => setFormData({ ...formData, defaultPaymentMethod: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mpesa">M-Pesa</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Receipt Address</label>
              <textarea
                value={formData.receiptAddress}
                onChange={(e) => setFormData({ ...formData, receiptAddress: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Receipt Footer</label>
              <textarea
                value={formData.receiptFooter}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                rows={2}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Business Settings</h3>
            <Button onClick={() => setIsEditing(true)}>Edit Settings</Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Business Name</p>
              <p className="font-medium">{formData.displayName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Currency</p>
              <p className="font-medium">{formData.currency}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">City</p>
              <p className="font-medium">{formData.city || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tax Rate</p>
              <p className="font-medium">{formData.taxRate}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
