import { useEffect, useRef } from 'react';
import {
  downloadBarcodePng,
  downloadBarcodeSvg,
  employeeFullName,
  printBarcodeCard,
  renderBarcode,
} from '../lib/barcodeUtils';
import './EmployeeBarcodeModal.css';

export default function EmployeeBarcodeModal({ employee, onClose }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!employee) return;
    renderBarcode(svgRef.current, employee.emp_id);
  }, [employee]);

  useEffect(() => {
    if (!employee) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [employee, onClose]);

  if (!employee) return null;

  const safeId = employee.emp_id.replace(/[^\w.-]+/g, '_');
  const fullName = employeeFullName(employee);

  function handleDownloadPng() {
    downloadBarcodePng(svgRef.current, `barcode_${safeId}.png`);
  }

  function handleDownloadSvg() {
    downloadBarcodeSvg(svgRef.current, `barcode_${safeId}.svg`);
  }

  function handlePrint() {
    printBarcodeCard(employee, svgRef.current);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="barcode-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="barcode-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <h2 className="barcode-modal-title">Employee Barcode</h2>
        <p className="barcode-modal-name">{fullName}</p>
        {employee.position && (
          <p className="barcode-modal-position">{employee.position}</p>
        )}

        <div className="barcode-modal-preview">
          <svg ref={svgRef} />
        </div>

        <p className="barcode-modal-id">{employee.emp_id}</p>
        <p className="barcode-modal-hint">Scanned by the LOGYX DTR scanner as Employee #</p>

        <div className="barcode-modal-actions">
          <button type="button" className="btn" onClick={handleDownloadPng}>
            DOWNLOAD PNG
          </button>
          <button type="button" className="btn" onClick={handleDownloadSvg}>
            DOWNLOAD SVG
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePrint}>
            PRINT BARCODE
          </button>
        </div>
      </div>
    </div>
  );
}
