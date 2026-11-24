import { Select } from '@mantine/core';
import type { LibraryChoice } from '@/api/admin';

/** The shared library an admin creates a top-level topic in (ADR015). */
export function LibrarySelect({
  libraries,
  value,
  onChange,
  error,
}: {
  libraries: LibraryChoice[];
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
}) {
  return (
    <Select
      label="Shared library"
      description="Every user can read it and generate tests from it."
      withAsterisk
      placeholder="Choose a library"
      data={libraries.map((l) => ({ value: String(l.id), label: l.name }))}
      value={value}
      onChange={onChange}
      error={error}
      allowDeselect={false}
    />
  );
}
