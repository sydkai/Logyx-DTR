import JsBarcode from 'jsbarcode';

export const BARCODE_OPTIONS = {
  format: 'CODE128',
  width: 2,
  height: 64,
  displayValue: true,
  font: 'DM Mono',
  fontSize: 14,
  margin: 12,
  background: '#ffffff',
  lineColor: '#000000',
};

export function employeeFullName(emp) {
  return [emp.first_name, emp.middle_name, emp.surname].filter(Boolean).join(' ');
}

export function renderBarcode(svgEl, empId) {
  if (!svgEl || !empId) return false;
  svgEl.innerHTML = '';
  try {
    JsBarcode(svgEl, empId, BARCODE_OPTIONS);
    return true;
  } catch {
    return false;
  }
}

export function downloadBarcodeSvg(svgEl, filename) {
  if (!svgEl) return;
  const blob = new Blob(
    [`<?xml version="1.0" encoding="UTF-8"?>\n${svgEl.outerHTML}`],
    { type: 'image/svg+xml' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadBarcodePng(svgEl, filename) {
  if (!svgEl) return;

  const svgData = new XMLSerializer().serializeToString(svgEl);
  const url = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }));
  const img = new Image();

  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
    URL.revokeObjectURL(url);
  };

  img.src = url;
}

export function printBarcodeCard(employee, svgEl) {
  const win = window.open('', '_blank');
  if (!win) return;

  const name = employeeFullName(employee);
  const position = employee.position || employee.title_initials || '';
  const svgHtml = svgEl ? svgEl.outerHTML : '';

  win.document.write(`<!DOCTYPE html>
<html><head><title>Barcode — ${employee.emp_id}</title>
<style>
  body { font-family: Arial, sans-serif; text-align: center; padding: 24px; }
  h1 { font-size: 14px; margin: 0 0 4px; text-transform: uppercase; }
  p { font-size: 11px; color: #555; margin: 0 0 16px; text-transform: uppercase; }
  .id { font-size: 12px; font-weight: bold; letter-spacing: 0.06em; margin-top: 10px; }
  svg { max-width: 100%; }
</style></head><body>
  <h1>${name}</h1>
  ${position ? `<p>${position}</p>` : ''}
  ${svgHtml}
  <div class="id">${employee.emp_id}</div>
</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}
