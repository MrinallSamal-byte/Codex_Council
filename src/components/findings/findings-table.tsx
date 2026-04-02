"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import type { Finding } from "@/lib/contracts/domain";
import { titleCase } from "@/lib/utils";

import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export function FindingsTable({ findings }: { findings: Finding[] }) {
  const [filter, setFilter] = useState("");

  const columns = useMemo<ColumnDef<Finding>[]>(
    () => [
      {
        accessorKey: "severity",
        header: "Severity",
        cell: ({ row }) => (
          <Badge variant={row.original.severity}>{row.original.severity}</Badge>
        ),
      },
      {
        accessorKey: "title",
        header: "Finding",
      },
      {
        accessorKey: "impactedAreas",
        header: "Areas",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            {row.original.impactedAreas.map((area) => (
              <Badge key={area} variant="secondary">
                {titleCase(area)}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        accessorKey: "confidence",
        header: "Confidence",
        cell: ({ row }) => `${Math.round(row.original.confidence * 100)}%`,
      },
      {
        accessorKey: "filePath",
        header: "Evidence",
        cell: ({ row }) => (
          <div className="text-xs text-slate-400">{row.original.filePath ?? "No file path"}</div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: findings,
    columns,
    state: {
      globalFilter: filter,
    },
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, value) =>
      JSON.stringify(row.original).toLowerCase().includes(String(value).toLowerCase()),
  });

  return (
    <div className="space-y-4">
      <Input
        placeholder="Filter findings by title, path, or area"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
