export function parseCsvToRows(csvText: string): string[][] {
  const text = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];

  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    // Not in quotes
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      field = "";
      // Avoid pushing trailing empty line
      const isAllEmpty = row.every((c) => String(c ?? "").trim() === "");
      if (!isAllEmpty) rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }

  // Tail
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    const isAllEmpty = row.every((c) => String(c ?? "").trim() === "");
    if (!isAllEmpty) rows.push(row);
  }

  return rows;
}

export function normalizeHeaderKey(h: string) {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "");
}

export function toNumberOrNull(value: unknown): number | null {
  const v = String(value ?? "").trim();
  if (!v) return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

export function toIntOrNull(value: unknown): number | null {
  const num = toNumberOrNull(value);
  if (num === null) return null;
  const intVal = Math.trunc(num);
  if (intVal !== num) return null;
  return intVal;
}

export function csvEscapeCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  const needsQuotes = s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r");
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function generateImportLogCsv(rows: Array<{ rowNumber: number; identifier: string; status: string; message: string }>) {
  const header = ["Row", "Identifier", "Status", "Message"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscapeCell(r.rowNumber),
        csvEscapeCell(r.identifier),
        csvEscapeCell(r.status),
        csvEscapeCell(r.message),
      ].join(",")
    );
  }
  return lines.join("\n") + "\n";
}

