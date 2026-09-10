import { describe, expect, it } from "vitest";
import { normaliseHeader, parseCsv, parseCsvRecords, toCsv, toCsvCell } from "./csv";

/* The cases here are the ones a real address book actually contains. A parser
   that only handles the easy ones corrupts data quietly, which is the worst
   way for an importer to fail. */

describe("parseCsv", () => {
  it("reads plain rows", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("keeps a comma inside a quoted field", () => {
    expect(parseCsv('name,company\nAda,"Acme, Inc."')).toEqual([
      ["name", "company"],
      ["Ada", "Acme, Inc."],
    ]);
  });

  it("keeps a newline inside a quoted field", () => {
    expect(parseCsv('note\n"line one\nline two"')).toEqual([["note"], ["line one\nline two"]]);
  });

  it("reads a doubled quote as one literal quote", () => {
    expect(parseCsv('name\n"She said ""hello"""')).toEqual([["name"], ['She said "hello"']]);
  });

  it("accepts CRLF", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("strips Excel's byte-order mark", () => {
    // Left in place the BOM becomes part of the first header, and every
    // imported row silently loses its name.
    expect(parseCsv("﻿name,email\nAda,a@b.com")[0][0]).toBe("name");
  });

  it("drops blank lines rather than importing empty contacts", () => {
    expect(parseCsv("a\n\n1\n\n")).toEqual([["a"], ["1"]]);
  });

  it("keeps empty cells in a row that has content", () => {
    expect(parseCsv("a,b,c\n1,,3")).toEqual([["a", "b", "c"], ["1", "", "3"]]);
  });
});

describe("parseCsvRecords", () => {
  it("matches headers however they are spelled", () => {
    const rows = parseCsvRecords("Full Name,E-Mail,PHONE_NUMBER\nAda,a@b.com,123");
    expect(rows[0]).toEqual({ fullname: "Ada", email: "a@b.com", phonenumber: "123" });
  });

  it("returns nothing for an empty file", () => {
    expect(parseCsvRecords("")).toEqual([]);
    expect(parseCsvRecords("\n")).toEqual([]);
  });
});

describe("normaliseHeader", () => {
  it("folds case, spaces, underscores and hyphens", () => {
    for (const h of ["Phone number", "phone_number", "PHONE-NUMBER", " phone number "]) {
      expect(normaliseHeader(h)).toBe("phonenumber");
    }
  });
});

describe("toCsv", () => {
  it("quotes only what needs quoting", () => {
    expect(toCsvCell("plain")).toBe("plain");
    expect(toCsvCell("Acme, Inc.")).toBe('"Acme, Inc."');
    expect(toCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(toCsvCell("two\nlines")).toBe('"two\nlines"');
  });

  it("round-trips through the parser", () => {
    const headers = ["name", "company", "note"];
    const rows = [["Ada", "Acme, Inc.", 'said "hi"'], ["Grace", "", "two\nlines"]];
    expect(parseCsv(toCsv(headers, rows))).toEqual([headers, ...rows]);
  });
});
