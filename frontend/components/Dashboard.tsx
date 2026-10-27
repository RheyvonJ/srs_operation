import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ClipboardList,
  FileText,
  Folder,
  FolderOpen,
  LogOut,
  Menu,
  Package,
  Receipt,
  ShoppingCart,
  X,
} from 'lucide-react';

interface DashboardProps {
  username: string;
  onLogout: () => void;
}

const folderItems = [
  {
    id: 'cv-debit',
    name: 'Supplier CV & Debit Memo',
    detail: 'Credit vouchers and debit memos',
    icon: FileText,
  },
  {
    id: 'apv',
    name: 'Supplier APV',
    detail: 'Accounts payable vouchers',
    icon: ClipboardList,
  },
  {
    id: 'rs',
    name: 'Supplier RS',
    detail: 'Receiving slips',
    icon: Receipt,
  },
  {
    id: 'po',
    name: 'Purchase Order',
    detail: 'Supplier purchase orders',
    icon: ShoppingCart,
  },
  {
    id: 'consignment',
    name: 'Consignment',
    detail: 'Consignment records',
    icon: Package,
  },
] as const;

type FolderItem = (typeof folderItems)[number];
type FolderItemId = FolderItem['id'];

const ItemPanel: React.FC<{ item: FolderItem }> = ({ item }) => {
  const Icon = item.icon;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#E6E0D6] bg-[#FFFCF8] shadow-sm">
      <div className="flex items-center gap-3 border-b border-[#E6E0D6] bg-[#0D1B2A] px-4 py-4 sm:px-6">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5383B] text-white">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-heading text-sm font-bold text-white truncate">{item.name}</p>
          <p className="text-[11px] text-[#FFD166]">Supplier & Transactions</p>
        </div>
      </div>
      <div className="px-4 py-10 sm:px-6 text-center">
        <p className="font-heading text-base font-bold text-[#0D1B2A]">This folder is empty</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#6E675E]">
          {item.name} is open and ready. Records will show here when they are added.
        </p>
      </div>
    </section>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ username, onLogout }) => {
  const [folderOpen, setFolderOpen] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<FolderItemId | null>(null);

  useEffect(() => {
    const previous = document.title;
    document.title = 'San Roque Supermarket - NOVA';
    return () => {
      document.title = previous;
    };
  }, []);

  const selected = folderItems.find((item) => item.id === selectedId) ?? null;

  const openItem = (id: FolderItemId) => {
    setSelectedId(id);
    setFolderOpen(true);
    setNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#212529] flex flex-col font-body selection:bg-[#E5383B] selection:text-white">
      <header className="relative z-20 bg-[#0D1B2A] text-white border-b border-[#FFD166]/25">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#E5383B]" />
        <div className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-6 lg:px-8 py-3">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="lg:hidden inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white"
            aria-label="Open Supplier and Transactions"
          >
            <Menu className="h-5 w-5" />
          </button>

          <span className="inline-flex shrink-0 overflow-hidden rounded-2xl bg-white p-1">
            <img
              src="/srs-logo.png"
              alt="San Roque Supermarket"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="font-heading font-extrabold text-sm sm:text-base lg:text-lg tracking-tight text-white truncate">
              San Roque Supermarket - NOVA
            </h1>
            <p className="text-[11px] text-[#FFD166] truncate">
              Signed in as {username}
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-[#E5383B] px-3 sm:px-4 py-2.5 text-xs font-heading font-extrabold uppercase tracking-wider text-white shadow-sm hover:bg-[#c92a2d] transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="relative flex flex-1 min-h-0">
        {navOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-[#0D1B2A]/55 lg:hidden"
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[min(100%,18.5rem)] flex-col border-r border-[#E6E0D6] bg-[#FFFCF8] transition-transform duration-200 lg:static lg:z-auto lg:w-80 lg:shrink-0 lg:translate-x-0 ${
            navOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#E6E0D6] px-4 py-4 lg:hidden">
            <p className="font-heading text-sm font-extrabold uppercase tracking-wide text-[#0D1B2A]">
              NOVA
            </p>
            <button
              type="button"
              onClick={() => setNavOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E6E0D6] text-[#0D1B2A]"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 pt-5 pb-2">
            <p className="font-heading text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A8175]">
              Import
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-6" aria-label="Supplier and Transactions">
            <button
              type="button"
              onClick={() => setFolderOpen((open) => !open)}
              aria-expanded={folderOpen}
              className="flex w-full items-center gap-2.5 rounded-xl bg-[#0D1B2A] px-3 py-3 text-left text-white"
            >
              {folderOpen ? (
                <FolderOpen className="h-5 w-5 shrink-0 text-[#FFD166]" />
              ) : (
                <Folder className="h-5 w-5 shrink-0 text-[#FFD166]" />
              )}
              <span className="min-w-0 flex-1 font-heading text-sm font-bold leading-snug">
                Supplier & Transactions
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#FFD166] transition-transform ${
                  folderOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {folderOpen && (
              <ul className="mt-2 space-y-1 border-l-2 border-[#FFD166] ml-5 pl-2">
                {folderItems.map((item) => {
                  const Icon = item.icon;
                  const active = selectedId === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => openItem(item.id)}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                          active
                            ? 'bg-[#FDECEC] text-[#E5383B] font-semibold'
                            : 'text-[#212529] hover:bg-[#F7F4EF]'
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#E5383B]' : 'text-[#0D1B2A]'}`} />
                        <span className="leading-snug">{item.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">
            <p className="font-heading text-[11px] font-bold uppercase tracking-[0.16em] text-[#E5383B]">
              Import
            </p>
            <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0D1B2A]">
                  {selected ? selected.name : 'Supplier & Transactions'}
                </h2>
                <p className="mt-1 text-sm text-[#6E675E]">
                  {selected
                    ? selected.detail
                    : 'Folder for supplier documents and store transactions.'}
                </p>
              </div>
              {selected && (
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="self-start rounded-xl border border-[#E6E0D6] bg-[#FFFCF8] px-3 py-2 text-xs font-heading font-bold uppercase tracking-wider text-[#0D1B2A] hover:border-[#0D1B2A]"
                >
                  Back to folder
                </button>
              )}
            </div>

            {selected ? (
              <ItemPanel item={selected} />
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {folderItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openItem(item.id)}
                      className="rounded-2xl border border-[#E6E0D6] bg-[#FFFCF8] p-4 text-left shadow-sm transition-all hover:border-[#E5383B] hover:shadow-md"
                    >
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#FDECEC] text-[#E5383B]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="mt-4 block font-heading text-base font-bold text-[#0D1B2A]">
                        {item.name}
                      </span>
                      <span className="mt-1 block text-sm text-[#6E675E]">
                        {item.detail}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <footer className="bg-[#0D1B2A] border-t border-[#FFD166]/25 px-4 sm:px-6 py-3 text-center sm:text-left">
        <p className="text-[11px] text-white/60">
          <span className="font-semibold text-white/85">San Roque Supermarket Retail Systems Inc.</span>
          <span className="mx-2 text-[#FFD166]/70">·</span>
          <span>NOVA</span>
        </p>
      </footer>
    </div>
  );
};
