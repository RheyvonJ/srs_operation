'use client';

import { useEffect, useState } from 'react';
import { SupplierApVoucherView } from '@/components/purchasing/SupplierApVoucherView';
import { SupplierDebitMemoView } from '@/components/purchasing/SupplierDebitMemoView';
import { SupplierPaymentView } from '@/components/purchasing/SupplierPaymentView';
import type { SupplierTransactionViewData } from '@/components/purchasing/supplierTransactionTypes';

export default function ViewSupplierTransactionPage() {
  const [transaction, setTransaction] = useState<SupplierTransactionViewData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
    let cancelled = false;
    fetch(`${apiBaseUrl}/supplier-cv/transaction-view?${params.toString()}`)
      .then(async (response) => {
        const body = await response.json().catch(() => null) as (SupplierTransactionViewData & { message?: string }) | null;
        if (!response.ok || !body || typeof body.transactionType !== 'string') {
          throw new Error(body?.message || 'Could not load the supplier transaction. Please check the server connection.');
        }
        return body;
      })
      .then((body) => { if (!cancelled) setTransaction(body); })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not load the supplier transaction.');
      });
    return () => { cancelled = true; };
  }, []);

  if (error) return <p role="alert" style={{ margin: 24, color: '#D32F2F' }}>{error}</p>;
  if (!transaction) return <p style={{ margin: 24 }}>Loading supplier transaction...</p>;
  if (transaction.viewKind === 'payment') return <SupplierPaymentView payment={transaction} />;
  if (transaction.viewKind === 'general-ledger') return <SupplierDebitMemoView memo={transaction} />;
  return <SupplierApVoucherView voucher={transaction} />;
}
