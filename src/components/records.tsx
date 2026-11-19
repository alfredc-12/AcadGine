"use client";

import { ArrowDown, ArrowRight, ArrowUp, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import type { Tone } from "@/lib/analytics";
import { Badge, Button, Empty, Input, Table } from "@/components/ui/primitives";

export function Status({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <Badge data-tone={tone}><span className="status-dot" aria-hidden="true" />{children}</Badge>;
}

type Cell = string | number | null;
export type Column<Row> = {
  id: string;
  title: string;
  value: (row: Row) => Cell;
  display?: (row: Row) => ReactNode;
  numeric?: boolean;
};
type Sort = { id: string; direction: "ascending" | "descending" };

function csvValue(value: Cell) {
  const text = String(value ?? "");
  const escaped = typeof value === "string" && /^[=+\-@\t\r\n]/.test(text) ? "'" + text : text;
  return '"' + escaped.replaceAll('"', '""') + '"';
}

function download<Row>(name: string, columns: Column<Row>[], rows: Row[]) {
  const lines = [
    columns.map((column) => csvValue(column.title)).join(","),
    ...rows.map((row) => columns.map((column) => csvValue(column.value(row))).join(",")),
  ];
  const url = URL.createObjectURL(new Blob(["\uFEFF", lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function RecordsTable<Row>({ label, rows, columns, keyOf, onOpen, exportName, pageSize = 8,
  simple = false, tools, rowLabel }: {
  label: string; rows: Row[]; columns: Column<Row>[]; keyOf: (row: Row) => string;
  onOpen?: (row: Row) => void; exportName?: string; pageSize?: number; simple?: boolean; tools?: ReactNode;
  rowLabel?: (row: Row) => string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>();
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    const matches = term ? rows.filter((row) => columns.some((column) =>
      String(column.value(row) ?? "").toLocaleLowerCase().includes(term))) : rows;
    const column = columns.find(({ id }) => id === sort?.id);
    if (!column || !sort) return matches;
    return [...matches].sort((left, right) => {
      const a = column.value(left);
      const b = column.value(right);
      if (a === null) return b === null ? 0 : 1;
      if (b === null) return -1;
      const order = typeof a === "number" && typeof b === "number" ? a - b
        : String(a).localeCompare(String(b), "en", { numeric: true });
      return sort.direction === "ascending" ? order : -order;
    });
  }, [columns, query, rows, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePage = Math.min(page, pageCount - 1);
  const offset = activePage * pageSize;
  const visible = simple ? filtered.slice(0, pageSize) : filtered.slice(offset, offset + pageSize);

  function sortBy(id: string) {
    setSort((prior) => ({ id, direction: prior?.id === id && prior.direction === "ascending" ? "descending" : "ascending" }));
    setPage(0);
  }

  return <div className="records">
    {!simple && <div className="table-toolbar">
      <label className="search-field"><Search aria-hidden="true" />
        <Input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }}
          aria-label={`Search ${label.toLowerCase()}`} placeholder="Search records…" />
      </label>
      <div className="table-filters">
        {tools}
        {exportName && <Button variant="outline" size="sm" disabled={!filtered.length}
          onClick={() => download(exportName, columns, filtered)}><Download data-icon="inline-start" /> Export CSV</Button>}
      </div>
    </div>}
    {visible.length ? <Table aria-label={label}>
      <thead><tr>{columns.map((column) => {
        const active = sort?.id === column.id;
        const SortIcon = sort?.direction === "descending" ? ArrowDown : ArrowUp;
        return <th key={column.id} scope="col" className={column.numeric ? "number" : undefined} aria-sort={active ? sort?.direction : undefined}>
          {simple ? column.title : <button type="button" className="sort-button" onClick={() => sortBy(column.id)}>
            {column.title}{active && <SortIcon aria-hidden="true" />}
          </button>}
        </th>;
      })}{onOpen && <th scope="col"><span className="sr-only">Details</span></th>}</tr></thead>
      <tbody>{visible.map((row) => <tr key={keyOf(row)} data-interactive={onOpen ? "" : undefined}
        onClick={onOpen ? (event) => {
          if (event.target instanceof Element && event.target.closest("button, a, input")) return;
          if (window.getSelection()?.toString()) return;
          event.currentTarget.querySelector("button")?.focus({ preventScroll: true });
          onOpen(row);
        } : undefined}>
        {columns.map((column, index) => <td key={column.id} className={column.numeric ? "number" : undefined}>
          {index === 0 && onOpen
            ? <button type="button" className="row-link" aria-label={rowLabel ? `View details for ${rowLabel(row)}` : undefined}
              onClick={() => onOpen(row)}>{column.display?.(row) ?? column.value(row)}</button>
            : column.display?.(row) ?? column.value(row) ?? <span className="muted">N/A</span>}
        </td>)}
        {onOpen && <td className="row-action"><Button size="icon" variant="ghost"
          aria-label={`View details for ${rowLabel?.(row) ?? columns[0].value(row)}`} onClick={() => onOpen(row)}><ArrowRight /></Button></td>}
      </tr>)}</tbody>
    </Table> : <Empty />}
    {!simple && <div className="pagination">
      <span aria-live="polite">{filtered.length ? `${offset + 1}–${offset + visible.length} of ${filtered.length}` : "0 records"}</span>
      <div>
        <Button size="icon" variant="ghost" aria-label="Previous page" onClick={() => setPage(activePage - 1)} disabled={!activePage}><ChevronLeft /></Button>
        <Button size="icon" variant="ghost" aria-label="Next page" onClick={() => setPage(activePage + 1)} disabled={activePage >= pageCount - 1}><ChevronRight /></Button>
      </div>
    </div>}
  </div>;
}
