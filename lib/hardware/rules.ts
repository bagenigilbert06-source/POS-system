/** Hardware is a retail workspace with counter sales and unit-based stock. */
export function isHardwareBusiness(
  businessType?: string | null,
  businessCategory?: string | null
): boolean {
  const family = (businessType ?? '').trim().toLowerCase();
  const category = (businessCategory ?? '').trim().toLowerCase();

  return (
    (category === 'hardware' || category === 'hardware_store') &&
    (family === 'retail' || !family)
  );
}
