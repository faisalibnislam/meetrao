/* ─────────────────────────────────────────────────────────────────────────────
   CSV, both directions.

   Pure and dependency-free, because the shapes that break naive splitting are
   exactly the ones a real address book contains: a company called
   "Acme, Inc.", a note with a line break in it, a name with an apostrophe or a
   quotation mark. `line.split(",")` mangles all three silently, and a contact
   importer that silently mangles data is worse than one that refuses.

   RFC 4180 with the usual concessions: CRLF or LF, a UTF-8 BOM from Excel, and
   a trailing newline are all accepted.
   ───────────────────────────────────────────────────────────────────────────── */

/** Splits a CSV document into rows of raw cells. */
export function parseCsv(input: string): string[][] {
  // Excel writes a BOM. Left in place it becomes part of the first header,
  // so "name" stops matching and every imported row loses its name.
  const text = input.replace(/^﻿/, "");

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let i = 0;

  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];

    if (quoted) {
      if (c === '"') {
        // "" inside a quoted field is one literal quote.
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      cell += c;
      i += 1;
      continue;
    }

    if (c === '"' && cell === "") {
      quoted = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      endCell();
      i += 1;
      continue;
    }
    if (c === "\r" && text[i + 1] === "\n") {
      endRow();
      i += 2;
      continue;
    }
    if (c === "\n" || c === "\r") {
      endRow();
      i += 1;
      continue;
    }

    cell += c;
    i += 1;
  }

  // A file ending in a newline must not produce a final empty row.
  if (cell !== "" || row.length) endRow();

  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

/**
 * Rows keyed by header.
 *
 * Headers are matched loosely (case, spaces, underscores and hyphens are all
 * ignored) so "Phone number", "phone_number" and "PHONE NUMBER" are one
 * column. People export from everywhere.
 */
export function parseCsvRecords(input: string): Record<string, string>[] {
  const rows = parseCsv(input);
  if (!rows.length) return [];

  const headers = rows[0].map(normaliseHeader);
  return rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (h) record[h] = undefuse((cells[i] ?? "").trim());
    });
    return record;
  });
}

/** What toCsvCell added, taken off again, so an export imports as it was. */
function undefuse(cell: string): string {
  return cell.startsWith("'") && FORMULA_START.test(cell.slice(1)) ? cell.slice(1) : cell;
}

export function normaliseHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

/* A cell a spreadsheet would run as a formula. Guests choose their own names
   and answers, so a booking from "=HYPERLINK(...)" became a live formula in
   the host's spreadsheet the moment they opened their contacts export. */
const FORMULA_START = /^[=+\-@\t\r]/;

/* Digits, spaces and phone punctuation only. "+44 20 7946 0958" starts with a
   formula character but cannot do anything as one, and a phone column full of
   apostrophes would be a worse export. */
const PHONE_LIKE = /^[+\-]?[\d\s().-]+$/;

/** Quotes a cell only when it has to, and defuses one that would run as a formula. */
export function toCsvCell(value: string): string {
  let v = value ?? "";
  if (FORMULA_START.test(v) && !PHONE_LIKE.test(v)) v = `'${v}`;
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(headers: string[], rows: string[][]): string {
  // CRLF and a trailing newline: what Excel expects, and harmless everywhere
  // else.
  return [headers, ...rows].map((r) => r.map(toCsvCell).join(",")).join("\r\n") + "\r\n";
}
