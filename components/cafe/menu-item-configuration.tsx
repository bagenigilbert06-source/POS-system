'use client';

import { useState, useTransition } from 'react';
import {
  getCafeMenuConfiguration,
  saveCafeMenuSettings,
  saveCafeModifierGroup,
  saveCafeRecipe,
} from '@/app/actions/cafe';
import { notify } from '@/lib/notify';

type Data = Awaited<ReturnType<typeof getCafeMenuConfiguration>>;
type RecipeRow = {
  packageId: string;
  modifierOptionId: string;
  ingredientProductId: string;
  quantityBase: string;
};

export function CafeMenuItemConfiguration({ data }: { data: Data }) {
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState({
    inventoryMode: (data.menu?.inventoryMode ?? 'product') as
      | 'product'
      | 'recipe'
      | 'none',
    preparationRequired: data.menu?.preparationRequired ?? false,
    stationId: data.menu?.stationId ?? '',
    manualAvailability: (data.menu?.manualAvailability ?? 'available') as
      | 'available'
      | 'unavailable',
    availabilityReason: data.menu?.availabilityReason ?? '',
  });
  const [modifier, setModifier] = useState({
    name: '',
    required: false,
    multiple: false,
    optionName: '',
    optionPrice: '0',
  });
  const [recipes, setRecipes] = useState<RecipeRow[]>(
    data.recipes.map((row) => ({
      packageId: row.packageId ?? '',
      modifierOptionId: row.modifierOptionId ?? '',
      ingredientProductId: row.ingredientProductId,
      quantityBase: String(row.quantityBase),
    }))
  );
  const linkedGroupIds = new Set(data.links.map((row) => row.groupId));
  const linkedGroups = data.groups.filter((row) => linkedGroupIds.has(row.id));
  const modifierOptions = data.options.filter((row) =>
    linkedGroupIds.has(row.groupId)
  );
  const field =
    'h-10 w-full rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm outline-none focus:border-[#f9b21d] dark:border-white/10 dark:bg-[#141414]';
  const run = (work: () => Promise<unknown>, message: string) =>
    startTransition(async () => {
      try {
        await work();
        notify.success(message);
      } catch (error) {
        notify.error(
          error instanceof Error
            ? error.message
            : 'Could not save café menu setup'
        );
      }
    });
  return (
    <section className="rounded-xl border border-[#e4e7ec] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#141414]">
      <h2 className="text-base font-bold">Café menu setup</h2>
      <p className="mt-1 text-xs text-[#667085] dark:text-[#a8a8a8]">
        Preparation, sold-out controls, modifiers and exact base-unit recipe
        deductions.
      </p>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="rounded-xl border p-4 dark:border-white/10">
          <h3 className="text-sm font-bold">Behavior</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold">
              Inventory
              <select
                className={field}
                value={settings.inventoryMode}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    inventoryMode: e.target
                      .value as typeof settings.inventoryMode,
                  })
                }
              >
                <option value="product">Packaged stock</option>
                <option value="recipe">Recipe ingredients</option>
                <option value="none">No stock tracking</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold">
              Availability
              <select
                className={field}
                value={settings.manualAvailability}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    manualAvailability: e.target
                      .value as typeof settings.manualAvailability,
                  })
                }
              >
                <option value="available">Available</option>
                <option value="unavailable">Sold out</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold">
              Station
              <select
                className={field}
                value={settings.stationId}
                onChange={(e) =>
                  setSettings({ ...settings, stationId: e.target.value })
                }
              >
                <option value="">No station</option>
                {data.stations.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 pt-5 text-sm font-semibold">
              <input
                className="h-5 w-5 accent-[#f9b21d]"
                type="checkbox"
                checked={settings.preparationRequired}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    preparationRequired: e.target.checked,
                  })
                }
              />
              Preparation required
            </label>
            <input
              className={`${field} sm:col-span-2`}
              placeholder="Sold-out reason (optional)"
              value={settings.availabilityReason}
              onChange={(e) =>
                setSettings({ ...settings, availabilityReason: e.target.value })
              }
            />
          </div>
          <button
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  saveCafeMenuSettings({
                    productId: data.item.id,
                    ...settings,
                    stationId: settings.stationId || undefined,
                    availabilityReason:
                      settings.availabilityReason || undefined,
                  }),
                'Menu behavior saved'
              )
            }
            className="mt-4 h-10 rounded-lg bg-[#101828] px-4 text-sm font-bold text-white dark:bg-white dark:text-black"
          >
            Save behavior
          </button>
        </div>
        <div className="rounded-xl border p-4 dark:border-white/10">
          <h3 className="text-sm font-bold">Modifiers</h3>
          <div className="mt-3 space-y-2">
            {linkedGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-lg bg-[#f8fafc] px-3 py-2 text-sm dark:bg-white/5"
              >
                <span className="font-semibold">{group.name}</span>
                <span className="text-[#667085]">
                  {' '}
                  ·{' '}
                  {data.options
                    .filter((row) => row.groupId === group.id)
                    .map((row) => row.name)
                    .join(', ')}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              className={field}
              placeholder="Group e.g. Milk"
              value={modifier.name}
              onChange={(e) =>
                setModifier({ ...modifier, name: e.target.value })
              }
            />
            <input
              className={field}
              placeholder="Option e.g. Oat"
              value={modifier.optionName}
              onChange={(e) =>
                setModifier({ ...modifier, optionName: e.target.value })
              }
            />
            <input
              className={field}
              type="number"
              step="0.01"
              placeholder="Price adjustment"
              value={modifier.optionPrice}
              onChange={(e) =>
                setModifier({ ...modifier, optionPrice: e.target.value })
              }
            />
            <div className="flex items-center gap-4 text-xs font-semibold">
              <label>
                <input
                  type="checkbox"
                  checked={modifier.required}
                  onChange={(e) =>
                    setModifier({ ...modifier, required: e.target.checked })
                  }
                />{' '}
                Required
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={modifier.multiple}
                  onChange={(e) =>
                    setModifier({ ...modifier, multiple: e.target.checked })
                  }
                />{' '}
                Multiple
              </label>
            </div>
          </div>
          <button
            disabled={pending || !modifier.name || !modifier.optionName}
            onClick={() =>
              run(
                () =>
                  saveCafeModifierGroup({
                    productId: data.item.id,
                    name: modifier.name,
                    selectionType: modifier.multiple ? 'multiple' : 'single',
                    minimumSelections: modifier.required ? 1 : 0,
                    maximumSelections: modifier.multiple ? 10 : 1,
                    options: [
                      {
                        name: modifier.optionName,
                        priceAdjustment: Number(modifier.optionPrice),
                        isActive: true,
                      },
                    ],
                  }),
                'Modifier added'
              )
            }
            className="mt-3 h-10 rounded-lg bg-[#f9b21d] px-4 text-sm font-extrabold text-[#241d00] disabled:opacity-50"
          >
            Add modifier
          </button>
        </div>
      </div>
      <div className="mt-5 rounded-xl border p-4 dark:border-white/10">
        <div className="flex justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">Recipe / bill of materials</h3>
            <p className="mt-1 text-xs text-[#667085]">
              Use smallest units: g, ml or pieces. Scope a row to one size or
              modifier when needed. Modifier rows may use a negative quantity to
              replace a base ingredient (for example, Milk −220 and Oat milk
              +220).
            </p>
          </div>
          <button
            onClick={() =>
              setRecipes([
                ...recipes,
                {
                  packageId: '',
                  modifierOptionId: '',
                  ingredientProductId: '',
                  quantityBase: '',
                },
              ])
            }
            className="h-9 rounded-lg border px-3 text-xs font-bold"
          >
            Add row
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {recipes.map((row, index) => (
            <div
              key={index}
              className="grid gap-2 lg:grid-cols-[1.4fr_1fr_1fr_130px_auto]"
            >
              <select
                className={field}
                value={row.ingredientProductId}
                onChange={(e) =>
                  setRecipes(
                    recipes.map((item, i) =>
                      i === index
                        ? { ...item, ingredientProductId: e.target.value }
                        : item
                    )
                  )
                }
              >
                <option value="">Ingredient</option>
                {data.ingredients.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </option>
                ))}
              </select>
              <select
                className={field}
                disabled={Boolean(row.modifierOptionId)}
                value={row.packageId}
                onChange={(e) =>
                  setRecipes(
                    recipes.map((item, i) =>
                      i === index
                        ? { ...item, packageId: e.target.value }
                        : item
                    )
                  )
                }
              >
                <option value="">All sizes</option>
                {data.packages.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                className={field}
                disabled={Boolean(row.packageId)}
                value={row.modifierOptionId}
                onChange={(e) =>
                  setRecipes(
                    recipes.map((item, i) =>
                      i === index
                        ? { ...item, modifierOptionId: e.target.value }
                        : item
                    )
                  )
                }
              >
                <option value="">No modifier effect</option>
                {modifierOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <input
                className={field}
                type="number"
                step="1"
                placeholder="Base qty (+/−)"
                value={row.quantityBase}
                onChange={(e) =>
                  setRecipes(
                    recipes.map((item, i) =>
                      i === index
                        ? { ...item, quantityBase: e.target.value }
                        : item
                    )
                  )
                }
              />
              <button
                onClick={() =>
                  setRecipes(recipes.filter((_, i) => i !== index))
                }
                className="h-10 rounded-lg border px-3 text-xs text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          disabled={pending}
          onClick={() =>
            run(
              () =>
                saveCafeRecipe({
                  productId: data.item.id,
                  rows: recipes
                    .filter(
                      (row) =>
                        row.ingredientProductId &&
                        Number(row.quantityBase) !== 0
                    )
                    .map((row) => ({
                      packageId: row.packageId || undefined,
                      modifierOptionId: row.modifierOptionId || undefined,
                      ingredientProductId: row.ingredientProductId,
                      quantityBase: Number(row.quantityBase),
                    })),
                }),
              'Recipe saved'
            )
          }
          className="mt-4 h-10 rounded-lg bg-[#101828] px-4 text-sm font-bold text-white dark:bg-white dark:text-black"
        >
          Save recipe
        </button>
      </div>
    </section>
  );
}
