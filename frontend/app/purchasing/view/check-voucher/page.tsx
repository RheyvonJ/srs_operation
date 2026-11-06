'use client';

import { useEffect } from 'react';

export default function CheckVoucherPdfRedirect() {
  useEffect(() => {
    const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '');
    window.location.replace(`${apiBase}/checkprint/voucher.pdf${window.location.search}`);
  }, []);

  return <p className="m-6">Opening Check Voucher PDF...</p>;
}
