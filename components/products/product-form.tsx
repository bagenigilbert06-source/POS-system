'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  createProduct,
  findProductByBarcode,
  updateProduct,
} from '@/app/actions/products';
import { createCategory } from '@/app/actions/categories';
import { cn, formatCurrency, normalizeBarcode } from '@/lib/utils';
import { getGrossMargin } from '@/lib/pricing/gross-margin';
import {
  Barcode,
  Boxes,
  Check,
  CircleDollarSign,
  ImageIcon,
  Package2,
  Smartphone,
  Tag,
  Upload,
  X,
} from 'lucide-react';
import type { PharmacyProduct, Product } from '@/lib/db/schema';
import { notify } from '@/lib/notify';
import { WirelessScannerPairing } from '@/components/barcode/wireless-scanner-pairing';
import { useWorkspace } from '@/lib/context/workspace-context';
import { isPharmacyBusiness } from '@/lib/pharmacy/rules';
import { isCafeBusiness } from '@/lib/hospitality/rules';
import { getProductTerminology } from '@/lib/products/terminology';
import { LoadingSpinner as Loader2 } from '@/components/ui/page-loader';

interface ProductFormProps {
  product?: Product;
  categories: Array<{
    id: string;
    name: string;
    parentCategoryId?: string | null;
    isActive?: boolean;
  }>;
  onClose?: () => void;
  initialCategoryId?: string;
  initialBarcode?: string;
  pharmacyMetadata?: PharmacyProduct | null;
}

const SELLING_UNITS = [
  'bottle',
  'can',
  'case',
  'carton',
  'crate',
  'pack',
  'keg',
  'piece',
  'other',
];
const PHARMACY_SELLING_UNITS = [
  'tablet',
  'capsule',
  'strip',
  'bottle',
  'box',
  'tube',
  'sachet',
  'vial',
  'ampoule',
  'pack',
  'piece',
  'other',
];
const CAFE_SELLING_UNITS = [
  'item',
  'serving',
  'piece',
  'cup',
  'slice',
  'g',
  'ml',
  'pack',
];
const VOLUME_UNITS = ['ml', 'litre'];

export function ProductForm({
  product,
  categories,
  onClose,
  initialCategoryId,
  initialBarcode,
  pharmacyMetadata,
}: ProductFormProps) {
  const { config } = useWorkspace();
  const isPharmacy = Boolean(
    config && isPharmacyBusiness(config.businessType, config.businessCategory)
  );
  const isCafe = Boolean(
    config && isCafeBusiness(config.businessType, config.businessCategory)
  );
  const isLiquor = config?.businessCategory === 'liquor_shop';
  const terminology = getProductTerminology(
    config?.businessType,
    config?.businessCategory
  );
  const router = useRouter();
  const closeEditor = () => {
    if (onClose) onClose();
    else router.push('/dashboard/products');
  };
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<{
    name?: string;
    categoryId?: string;
    sellingPrice?: string;
    buyingPrice?: string;
    stock?: string;
    barcode?: string;
  }>({});
  const [barcodeMatch, setBarcodeMatch] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showPhoneScanner, setShowPhoneScanner] = useState(false);
  const [availableCategories, setAvailableCategories] = useState(categories);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    parentCategoryId: '',
    description: '',
  });
  const [creatingCategory, setCreatingCategory] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const barcodeCheckRef = useRef(0);
  const [form, setForm] = useState({
    name: product?.name ?? '',
    brand: product?.brand ?? '',
    variant: product?.variant ?? '',
    sku: product?.sku ?? '',
    barcode: product?.barcode ?? normalizeBarcode(initialBarcode ?? ''),
    description: product?.description ?? '',
    imageUrl: product?.imageUrl ?? '',
    categoryId: product?.categoryId ?? initialCategoryId ?? '',
    buyingPrice: product?.buyingPrice ?? (isCafe ? '0' : ''),
    sellingPrice: product?.sellingPrice ?? '',
    stock: product?.stock ?? 0,
    minStock: product?.minStock ?? (isCafe ? 0 : 5),
    unit:
      product?.unit ??
      (isPharmacy ? 'tablet' : isCafe ? 'item' : isLiquor ? 'bottle' : 'piece'),
    volume: product?.volume ?? '',
    volumeUnit: product?.volumeUnit ?? 'ml',
    abv: product?.abv ?? '',
    requiresAgeVerification:
      product?.requiresAgeVerification ??
      config?.businessCategory === 'liquor_shop',
    countryOfOrigin: product?.countryOfOrigin ?? '',
    unitsPerPack: product?.unitsPerPack ?? '',
    preferredSupplierId: product?.preferredSupplierId ?? '',
    trackingMode: isPharmacy ? 'lot' : (product?.trackingMode ?? 'none'),
    costingMethod: product?.costingMethod ?? 'weighted_average',
    shelfLifeDays: product?.shelfLifeDays ?? '',
    expiryAlertDays: product?.expiryAlertDays ?? '',
    etimsItemCode: product?.etimsItemCode ?? '',
    etimsUnitCode: product?.etimsUnitCode ?? '',
    etimsTaxCategory: product?.etimsTaxCategory ?? '',
    etimsTaxRate: product?.etimsTaxRate ?? '',
    etimsVatClassification: product?.etimsVatClassification ?? '',
    genericName: pharmacyMetadata?.genericName ?? '',
    internalCode: pharmacyMetadata?.internalCode ?? '',
    manufacturer: pharmacyMetadata?.manufacturer ?? '',
    strength: pharmacyMetadata?.strength ?? '',
    dosageForm: pharmacyMetadata?.dosageForm ?? '',
    packSize: pharmacyMetadata?.packSize ?? '',
    prescriptionRequired: pharmacyMetadata?.prescriptionRequired ?? false,
    restrictedItem: pharmacyMetadata?.restrictedItem ?? false,
    pharmacyNotes: pharmacyMetadata?.notes ?? '',
    cafeCatalogType: 'menu_item' as 'menu_item' | 'ingredient',
  });

  const set = (k: string, v: string | number | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));
  const categoryLabel = (item: {
    id: string;
    name: string;
    parentCategoryId?: string | null;
  }) => {
    const parent = availableCategories.find(
      (candidate) => candidate.id === item.parentCategoryId
    );
    return parent ? `${parent.name} / ${item.name}` : item.name;
  };
  const selectableCategories = availableCategories.filter(
    (item) => item.isActive !== false || item.id === product?.categoryId
  );

  const addCategory = async () => {
    if (!newCategory.name.trim()) return;
    setCreatingCategory(true);
    try {
      const created = await createCategory({
        name: newCategory.name,
        parentCategoryId: newCategory.parentCategoryId || null,
        description: newCategory.description || undefined,
      });
      set('categoryId', created.id);
      setAvailableCategories((current) =>
        [
          ...current,
          {
            id: created.id,
            name: newCategory.name.trim(),
            parentCategoryId: newCategory.parentCategoryId || null,
            isActive: true,
          },
        ].sort((left, right) => left.name.localeCompare(right.name))
      );
      setNewCategory({ name: '', parentCategoryId: '', description: '' });
      setCategoryDialogOpen(false);
      notify.success('Category created');
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : 'Could not create category'
      );
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleImageSelection = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/'))
      return notify.error('Choose an image file');
    if (file.size > 5 * 1024 * 1024)
      return notify.error(
        'Image is too large. Choose an image smaller than 5 MB.'
      );
    setUploadingImage(true);
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas
        .getContext('2d')
        ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) =>
            value
              ? resolve(value)
              : reject(new Error('Could not optimize image')),
          'image/webp',
          0.84
        )
      );
      const body = new FormData();
      body.append(
        'file',
        new File([blob], 'product.webp', { type: 'image/webp' })
      );
      const response = await fetch('/api/products/images', {
        method: 'POST',
        body,
      });
      const responseText = await response.text();
      let result: { url?: string; error?: string } = {};
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        /* A proxy/server error can return HTML or an empty body. */
      }
      if (!response.ok)
        throw new Error(
          result.error || `Image upload failed (${response.status}). Try again.`
        );
      if (!result.url)
        throw new Error('Image upload did not return a file URL. Try again.');
      set('imageUrl', result.url);
      notify.success('Image uploaded successfully.');
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : 'Image upload failed. Try again.'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const steps = [
    terminology.singular,
    'Identification',
    'Pricing',
    'Stock',
    'Review',
  ];
  const continueStep = () => {
    if (step === 1 && (!form.name.trim() || (!product && !form.categoryId))) {
      setErrors((current) => ({
        ...current,
        name: form.name.trim()
          ? undefined
          : `Enter a ${terminology.singularLower} name.`,
        categoryId:
          !product && !form.categoryId ? 'Choose a category.' : undefined,
      }));
      return;
    }
    if (
      step === 3 &&
      ((isCafe
        ? Number(form.buyingPrice) < 0
        : Number(form.buyingPrice) <= 0) ||
        Number(form.sellingPrice) < 0)
    ) {
      setErrors((current) => ({
        ...current,
        buyingPrice: (
          isCafe ? Number(form.buyingPrice) >= 0 : Number(form.buyingPrice) > 0
        )
          ? undefined
          : isCafe
            ? 'Ingredient or item cost cannot be negative.'
            : 'Cost price is required and must be greater than zero.',
        sellingPrice:
          Number(form.sellingPrice) >= 0
            ? undefined
            : 'Enter a valid selling price.',
      }));
      return;
    }
    setStep((current) => Math.min(5, current + 1));
  };

  const checkBarcode = async (value: string) => {
    const requestId = ++barcodeCheckRef.current;
    const normalized = normalizeBarcode(value);
    set('barcode', normalized);
    setBarcodeMatch(null);
    setErrors((current) => ({ ...current, barcode: undefined }));
    if (normalized) {
      const match = await findProductByBarcode(normalized, product?.id);
      if (requestId !== barcodeCheckRef.current) return;
      if (match) {
        setBarcodeMatch(match);
        setErrors((current) => ({
          ...current,
          barcode: `This barcode already belongs to ${match.name}.`,
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = {
      name: form.name.trim()
        ? undefined
        : `Enter a ${terminology.singularLower} name.`,
      categoryId:
        !product && !form.categoryId ? 'Choose a category.' : undefined,
      buyingPrice:
        (isCafe
          ? Number(form.buyingPrice) >= 0
          : Number(form.buyingPrice) > 0) && form.buyingPrice !== ''
          ? undefined
          : isCafe
            ? 'Enter zero for a recipe-costed item, or a non-negative packaged item cost.'
            : 'Cost price is required and must be greater than zero.',
      sellingPrice:
        Number(form.sellingPrice) >= 0 && form.sellingPrice !== ''
          ? undefined
          : 'Enter a selling price.',
      stock:
        !product &&
        !isPharmacy &&
        Number(form.stock) >= 0 &&
        Number.isInteger(Number(form.stock))
          ? undefined
          : !product && !isPharmacy
            ? 'Starting quantity cannot be negative.'
            : undefined,
      barcode: barcodeMatch
        ? `This barcode already belongs to ${barcodeMatch.name}.`
        : undefined,
    };
    if (
      nextErrors.name ||
      nextErrors.categoryId ||
      nextErrors.buyingPrice ||
      nextErrors.sellingPrice ||
      nextErrors.stock ||
      nextErrors.barcode
    ) {
      setErrors(nextErrors);
      return;
    }
    const loss = selling < buying;
    if (
      loss &&
      !window.confirm(
        `The selling price is lower than the cost price. You will lose ${formatCurrency(buying - selling)} per ${form.unit}. Save anyway?`
      )
    )
      return;
    setLoading(true);
    try {
      const data = {
        name: form.name.trim(),
        brand: form.brand || undefined,
        variant: form.variant || undefined,
        sku: form.sku || undefined,
        barcode: form.barcode || undefined,
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
        categoryId: form.categoryId || undefined,
        buyingPrice: parseFloat(String(form.buyingPrice)),
        sellingPrice: parseFloat(String(form.sellingPrice)),
        ...(product ? {} : { stock: isPharmacy ? 0 : Number(form.stock) }),
        minStock: Number(form.minStock),
        unit: form.unit,
        volume: form.volume === '' ? undefined : Number(form.volume),
        volumeUnit: form.volumeUnit || undefined,
        abv: form.abv === '' ? undefined : Number(form.abv),
        requiresAgeVerification: form.requiresAgeVerification,
        countryOfOrigin: form.countryOfOrigin || undefined,
        unitsPerPack:
          form.unitsPerPack === '' ? undefined : Number(form.unitsPerPack),
        preferredSupplierId: form.preferredSupplierId || undefined,
        trackingMode: (isPharmacy ? 'lot' : form.trackingMode) as
          | 'none'
          | 'lot'
          | 'serial',
        costingMethod: form.costingMethod as
          | 'weighted_average'
          | 'fifo'
          | 'standard',
        shelfLifeDays:
          form.shelfLifeDays === '' ? undefined : Number(form.shelfLifeDays),
        expiryAlertDays:
          form.expiryAlertDays === ''
            ? undefined
            : Number(form.expiryAlertDays),
        etimsItemCode: form.etimsItemCode || undefined,
        etimsUnitCode: form.etimsUnitCode || undefined,
        etimsTaxCategory: form.etimsTaxCategory || undefined,
        etimsTaxRate:
          form.etimsTaxRate === '' ? undefined : Number(form.etimsTaxRate),
        etimsVatClassification: form.etimsVatClassification || undefined,
        ...(isPharmacy
          ? {
              pharmacy: {
                genericName: form.genericName || undefined,
                internalCode: form.internalCode || undefined,
                manufacturer: form.manufacturer || undefined,
                strength: form.strength || undefined,
                dosageForm: form.dosageForm || undefined,
                packSize: form.packSize || undefined,
                prescriptionRequired: form.prescriptionRequired,
                restrictedItem: form.restrictedItem,
                notes: form.pharmacyNotes || undefined,
              },
            }
          : {}),
        ...(isCafe ? { cafeCatalogType: form.cafeCatalogType } : {}),
        confirmLoss: loss,
      };
      if (product) {
        await updateProduct(
          product.id,
          data as Parameters<typeof updateProduct>[1]
        );
        notify.success(`${terminology.singular} changes saved.`);
      } else {
        const created = await createProduct(
          data as Parameters<typeof createProduct>[0]
        );
        notify.success(`${terminology.singular} created`);
        if (isCafe) {
          router.push(
            form.cafeCatalogType === 'ingredient'
              ? `/dashboard/inventory?receive=${created.id}`
              : `/dashboard/products/${created.id}`
          );
          router.refresh();
          return;
        }
      }
      closeEditor();
    } catch (err) {
      notify.error(
        err instanceof Error
          ? err.message
          : `Failed to save ${terminology.singularLower}`
      );
    } finally {
      setLoading(false);
    }
  };

  const inputCls = cn(
    'w-full rounded-md border bg-background px-3 py-2 text-sm outline-none',
    'placeholder:text-muted-foreground',
    'focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'
  );

  const buying = Number(form.buyingPrice) || 0;
  const selling = Number(form.sellingPrice) || 0;
  const margin = selling - buying;
  const grossMargin = getGrossMargin(selling, buying);

  const FieldLabel = ({
    children,
    required,
  }: {
    children: React.ReactNode;
    required?: boolean;
  }) => (
    <label className="mb-1.5 block text-sm font-medium text-foreground">
      {children}
      {required && <span className="ml-1 text-destructive">*</span>}
    </label>
  );

  return (
    <div className="product-form mx-auto w-full max-w-5xl">
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-start justify-between border-b px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {product
                  ? `${terminology.singular} setup`
                  : `New ${terminology.singularLower}`}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Manage the {terminology.singularLower} information, pricing and
                stock levels.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeEditor}
            className="ml-4 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="border-b bg-card px-5 py-3 sm:px-6">
            <ol
              className="grid grid-cols-5 gap-2"
              aria-label={`${terminology.singular} setup progress`}
            >
              {steps.map((label, index) => (
                <li
                  key={label}
                  className={cn(
                    'text-center text-xs',
                    step === index + 1
                      ? 'font-semibold text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full border',
                      step === index + 1 &&
                        'border-primary bg-primary text-primary-foreground'
                    )}
                  >
                    {index + 1}
                  </span>
                  {label}
                </li>
              ))}
            </ol>
          </div>
          <div className="space-y-6 p-5 sm:p-6">
            {step === 1 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold">
                      {terminology.singular} information
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Tell your team what this item is and how it is sold.
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4 sm:p-5">
                  <div>
                    <FieldLabel required>
                      {terminology.singular} name
                    </FieldLabel>
                    <input
                      type="text"
                      placeholder={
                        isPharmacy
                          ? 'e.g. Paracetamol 500 mg'
                          : isCafe
                            ? 'e.g. Cappuccino'
                            : isLiquor
                              ? 'e.g. Johnnie Walker Black Label 750ml'
                              : 'e.g. Premium flour 2 kg'
                      }
                      value={form.name}
                      onChange={(e) => {
                        set('name', e.target.value);
                        setErrors((current) => ({
                          ...current,
                          name: undefined,
                        }));
                      }}
                      className={cn(
                        inputCls,
                        errors.name &&
                          'border-destructive focus:border-destructive focus:ring-destructive/20'
                      )}
                    />
                    {errors.name && (
                      <p className="mt-1.5 text-xs text-destructive">
                        {errors.name}
                      </p>
                    )}
                  </div>
                  {isPharmacy && (
                    <div className="mt-4 rounded-lg border bg-background p-4">
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold">
                          Medicine details
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Commercial catalogue information only—no diagnosis or
                          dosage advice.
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <FieldLabel>Generic name</FieldLabel>
                          <input
                            value={form.genericName}
                            onChange={(e) => set('genericName', e.target.value)}
                            placeholder="e.g. Paracetamol + Caffeine"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <FieldLabel>Manufacturer</FieldLabel>
                          <input
                            value={form.manufacturer}
                            onChange={(e) =>
                              set('manufacturer', e.target.value)
                            }
                            placeholder="Manufacturer"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <FieldLabel>Internal medicine code</FieldLabel>
                          <input
                            value={form.internalCode}
                            onChange={(e) =>
                              set('internalCode', e.target.value)
                            }
                            placeholder="e.g. MED-0001"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <FieldLabel>Strength</FieldLabel>
                          <input
                            value={form.strength}
                            onChange={(e) => set('strength', e.target.value)}
                            placeholder="e.g. 500 mg / 65 mg"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <FieldLabel>Dosage form</FieldLabel>
                          <input
                            value={form.dosageForm}
                            onChange={(e) => set('dosageForm', e.target.value)}
                            placeholder="e.g. Tablet"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <FieldLabel>Pack size</FieldLabel>
                          <input
                            value={form.packSize}
                            onChange={(e) => set('packSize', e.target.value)}
                            placeholder="e.g. 20 tablets"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <FieldLabel>Base selling unit</FieldLabel>
                          <select
                            value={form.unit}
                            onChange={(e) => set('unit', e.target.value)}
                            className={inputCls}
                          >
                            {PHARMACY_SELLING_UNITS.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit[0].toUpperCase() + unit.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
                          <input
                            type="checkbox"
                            checked={form.prescriptionRequired}
                            onChange={(e) =>
                              set('prescriptionRequired', e.target.checked)
                            }
                            className="mt-0.5"
                          />
                          <span>
                            <b className="block">Prescription required</b>
                            <span className="text-xs text-muted-foreground">
                              Require a commercial prescription reference during
                              checkout.
                            </span>
                          </span>
                        </label>
                        <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
                          <input
                            type="checkbox"
                            checked={form.restrictedItem}
                            onChange={(e) =>
                              set('restrictedItem', e.target.checked)
                            }
                            className="mt-0.5"
                          />
                          <span>
                            <b className="block">Restricted-item audit</b>
                            <span className="text-xs text-muted-foreground">
                              Record additional approval and traceability
                              details.
                            </span>
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                  {isCafe && !product && (
                    <div className="mt-4 rounded-lg border border-[#f9b21d]/40 bg-[#fff8e6] p-3 text-sm text-[#694d00] dark:bg-[#2a2111] dark:text-[#ffd166]">
                      <b className="block">Café-ready setup</b>
                      <span className="mt-1 block text-xs leading-5">
                        Save the basics first. The next screen lets you add
                        optional sizes, modifiers, recipe ingredients and
                        preparation routing. A simple menu item can be sold
                        immediately.
                      </span>
                    </div>
                  )}
                  {isCafe && !product && (
                    <fieldset className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
                      <legend className="px-1 text-sm font-semibold">
                        What are you adding?
                      </legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label
                          className={cn(
                            'cursor-pointer rounded-md border p-3 text-sm transition-colors',
                            form.cafeCatalogType === 'menu_item' &&
                              'border-primary bg-primary/5'
                          )}
                        >
                          <input
                            type="radio"
                            name="cafe-catalog-type"
                            className="sr-only"
                            checked={form.cafeCatalogType === 'menu_item'}
                            onChange={() => set('cafeCatalogType', 'menu_item')}
                          />
                          <b className="block">Menu item</b>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            Shown at Counter POS. Add sizes, modifiers, recipes
                            and preparation after saving.
                          </span>
                        </label>
                        <label
                          className={cn(
                            'cursor-pointer rounded-md border p-3 text-sm transition-colors',
                            form.cafeCatalogType === 'ingredient' &&
                              'border-primary bg-primary/5'
                          )}
                        >
                          <input
                            type="radio"
                            name="cafe-catalog-type"
                            className="sr-only"
                            checked={form.cafeCatalogType === 'ingredient'}
                            onChange={() =>
                              set('cafeCatalogType', 'ingredient')
                            }
                          />
                          <b className="block">Ingredient or supply</b>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            Tracked in Ingredients and available for recipes,
                            but never sold directly at POS.
                          </span>
                        </label>
                      </div>
                    </fieldset>
                  )}
                  {
                    <div
                      className={cn(
                        'mt-4 grid gap-4',
                        isCafe ? 'sm:grid-cols-1' : 'sm:grid-cols-3'
                      )}
                    >
                      {!isCafe && !isPharmacy && (
                        <div>
                          <FieldLabel>Brand</FieldLabel>
                          <input
                            value={form.brand}
                            onChange={(e) => set('brand', e.target.value)}
                            placeholder={
                              isCafe
                                ? 'Optional, e.g. House made'
                                : isLiquor
                                  ? 'e.g. Johnnie Walker'
                                  : 'Optional brand'
                            }
                            className={inputCls}
                          />
                        </div>
                      )}
                      {!isCafe && !isPharmacy && (
                        <div>
                          <FieldLabel>Variant</FieldLabel>
                          <input
                            value={form.variant}
                            onChange={(e) => set('variant', e.target.value)}
                            placeholder={
                              isCafe
                                ? 'Optional, e.g. Iced'
                                : isLiquor
                                  ? 'e.g. Black Label'
                                  : 'Optional variant'
                            }
                            className={inputCls}
                          />
                        </div>
                      )}
                      <div>
                        <FieldLabel>Category</FieldLabel>
                        <div className="flex gap-2">
                          <input
                            list="product-category-options"
                            value={categoryLabel(
                              availableCategories.find(
                                (item) => item.id === form.categoryId
                              ) ?? { id: '', name: '' }
                            )}
                            onChange={(event) => {
                              const selected = selectableCategories.find(
                                (item) =>
                                  categoryLabel(item) === event.target.value
                              );
                              if (selected) {
                                set('categoryId', selected.id);
                                setErrors((current) => ({
                                  ...current,
                                  categoryId: undefined,
                                }));
                              }
                            }}
                            placeholder="Search categories…"
                            aria-invalid={Boolean(errors.categoryId)}
                            className={cn(
                              inputCls,
                              errors.categoryId && 'border-destructive'
                            )}
                          />
                          <datalist id="product-category-options">
                            {selectableCategories.map((item) => (
                              <option
                                key={item.id}
                                value={categoryLabel(item)}
                              />
                            ))}
                          </datalist>
                          <button
                            type="button"
                            onClick={() => setCategoryDialogOpen(true)}
                            className="shrink-0 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-secondary"
                          >
                            + Add
                          </button>
                        </div>
                        {errors.categoryId && (
                          <p className="mt-1 text-xs text-destructive">
                            {errors.categoryId}
                          </p>
                        )}
                      </div>
                    </div>
                  }
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    {isLiquor && (
                      <div>
                        <FieldLabel>Bottle or package size</FieldLabel>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.volume}
                          onChange={(e) => set('volume', e.target.value)}
                          placeholder="750"
                          className={inputCls}
                        />
                      </div>
                    )}
                    {isLiquor && (
                      <div>
                        <FieldLabel>Volume unit</FieldLabel>
                        <select
                          value={form.volumeUnit}
                          onChange={(e) => set('volumeUnit', e.target.value)}
                          className={inputCls}
                        >
                          {VOLUME_UNITS.map((unit) => (
                            <option key={unit}>{unit}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {!isPharmacy && (
                      <div>
                        <FieldLabel>
                          How this {terminology.singularLower} is sold
                        </FieldLabel>
                        <select
                          value={form.unit}
                          onChange={(e) => set('unit', e.target.value)}
                          className={inputCls}
                        >
                          {(isCafe ? CAFE_SELLING_UNITS : SELLING_UNITS).map(
                            (unit) => (
                              <option key={unit} value={unit}>
                                {unit[0].toUpperCase() + unit.slice(1)}
                              </option>
                            )
                          )}
                          {product &&
                            !(
                              isCafe ? CAFE_SELLING_UNITS : SELLING_UNITS
                            ).includes(form.unit) && (
                              <option value={form.unit}>{form.unit}</option>
                            )}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <FieldLabel>{terminology.singular} code (SKU)</FieldLabel>
                      <p className="mb-1 text-xs text-muted-foreground">
                        A unique code used by your shop to identify this
                        {terminology.singularLower}. Leave it blank and the
                        system will create one.
                      </p>
                      <input
                        id="product-sku"
                        type="text"
                        placeholder={
                          isPharmacy
                            ? 'e.g. MED-0001'
                            : isCafe
                              ? 'e.g. CAP-LATTE'
                              : isLiquor
                                ? 'e.g. JWB-750'
                                : 'e.g. ITEM-001'
                        }
                        value={form.sku}
                        onChange={(e) => set('sku', e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <FieldLabel>Barcode number</FieldLabel>
                      <p className="mb-1 text-xs text-muted-foreground">
                        {isCafe
                          ? 'For packaged retail items, scan the pack barcode or type the number'
                          : `Scan the barcode on the ${isPharmacy ? 'medicine pack' : isLiquor ? 'bottle' : 'product'} or type the number`}
                        printed below it.
                      </p>
                      <div className="flex gap-2">
                        <input
                          id="product-barcode"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="Scan or enter barcode"
                          value={form.barcode}
                          onChange={(e) => void checkBarcode(e.target.value)}
                          onPaste={(e) => {
                            e.preventDefault();
                            void checkBarcode(e.clipboardData.getData('text'));
                          }}
                          aria-invalid={Boolean(errors.barcode)}
                          className={cn(
                            inputCls,
                            errors.barcode && 'border-destructive'
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPhoneScanner(true)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border bg-background px-3 py-2 text-sm font-semibold hover:border-[#f9b21d] hover:bg-[#fff8e6] dark:hover:bg-[#2a2111]"
                        >
                          <Smartphone className="h-4 w-4" /> Pair phone
                        </button>
                      </div>
                      <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Barcode className="h-3.5 w-3.5" /> USB scanner ready.
                        You can also pair your phone or enter the printed
                        number.
                      </p>
                      {errors.barcode && (
                        <p
                          role="alert"
                          className="mt-1 text-xs text-destructive"
                        >
                          {errors.barcode}
                        </p>
                      )}
                      {barcodeMatch && (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/dashboard/products/${barcodeMatch.id}`
                            )
                          }
                          className="mt-1 text-xs font-medium text-primary hover:underline"
                        >
                          View existing {terminology.singularLower}
                        </button>
                      )}
                    </div>
                  </div>
                  {isLiquor && (
                    <details className="mt-4 rounded-md border bg-background px-3 py-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        More {terminology.singularLower} details
                      </summary>
                      <div className="mt-3 grid gap-4 sm:grid-cols-3">
                        <div>
                          <FieldLabel>Alcohol percentage (ABV)</FieldLabel>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={form.abv}
                            onChange={(e) => set('abv', e.target.value)}
                            placeholder="40"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <FieldLabel>Country of origin</FieldLabel>
                          <input
                            value={form.countryOfOrigin}
                            onChange={(e) =>
                              set('countryOfOrigin', e.target.value)
                            }
                            placeholder="e.g. Scotland"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <FieldLabel>Units per pack/carton</FieldLabel>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={form.unitsPerPack}
                            onChange={(e) =>
                              set('unitsPerPack', e.target.value)
                            }
                            placeholder="1"
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </details>
                  )}
                  {isLiquor && (
                    <label className="mt-4 flex items-start gap-3 rounded-lg border bg-background p-3">
                      <input
                        type="checkbox"
                        checked={form.requiresAgeVerification}
                        onChange={(event) =>
                          set('requiresAgeVerification', event.target.checked)
                        }
                        className="mt-0.5 h-4 w-4"
                      />
                      <span>
                        <span className="block text-sm font-semibold">
                          Age restricted
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Requires age verification before checkout.
                        </span>
                      </span>
                    </label>
                  )}
                  <div className="mt-4">
                    <FieldLabel>Description</FieldLabel>
                    <textarea
                      rows={2}
                      placeholder={`Optional ${terminology.singularLower} description`}
                      value={form.description}
                      onChange={(e) => set('description', e.target.value)}
                      className={cn(inputCls, 'resize-y')}
                    />
                  </div>
                  <div className="mt-4">
                    <FieldLabel>{terminology.singular} image</FieldLabel>
                    <div className="flex gap-3">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40 text-muted-foreground">
                        {form.imageUrl ? (
                          <Image
                            src={form.imageUrl}
                            alt={`${terminology.singular} preview`}
                            width={80}
                            height={80}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(e) =>
                            void handleImageSelection(e.target.files?.[0])
                          }
                          className="sr-only"
                        />
                        <button
                          type="button"
                          disabled={uploadingImage}
                          onClick={() => imageInputRef.current?.click()}
                          className="inline-flex w-fit items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-60"
                        >
                          <Upload className="h-4 w-4" />
                          {uploadingImage
                            ? 'Uploading…'
                            : 'Upload from computer'}
                        </button>
                        <input
                          type="url"
                          placeholder="Or paste an image URL"
                          value={
                            form.imageUrl.startsWith('data:')
                              ? ''
                              : form.imageUrl
                          }
                          onChange={(e) => set('imageUrl', e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Upload a JPG, PNG or WebP image up to 5 MB. Large images
                      will be optimized automatically.
                    </p>
                  </div>
                  <div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <FieldLabel>Traceability</FieldLabel>
                      <select
                        value={form.trackingMode}
                        disabled={isPharmacy}
                        onChange={(event) =>
                          set('trackingMode', event.target.value)
                        }
                        className={inputCls}
                      >
                        <option value="none">Quantity only</option>
                        <option value="lot">Batch / lot and expiry</option>
                        <option value="serial">Unique serial numbers</option>
                      </select>
                      {isPharmacy && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Medicine stock is always batch and expiry tracked.
                        </p>
                      )}
                    </div>
                    <div>
                      <FieldLabel>Costing method</FieldLabel>
                      <select
                        value={form.costingMethod}
                        onChange={(event) =>
                          set('costingMethod', event.target.value)
                        }
                        className={inputCls}
                      >
                        <option value="weighted_average">
                          Weighted average
                        </option>
                        <option value="fifo">FIFO</option>
                        <option value="standard">Standard cost</option>
                      </select>
                    </div>
                    {form.trackingMode === 'lot' && (
                      <>
                        <div>
                          <FieldLabel>Shelf life (days)</FieldLabel>
                          <input
                            type="number"
                            min="1"
                            value={form.shelfLifeDays}
                            onChange={(event) =>
                              set('shelfLifeDays', event.target.value)
                            }
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <FieldLabel>Expiry warning (days)</FieldLabel>
                          <input
                            type="number"
                            min="0"
                            value={form.expiryAlertDays}
                            onChange={(event) =>
                              set('expiryAlertDays', event.target.value)
                            }
                            className={inputCls}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {categoryDialogOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-card p-5 text-card-foreground shadow-xl">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold">Create category</h3>
                        <button
                          type="button"
                          onClick={() => setCategoryDialogOpen(false)}
                          className="text-muted-foreground"
                        >
                          ×
                        </button>
                      </div>
                      <label className="mt-4 block text-sm font-medium">
                        Category name
                        <input
                          autoFocus
                          value={newCategory.name}
                          onChange={(event) =>
                            setNewCategory((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          className={`mt-1 ${inputCls}`}
                        />
                      </label>
                      <label className="mt-4 block text-sm font-medium">
                        Parent category{' '}
                        <span className="font-normal text-muted-foreground">
                          (optional)
                        </span>
                        <select
                          value={newCategory.parentCategoryId}
                          onChange={(event) =>
                            setNewCategory((current) => ({
                              ...current,
                              parentCategoryId: event.target.value,
                            }))
                          }
                          className={`mt-1 ${inputCls}`}
                        >
                          <option value="">No parent</option>
                          {selectableCategories.map((item) => (
                            <option key={item.id} value={item.id}>
                              {categoryLabel(item)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="mt-4 block text-sm font-medium">
                        Description{' '}
                        <span className="font-normal text-muted-foreground">
                          (optional)
                        </span>
                        <textarea
                          value={newCategory.description}
                          onChange={(event) =>
                            setNewCategory((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          className={`mt-1 ${inputCls}`}
                        />
                      </label>
                      <div className="mt-5 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setCategoryDialogOpen(false)}
                          className="rounded-md border px-3 py-2 text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={addCategory}
                          disabled={
                            creatingCategory || !newCategory.name.trim()
                          }
                          className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                        >
                          {creatingCategory ? 'Creating…' : 'Create category'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {step === 2 && (
              <section className="rounded-lg border bg-muted/20 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Barcode className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">
                    Identification and image
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your {terminology.singularLower} code is generated
                  automatically when you save if it is blank.
                </p>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {terminology.singular} code
                    </dt>
                    <dd className="mt-1 font-medium">
                      {form.sku || 'Generated automatically on save'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Barcode number
                    </dt>
                    <dd className="mt-1">
                      {form.barcode || 'No barcode provided'}
                    </dd>
                  </div>
                </dl>
                <p className="mt-5 text-xs text-muted-foreground">
                  Use Back to edit these details.
                </p>
              </section>
            )}

            {step === 3 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Pricing</h3>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4 sm:p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel required={!isCafe}>
                        {isCafe ? 'Direct item cost' : 'Cost price'}
                      </FieldLabel>
                      <p className="mb-1 text-xs text-muted-foreground">
                        {isPharmacy
                          ? 'Required for accurate profit reporting. Enter the cost per selling unit.'
                          : isCafe
                            ? 'Use zero for a prepared item whose cost will come from its ingredient recipe, or enter the packaged item cost.'
                            : isLiquor
                              ? 'Required for accurate profit reporting. How much you paid for one bottle or unit.'
                              : 'Required for accurate profit reporting. Enter the cost per selling unit.'}
                      </p>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="e.g. 850.00"
                        value={form.buyingPrice}
                        onChange={(e) => set('buyingPrice', e.target.value)}
                        className={cn(
                          inputCls,
                          errors.buyingPrice &&
                            'border-destructive focus:border-destructive focus:ring-destructive/20'
                        )}
                      />
                      {errors.buyingPrice && (
                        <p className="mt-1.5 text-xs text-destructive">
                          {errors.buyingPrice}
                        </p>
                      )}
                    </div>
                    <div>
                      <FieldLabel required>Selling price</FieldLabel>
                      <p className="mb-1 text-xs text-muted-foreground">
                        {isPharmacy
                          ? 'How much the customer will pay for one selling unit.'
                          : isCafe
                            ? 'The base menu price. Size and modifier adjustments can be configured after saving.'
                            : isLiquor
                              ? 'How much the customer will pay for one bottle or unit.'
                              : 'How much the customer will pay for one selling unit.'}
                      </p>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={form.sellingPrice}
                        onChange={(e) => {
                          set('sellingPrice', e.target.value);
                          setErrors((current) => ({
                            ...current,
                            sellingPrice: undefined,
                          }));
                        }}
                        className={cn(
                          inputCls,
                          errors.sellingPrice &&
                            'border-destructive focus:border-destructive focus:ring-destructive/20'
                        )}
                      />
                      {errors.sellingPrice && (
                        <p className="mt-1.5 text-xs text-destructive">
                          {errors.sellingPrice}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-5 border-t pt-5">
                    <div>
                      <h4 className="text-sm font-semibold">
                        eTIMS tax mapping
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Use only the item, unit and tax codes supplied by your
                        certified eTIMS provider or KRA specification.
                      </p>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <FieldLabel>Item code</FieldLabel>
                        <input
                          value={form.etimsItemCode}
                          onChange={(e) => set('etimsItemCode', e.target.value)}
                          placeholder="Provider/KRA item code"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <FieldLabel>Unit code</FieldLabel>
                        <input
                          value={form.etimsUnitCode}
                          onChange={(e) => set('etimsUnitCode', e.target.value)}
                          placeholder="Official unit code"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <FieldLabel>Tax category</FieldLabel>
                        <input
                          value={form.etimsTaxCategory}
                          onChange={(e) =>
                            set('etimsTaxCategory', e.target.value)
                          }
                          placeholder="Official tax category"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <FieldLabel>Tax rate (%)</FieldLabel>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={form.etimsTaxRate}
                          onChange={(e) => set('etimsTaxRate', e.target.value)}
                          placeholder="e.g. 16"
                          className={inputCls}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <FieldLabel>VAT classification</FieldLabel>
                        <input
                          value={form.etimsVatClassification}
                          onChange={(e) =>
                            set('etimsVatClassification', e.target.value)
                          }
                          placeholder="Official classification, if required"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'mt-4 rounded-md border px-3 py-2.5 text-sm',
                      margin >= 0
                        ? 'border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.06)]'
                        : 'border-destructive/25 bg-destructive/5'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Estimated profit
                      </span>
                      <span
                        className={cn(
                          'font-semibold tabular-nums',
                          margin >= 0
                            ? 'text-[hsl(var(--success))]'
                            : 'text-destructive'
                        )}
                      >
                        {formatCurrency(margin)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs">
                      {margin >= 0
                        ? `Profit per ${form.unit}: ${formatCurrency(margin)} · Profit %: ${grossMargin.valid ? `${grossMargin.percent.toFixed(1)}%` : 'check cost price'}`
                        : `You will lose ${formatCurrency(Math.abs(margin))} each time this ${terminology.singularLower} is sold.`}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {step === 4 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold">Stock information</h3>
                    <p className="text-xs text-muted-foreground">
                      Track quantities in the way your shop sells them.
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4 sm:p-5">
                  <p className="mb-4 text-xs text-muted-foreground">
                    {isPharmacy
                      ? 'Set the reorder level. Opening medicine stock is received separately with its batch and expiry.'
                      : isCafe
                        ? 'Prepared items can start at zero and consume recipe ingredients. Enter stock only for ready-made or packaged items.'
                        : `Set the opening quantity and the level at which this ${terminology.singularLower} should be flagged for reorder.`}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <FieldLabel>
                        {product ? 'Current stock' : 'Starting quantity'}
                      </FieldLabel>
                      <input
                        type="number"
                        min="0"
                        value={form.stock}
                        onChange={(e) => set('stock', e.target.value)}
                        readOnly={Boolean(product) || isPharmacy}
                        className={cn(
                          inputCls,
                          (product || isPharmacy) && 'bg-muted'
                        )}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {isPharmacy
                          ? 'Use Purchasing or Receive stock to record a batch number and expiry date.'
                          : product
                            ? 'Use Adjust stock to record a stock movement.'
                            : isCafe
                              ? 'Use zero for prepared items. Enter a count only for packaged or ready-made items.'
                              : isLiquor
                                ? 'How many bottles, cans, cartons or units you currently have.'
                                : 'How many selling units you currently have.'}
                      </p>
                      {product && (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/dashboard/inventory?productId=${product.id}`
                            )
                          }
                          className="mt-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-secondary"
                        >
                          Adjust stock
                        </button>
                      )}
                    </div>
                    <div>
                      <FieldLabel>Low-stock alert level</FieldLabel>
                      <input
                        type="number"
                        min="0"
                        value={form.minStock}
                        onChange={(e) => set('minStock', e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <FieldLabel>Stock preview</FieldLabel>
                      <p
                        className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
                        aria-readonly="true"
                      >
                        {form.stock} {form.unit === 'pcs' ? 'piece' : form.unit}
                        {Number(form.stock) === 1 ? '' : 's'} available
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {step === 5 && (
              <section className="rounded-lg border bg-muted/20 p-5">
                <h3 className="text-base font-semibold">
                  Review {terminology.singularLower}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Check the details before saving.
                </p>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">
                      {terminology.singular}
                    </dt>
                    <dd className="font-semibold">
                      {form.name || 'Not provided'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Category</dt>
                    <dd>
                      {categoryLabel(
                        availableCategories.find(
                          (item) => item.id === form.categoryId
                        ) ?? { id: '', name: '' }
                      ) || 'Not provided'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {terminology.singular} code
                    </dt>
                    <dd>{form.sku || 'Generated on save'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Selling unit</dt>
                    <dd className="capitalize">{form.unit}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Selling price</dt>
                    <dd>
                      {form.sellingPrice
                        ? formatCurrency(form.sellingPrice)
                        : 'Not provided'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Starting stock</dt>
                    <dd>
                      {product
                        ? `${product.stock} ${product.unit}`
                        : `${form.stock} ${form.unit}`}
                    </dd>
                  </div>
                </dl>
                {selling < buying && (
                  <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    Warning: this {terminology.singularLower} will be sold below
                    cost.
                  </p>
                )}
              </section>
            )}
          </div>

          <div className="flex items-center justify-between border-t bg-muted/20 px-5 py-4 sm:px-6">
            <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <Check className="h-3.5 w-3.5 text-muted-foreground" />
              Unsaved changes
            </p>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((current) => current - 1)}
                  className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
                >
                  Back
                </button>
              )}
              {step < 5 && (
                <button
                  type="button"
                  onClick={continueStep}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Continue
                </button>
              )}
              {step === 5 && (
                <button
                  type="submit"
                  disabled={loading || uploadingImage}
                  className={cn(
                    'flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
                    'hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60'
                  )}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {product
                    ? 'Save changes'
                    : `Save ${terminology.singularLower}`}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
      <WirelessScannerPairing
        open={showPhoneScanner}
        onClose={() => setShowPhoneScanner(false)}
        onBarcode={(barcode) => {
          setShowPhoneScanner(false);
          void checkBarcode(barcode);
        }}
      />
    </div>
  );
}
