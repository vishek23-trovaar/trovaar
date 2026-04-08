"use client";

type Dir = "asc" | "desc";

interface Props {
  col: string;
  label: string;
  sort: string;
  dir: Dir;
  onSort: (col: string) => void;
  className?: string;
}

export default function SortableHeader({ col, label, sort, dir, onSort, className = "" }: Props) {
  const active = sort === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`text-left px-5 py-3 text-xs font-medium text-slate-500 cursor-pointer select-none hover:text-slate-800 whitespace-nowrap group ${className}`}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className={`transition-opacity ${active ? "opacity-100 text-slate-700" : "opacity-0 group-hover:opacity-40 text-slate-400"}`}>
          {active && dir === "asc" ? "\u25B2" : "\u25BC"}
        </span>
      </span>
    </th>
  );
}
