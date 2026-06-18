/** Client-side scan normalization (mirrors server/lib/scanId.js). */
export function normalizeScanId(raw) {
  const s = String(raw || '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/^[*%]+|[*%]+$/g, '')
    .trim();
  const canonical = s.replace(/[^A-Za-z0-9/-]/g, '').trim();
  return (canonical || s).toUpperCase();
}

export function extractEmployeeId(raw) {
  const norm = normalizeScanId(raw);
  const standard = norm.match(/[A-Z]{2,5}-[A-Z]{2,5}-\d{2}-\d{2}-\d{2}/);
  if (standard) return standard[0];
  const slashDate = norm.match(/[A-Z]{2,5}-[A-Z]{2,5}-\/\d{2}\/\d{4}/);
  if (slashDate) return slashDate[0];
  return norm;
}
