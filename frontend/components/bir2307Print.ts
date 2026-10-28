export interface Bir2307Target {
  branch: number;
  type: 20 | 24;
  transNo: number;
  supplierId: number;
}

const BIR_2307_BASE = (
  process.env.NEXT_PUBLIC_BIR_2307_BASE_URL ?? 'http://192.168.0.89:8002/SUPPLIER_DM_ONLINE'
).replace(/\/$/, '');

export function bir2307PrintPath(target: Bir2307Target): string {
  const params = new URLSearchParams({
    branch: String(target.branch),
    type: String(target.type),
    trans_no: String(target.transNo),
    supplier_id: String(target.supplierId),
  });
  return `${BIR_2307_BASE}/gl/2307_pdf_per_trans.php?${params.toString()}`;
}
