import ConvertedTransactionView from '@/components/ConvertedTransactionView';
export const instant = false;
export default async function ConvertedPurchasingView({ params, searchParams }: { params: Promise<{ view: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) { const [{ view }, query] = await Promise.all([params, searchParams]); return <ConvertedTransactionView view={view} query={query}/>; }
