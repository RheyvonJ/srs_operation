export interface Bir2307Target {
  branch: number;
  type: 20 | 24;
  transNo: number;
  supplierId: number;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '');

export function bir2307PrintPath(target: Bir2307Target): string {
  const params = new URLSearchParams({
    branch: String(target.branch),
    type: String(target.type),
    trans_no: String(target.transNo),
    supplier_id: String(target.supplierId),
  });
  return `${API_BASE}/supplier-cv/bir2307.pdf?${params.toString()}`;
}

export function checkVoucherPath(branch: number | null, cvId: number | null): string {
  if (branch === null || cvId === null || !Number.isInteger(cvId) || cvId <= 0) return '#';
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '');
  return `${apiBase}/checkprint/voucher.pdf?${new URLSearchParams({ branch: String(branch), cv_id: String(cvId) }).toString()}`;
}

export interface RsSlipTarget {
  rsId: string;
  branch: number;
  database: string;
}

export function rsSlipPath(target: RsSlipTarget): string {
  const params = new URLSearchParams({
    rs_id: target.rsId,
    branch: String(target.branch),
  });
  return `/purchasing/view/converted/rs-slip?${params.toString()}`;
}

export function rsViewPath(target: RsSlipTarget): string {
  const params = new URLSearchParams({ rs_id: target.rsId, branch: String(target.branch) });
  return `/purchasing/view/converted/rs?${params.toString()}`;
}

export interface PurchaseOrderPrintTarget {
  branch: string;
  orderNo: string;
  reference: string;
  supplierId: string;
}

export function purchaseOrderPrintPath(target: PurchaseOrderPrintTarget): string {
  const params = new URLSearchParams({
    branch: target.branch,
    order_no: target.orderNo,
    ref: target.reference,
    supplier_id: target.supplierId,
  });
  return `/purchasing/view/purchase-order?${params.toString()}`;
}

export function purchaseOrderSignaturePath(file: string): string {
  return `/signatures/${encodeURIComponent(file)}`;
}

export function cvViewPath(branch: number, cvId: number): string {
  const params = new URLSearchParams({
    trans_no: String(cvId),
    branch: String(branch),
  });
  return `/purchasing/view/view-cv?${params.toString()}`;
}

export function apvViewPath(branch: number, transNo: number, type = 20): string {
  const params = new URLSearchParams({ trans_no: String(transNo), branch: String(branch), type: String(type) });
  return `/purchasing/view/view-apv?${params.toString()}`;
}
