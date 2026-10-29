export interface Bir2307Target {
  branch: number;
  type: 20 | 24;
  transNo: number;
  supplierId: number;
}

const BIR_2307_BASE = (
  process.env.NEXT_PUBLIC_BIR_2307_BASE_URL ?? ' http://127.0.0.1:3000/purchasing/view/bir-2307'
).replace(/\/$/, '');

const FRONTEND_BASE = (process.env.NEXT_PUBLIC_FRONTEND_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

export function bir2307PrintPath(target: Bir2307Target): string {
  const params = new URLSearchParams({
    branch: String(target.branch),
    type: String(target.type),
    trans_no: String(target.transNo),
    supplier_id: String(target.supplierId),
  });
  return `${FRONTEND_BASE}/purchasing/view/bir-2307?${params.toString()}`;
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
    name: target.database,
  });
  return `${BIR_2307_BASE}/purchasing/view/view_rs_slip.php?${params.toString()}`;
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
  return `${BIR_2307_BASE}/signatures/${encodeURIComponent(file)}`;
}

export interface ConsignmentPrintTarget {
  database: string;
  consignmentId: number;
}

export function consignmentPrintPath(target: ConsignmentPrintTarget): string {
  const params = new URLSearchParams({
    branch: target.database,
    cons_id: String(target.consignmentId),
  });
  return `${BIR_2307_BASE}/modules/checkprint/consignment_print_aria.php?${params.toString()}`;
}

export function cvViewPath(branch: number, cvId: number): string {
  const params = new URLSearchParams({
    trans_no: String(cvId),
    branch: String(branch),
  });
  return `/purchasing/view/view-cv?${params.toString()}`;
}
