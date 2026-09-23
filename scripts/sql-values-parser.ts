export type SqlValue = string | number | boolean | null

/** Parses a single Postgres literal tuple, e.g. "('a', 1, NULL, true)", into JS values. */
export function parseValueTuple(tuple: string): SqlValue[] {
  const inner = tuple.trim().replace(/^\(/, '').replace(/\)$/, '')
  const values: SqlValue[] = []
  let i = 0

  while (i < inner.length) {
    while (i < inner.length && (inner[i] === ' ' || inner[i] === '\n')) i++
    if (i >= inner.length) break

    if (inner[i] === "'") {
      let str = ''
      i++
      while (i < inner.length) {
        if (inner[i] === "'" && inner[i + 1] === "'") {
          str += "'"
          i += 2
          continue
        }
        if (inner[i] === "'") {
          i++
          break
        }
        str += inner[i]
        i++
      }
      values.push(str)
    } else {
      let token = ''
      while (i < inner.length && inner[i] !== ',') {
        token += inner[i]
        i++
      }
      token = token.trim()
      if (token.toUpperCase() === 'NULL') values.push(null)
      else if (token.toLowerCase() === 'true') values.push(true)
      else if (token.toLowerCase() === 'false') values.push(false)
      else values.push(Number(token))
    }

    while (i < inner.length && inner[i] !== ',') i++
    if (inner[i] === ',') i++
  }

  return values
}

export interface ParsedInsert {
  table: string
  columns: string[]
  values: SqlValue[]
}

/** Parses every `INSERT INTO public.<table> (cols) VALUES (vals);` line in the dump. */
export function parseInserts(sql: string): ParsedInsert[] {
  const results: ParsedInsert[] = []
  const lineRegex = /^INSERT INTO public\.(\w+)\s*\(([^)]+)\)\s*VALUES\s*(\(.*\));$/gm

  let match: RegExpExecArray | null
  while ((match = lineRegex.exec(sql))) {
    const [, table, columnsRaw, valuesRaw] = match
    const columns = columnsRaw.split(',').map((c) => c.trim())
    const values = parseValueTuple(valuesRaw)
    results.push({ table, columns, values })
  }

  return results
}

export function rowsFor(inserts: ParsedInsert[], table: string): Record<string, SqlValue>[] {
  return inserts
    .filter((i) => i.table === table)
    .map((i) => Object.fromEntries(i.columns.map((c, idx) => [c, i.values[idx] ?? null])))
}
