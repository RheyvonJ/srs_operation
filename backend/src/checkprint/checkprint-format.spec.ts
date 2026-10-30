import { describe, expect, it } from 'vitest';
import { cvExportRows, mbCcws } from './checkprint-format.js';
import { checkprintEnglishWords } from './checkprint.types.js';

describe('checkprint PHP format conversions', () => {
  it('converts integer amounts using the default en_US wording used by Numbers_Words', () => {
    expect(checkprintEnglishWords(3004)).toBe('three thousand four');
    expect(checkprintEnglishWords(0)).toBe('zero');
  });

  it('keeps the check voucher export fields fixed-width and places the invoice details', () => {
    const [check, voucher] = cvExportRows({
      personId: 123, payTo: 'Payee', checkNumber: '001', checkDate: '2020-02-27', checkAmount: 30.04,
      cvNo: '127110', cvDate: '2020-02-27', ewt: 0,
      invoiceLines: [{ cvNo: '127110', transType: 'APV', reference: '3558128', supplierReference: 'SI-1', date: '2020-02-27', amount: 30.04, amountPaid: 0 }],
    }, 'metrobank');
    expect(check).toContain('Payee');
    expect(voucher.slice(0, 2)).toBe('VA');
    expect(voucher).toContain('SI#SI-1');
    expect(voucher.length).toBe(1 + 16 + 15 + 15 + 8 + 21 * 4);
  });

  it('builds the Metrobank CCWS header and CRLF-delimited records', () => {
    expect(mbCcws(['C001'], '2020-02-27', 3)).toBe('MBTC-CCWS27022020-03\r\nC001\r\n');
  });
});
