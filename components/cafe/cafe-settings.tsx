'use client';

import { useState, useTransition } from 'react';
import { getCafeConfigurationData, saveCafeConfiguration, saveCafeStation, saveCafeTable } from '@/app/actions/cafe';
import { notify } from '@/lib/notify';

type Data = Awaited<ReturnType<typeof getCafeConfigurationData>>;
type OrderType = 'takeaway' | 'dine_in' | 'delivery';

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (value: boolean) => void; label: string; description: string }) {
  return <label className="flex cursor-pointer items-start justify-between gap-5 border-b border-[#eef0f3] py-4 last:border-0 dark:border-white/10"><span><span className="block text-sm font-bold">{label}</span><span className="mt-1 block text-xs leading-5 text-[#667085] dark:text-[#a8a8a8]">{description}</span></span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 accent-[#f9b21d]" /></label>;
}

export function CafeSettings({ initialData, canEdit, canEditTables }: { initialData: Data; canEdit: boolean; canEditTables: boolean }) {
  const [data, setData] = useState(initialData);
  const [pending, startTransition] = useTransition();
  const [config, setConfig] = useState({
    enabledOrderTypes: initialData.configuration.enabledOrderTypes as OrderType[],
    defaultOrderType: initialData.configuration.defaultOrderType as OrderType,
    tablesEnabled: initialData.configuration.tablesEnabled,
    preparationEnabled: initialData.configuration.preparationEnabled,
    stationsEnabled: initialData.configuration.stationsEnabled,
    tipsEnabled: initialData.configuration.tipsEnabled,
    kitchenPrintingEnabled: initialData.configuration.kitchenPrintingEnabled,
  });
  const [tableForm, setTableForm] = useState({ branchId: initialData.branches[0]?.id ?? '', name: '' });
  const [stationForm, setStationForm] = useState({ branchId: '', name: '', printerIdentifier: '' });
  const refresh = async () => setData(await getCafeConfigurationData());
  const save = () => startTransition(async () => { try { await saveCafeConfiguration(config); await refresh(); notify.success('Café configuration saved'); } catch (error) { notify.error(error instanceof Error ? error.message : 'Could not save configuration'); } });
  const addTable = () => startTransition(async () => { try { await saveCafeTable({ ...tableForm, isActive: true }); setTableForm((current) => ({ ...current, name: '' })); await refresh(); notify.success('Table added'); } catch (error) { notify.error(error instanceof Error ? error.message : 'Could not add table'); } });
  const addStation = () => startTransition(async () => { try { await saveCafeStation({ ...stationForm, branchId: stationForm.branchId || undefined, printerIdentifier: stationForm.printerIdentifier || undefined, isActive: true }); setStationForm({ branchId: '', name: '', printerIdentifier: '' }); await refresh(); notify.success('Preparation station added'); } catch (error) { notify.error(error instanceof Error ? error.message : 'Could not add station'); } });
  const field = 'h-10 rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm outline-none focus:border-[#f9b21d] dark:border-white/10 dark:bg-[#141414]';
  const toggleOrderType = (type: OrderType, enabled: boolean) => setConfig((current) => {
    const enabledOrderTypes = enabled ? [...new Set([...current.enabledOrderTypes, type])] : current.enabledOrderTypes.filter((value) => value !== type);
    return { ...current, enabledOrderTypes, defaultOrderType: enabledOrderTypes.includes(current.defaultOrderType) ? current.defaultOrderType : enabledOrderTypes[0] ?? 'takeaway', ...(type === 'dine_in' && !enabled ? { tablesEnabled: false } : {}) };
  });
  return <div className="grid gap-5 xl:grid-cols-2">
    <section className="rounded-xl border border-[#e4e7ec] bg-white p-5 dark:border-white/10 dark:bg-[#171717]">
      <h2 className="text-base font-bold">Order experience</h2><p className="mt-1 text-xs text-[#667085] dark:text-[#a8a8a8]">Keep a small counter simple, or enable dine-in and preparation as needed.</p>
      <div className="mt-4">
        <Toggle checked={config.enabledOrderTypes.includes('takeaway')} onChange={(value) => toggleOrderType('takeaway', value)} label="Takeaway" description="Counter orders collected by the guest." />
        <Toggle checked={config.enabledOrderTypes.includes('dine_in')} onChange={(value) => toggleOrderType('dine_in', value)} label="Dine-in" description="Orders can be assigned to configured tables." />
        <Toggle checked={config.tablesEnabled} onChange={(tablesEnabled) => setConfig((current) => ({ ...current, tablesEnabled, enabledOrderTypes: tablesEnabled ? [...new Set([...current.enabledOrderTypes, 'dine_in' as const])] : current.enabledOrderTypes }))} label="Table service" description="Require a table on dine-in checkout and track occupancy." />
        <Toggle checked={config.preparationEnabled} onChange={(preparationEnabled) => setConfig((current) => ({ ...current, preparationEnabled, ...(!preparationEnabled ? { stationsEnabled: false, kitchenPrintingEnabled: false } : {}) }))} label="Preparation workflow" description="Send prepared items through New, Preparing, Ready and Completed." />
        <Toggle checked={config.stationsEnabled} onChange={(stationsEnabled) => setConfig((current) => ({ ...current, stationsEnabled }))} label="Preparation stations" description="Optionally route menu items to Bar, Kitchen or Bakery." />
        <Toggle checked={config.kitchenPrintingEnabled} onChange={(kitchenPrintingEnabled) => setConfig((current) => ({ ...current, kitchenPrintingEnabled }))} label="Preparation tickets" description="Allow station-specific ticket printer assignments." />
        <Toggle checked={config.tipsEnabled} onChange={(tipsEnabled) => setConfig((current) => ({ ...current, tipsEnabled }))} label="Tips" description="Optional only; no tip or service charge is added automatically." />
      </div>
      <label className="mt-4 grid gap-1.5 text-xs font-bold">Default order type<select className={field} value={config.defaultOrderType} onChange={(e) => setConfig({ ...config, defaultOrderType: e.target.value as OrderType })}>{config.enabledOrderTypes.map((type) => <option key={type} value={type}>{type.replace('_', '-')}</option>)}</select></label>
      {canEdit && <button type="button" disabled={pending || !config.enabledOrderTypes.length} onClick={save} className="mt-5 h-11 w-full rounded-lg bg-[#f9b21d] text-sm font-extrabold text-[#241d00] disabled:opacity-50">{pending ? 'Saving…' : 'Save café settings'}</button>}
    </section>
    <div className="space-y-5">
      <section className="rounded-xl border border-[#e4e7ec] bg-white p-5 dark:border-white/10 dark:bg-[#171717]"><h2 className="font-bold">Tables</h2><p className="mt-1 text-xs text-[#667085] dark:text-[#a8a8a8]">Nothing is created automatically. Add only real service destinations.</p>{canEditTables && <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><select className={field} value={tableForm.branchId} onChange={(e) => setTableForm({ ...tableForm, branchId: e.target.value })}>{data.branches.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select><input className={field} placeholder="Table 1 or Patio 3" value={tableForm.name} onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })} /><button disabled={pending || !tableForm.name.trim()} onClick={addTable} className="h-10 rounded-lg bg-[#101828] px-4 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-black">Add</button></div>}<div className="mt-4 flex flex-wrap gap-2">{data.tables.map((table) => <span key={table.id} className="rounded-lg border border-[#e4e7ec] px-3 py-2 text-xs font-semibold dark:border-white/10">{table.name} · <span className="capitalize text-[#667085] dark:text-[#a8a8a8]">{table.status.replace('_', ' ')}</span></span>)}{!data.tables.length && <p className="text-sm text-[#667085]">No tables configured.</p>}</div></section>
      <section className="rounded-xl border border-[#e4e7ec] bg-white p-5 dark:border-white/10 dark:bg-[#171717]"><h2 className="font-bold">Preparation stations & printers</h2><p className="mt-1 text-xs text-[#667085] dark:text-[#a8a8a8]">Stations are optional and may use a device-specific printer identifier.</p>{canEdit && <div className="mt-4 grid gap-2"><div className="grid gap-2 sm:grid-cols-2"><input className={field} placeholder="Bar, Kitchen or Bakery" value={stationForm.name} onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })} /><select className={field} value={stationForm.branchId} onChange={(e) => setStationForm({ ...stationForm, branchId: e.target.value })}><option value="">All branches</option>{data.branches.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div><div className="grid gap-2 sm:grid-cols-[1fr_auto]"><input className={field} placeholder="Printer identifier (optional)" value={stationForm.printerIdentifier} onChange={(e) => setStationForm({ ...stationForm, printerIdentifier: e.target.value })} /><button disabled={pending || !stationForm.name.trim()} onClick={addStation} className="h-10 rounded-lg bg-[#101828] px-4 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-black">Add station</button></div></div>}<div className="mt-4 divide-y divide-[#eef0f3] dark:divide-white/10">{data.stations.map((station) => <div key={station.id} className="flex justify-between gap-4 py-3 text-sm"><span className="font-semibold">{station.name}</span><span className="text-[#667085] dark:text-[#a8a8a8]">{station.printerIdentifier || 'No printer assigned'}</span></div>)}{!data.stations.length && <p className="py-3 text-sm text-[#667085]">No stations configured.</p>}</div></section>
    </div>
  </div>;
}
