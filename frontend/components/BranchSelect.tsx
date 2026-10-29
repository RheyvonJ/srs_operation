import React, { useEffect, useState } from 'react';
import { SearchSelect } from './SearchSelect';

export interface BranchOption {
  id: number;
  code: string;
  name: string;
}

const connectionError = 'Could not load the branch list. Please check the server connection.';

let request: Promise<BranchOption[]> | null = null;
let resolvedBranches: BranchOption[] | null = null;

function loadBranches(): Promise<BranchOption[]> {
  if (!request) {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
    request = fetch(`${apiBaseUrl}/branches`)
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as
          | BranchOption[]
          | { message?: string | string[] }
          | null;
        if (!response.ok || !Array.isArray(body)) {
          const message = !body || Array.isArray(body)
            ? connectionError
            : Array.isArray(body.message)
              ? body.message.join(' ')
              : body.message || connectionError;
          throw new Error(message);
        }
        const branches = body.filter(
          (branch) =>
            branch &&
            typeof branch.id === 'number' &&
            typeof branch.code === 'string' &&
            typeof branch.name === 'string' &&
            branch.name.trim(),
        );
        resolvedBranches = branches;
        return branches;
      })
      .catch((error: unknown) => {
        request = null;
        resolvedBranches = null;
        if (error instanceof TypeError) throw new Error(connectionError);
        if (error instanceof Error && error.message) throw error;
        throw new Error(connectionError);
      });
  }
  return request;
}

function useBranches() {
  const [branches, setBranches] = useState<BranchOption[]>(resolvedBranches ?? []);
  const [loading, setLoading] = useState(resolvedBranches === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadBranches()
      .then((nextBranches) => {
        if (!active) return;
        setBranches(nextBranches);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setBranches([]);
        setError(loadError instanceof Error ? loadError.message : connectionError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { branches, loading, error };
}

interface BranchSelectProps {
  id: string;
  emptyValue?: string;
  emptyLabel?: string;
}

export const BranchSelect: React.FC<BranchSelectProps> = ({
  id,
  emptyValue = '',
  emptyLabel = 'Select Branch',
}) => {
  const { branches, loading, error } = useBranches();

  return (
    <SearchSelect
      id={id}
      name="branch"
      options={branches.map((branch) => ({ value: branch.code, label: branch.name }))}
      emptyValue={emptyValue}
      emptyLabel={emptyLabel}
      placeholder="Search branch"
      loading={loading}
      loadingLabel="Loading branches..."
      invalid={Boolean(error)}
    />
  );
};

export const BranchLoadError: React.FC = () => {
  const { error } = useBranches();
  if (!error) return null;

  return (
    <p
      role="alert"
      className="mx-auto mt-3 max-w-xl rounded-xl border border-[#E53935]/25 bg-[#FFEBEE] px-4 py-3 text-center text-xs font-medium text-[#E53935]"
    >
      {error}
    </p>
  );
};
