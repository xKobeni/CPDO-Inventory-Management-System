import { useState, useEffect, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function startOfWeekStr() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

function startOfMonthStr() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

function startOfYearStr() {
  const d = new Date()
  d.setMonth(0, 1)
  return d.toISOString().slice(0, 10)
}

function quarterRangeStr(year, q) {
  const startMonth = (q - 1) * 3
  const start = new Date(year, startMonth, 1)
  const end = new Date(year, startMonth + 3, 0)
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  }
}

function quarterLabel(q) {
  const labels = { 1: "Q1 (Jan–Mar)", 2: "Q2 (Apr–Jun)", 3: "Q3 (Jul–Sep)", 4: "Q4 (Oct–Dec)" }
  return labels[q] || `Q${q}`
}

const DYNAMIC_PRESETS = [
  { key: "allTime", label: "All Time", range: () => ({ from: "", to: "" }) },
  { key: "today", label: "Today", range: () => ({ from: todayStr(), to: todayStr() }) },
  { key: "thisWeek", label: "This Week", range: () => ({ from: startOfWeekStr(), to: todayStr() }) },
  { key: "thisMonth", label: "This Month", range: () => ({ from: startOfMonthStr(), to: todayStr() }) },
  { key: "thisYear", label: "This Year", range: () => ({ from: startOfYearStr(), to: todayStr() }) },
]

function matchPreset(from, to, year) {
  for (const p of DYNAMIC_PRESETS) {
    const { from: pf, to: pt } = p.range()
    if (from === pf && to === pt) return p.key
  }
  for (let q = 1; q <= 4; q++) {
    const { from: pf, to: pt } = quarterRangeStr(year, q)
    if (from === pf && to === pt) return `q${q}`
  }
  return "custom"
}

function yearOptions() {
  const cur = new Date().getFullYear()
  const years = []
  for (let y = cur - 5; y <= cur + 1; y++) years.push(y)
  return years
}

export default function DateRangeFilter({ dateFrom, dateTo, onDateFromChange, onDateToChange }) {
  const now = new Date()
  const [quarterYear, setQuarterYear] = useState(now.getFullYear())
  const [activePreset, setActivePreset] = useState(() => matchPreset(dateFrom, dateTo, now.getFullYear()))
  const isInternal = useRef(false)

  useEffect(() => {
    if (!isInternal.current) {
      setActivePreset(matchPreset(dateFrom, dateTo, quarterYear))
    }
    isInternal.current = false
  }, [dateFrom, dateTo, quarterYear])

  const applyPreset = useCallback((preset) => {
    isInternal.current = true
    setActivePreset(preset.key)
    if (preset.range) {
      const { from, to } = preset.range()
      onDateFromChange(from)
      onDateToChange(to)
    }
  }, [onDateFromChange, onDateToChange])

  const applyQuarter = useCallback((q) => {
    const { from, to } = quarterRangeStr(quarterYear, q)
    isInternal.current = true
    setActivePreset(`q${q}`)
    onDateFromChange(from)
    onDateToChange(to)
  }, [quarterYear, onDateFromChange, onDateToChange])

  useEffect(() => {
    const match = activePreset.match(/^q([1-4])$/)
    if (match) {
      const q = parseInt(match[1], 10)
      const { from, to } = quarterRangeStr(quarterYear, q)
      if (from !== dateFrom || to !== dateTo) {
        isInternal.current = true
        onDateFromChange(from)
        onDateToChange(to)
      }
    }
  }, [quarterYear])

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {DYNAMIC_PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => applyPreset(p)}
          className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
            activePreset === p.key
              ? "bg-zinc-900 text-white border-zinc-900"
              : "bg-white text-muted-foreground border-input hover:bg-muted/50"
          }`}
        >
          {p.label}
        </button>
      ))}
      {[1, 2, 3, 4].map((q) => (
        <button
          key={`q${q}`}
          type="button"
          onClick={() => applyQuarter(q)}
          className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
            activePreset === `q${q}`
              ? "bg-zinc-900 text-white border-zinc-900"
              : "bg-white text-muted-foreground border-input hover:bg-muted/50"
          }`}
        >
          {quarterLabel(q)}
        </button>
      ))}
      <button
        type="button"
        onClick={() => applyPreset({ key: "custom", range: null })}
        className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
          activePreset === "custom"
            ? "bg-zinc-900 text-white border-zinc-900"
            : "bg-white text-muted-foreground border-input hover:bg-muted/50"
        }`}
      >
        Custom
      </button>
      <div className="flex items-center gap-1 ml-1">
        <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Year</Label>
        <Select
          value={String(quarterYear)}
          onValueChange={(v) => setQuarterYear(parseInt(v, 10))}
        >
          <SelectTrigger className="h-7 w-[80px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions().map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1.5 ml-1">
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => { isInternal.current = false; onDateFromChange(e.target.value) }}
          className="w-[130px] h-7 text-xs"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => { isInternal.current = false; onDateToChange(e.target.value) }}
          className="w-[130px] h-7 text-xs"
        />
      </div>
    </div>
  )
}
