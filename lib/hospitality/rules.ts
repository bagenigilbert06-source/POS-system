export function isCafeBusiness(
  businessType?: string | null,
  businessCategory?: string | null
): boolean {
  const family = (businessType ?? '').trim().toLowerCase();
  const category = (businessCategory ?? '').trim().toLowerCase();

  return (
    category === 'cafe' &&
    (family === 'food_hospitality' || family === 'restaurant' || !family)
  );
}

export function isHospitalityBusiness(
  businessType?: string | null,
  businessCategory?: string | null
): boolean {
  const family = (businessType ?? '').trim().toLowerCase();
  return (
    family === 'food_hospitality' ||
    family === 'restaurant' ||
    isCafeBusiness(family, businessCategory)
  );
}
