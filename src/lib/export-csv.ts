import Papa from 'papaparse'
import { commissionRate } from '#/lib/business/commission'
import { formatCurrency, formatDate } from '#/lib/format'
import { productLabel } from '#/lib/business/products'
import type { Sale } from '#/lib/types'

export function exportSalesCsv(sales: Sale[]) {
  const rows: Record<string, string | number>[] = []
  let totalValor = 0
  let totalComissao = 0

  for (const sale of sales) {
    const rate = commissionRate(sale.paymentMethod)
    const contractReceipt = sale.receipts.find((r) => r.installmentId === null)

    sale.installments.forEach((installment, index) => {
      const commission = installment.received ? installment.value * rate : 0
      const receipt = sale.receipts.find((r) => r.installmentId === installment.id)
      totalValor += installment.value
      totalComissao += commission

      rows.push({
        Cliente: sale.leadName,
        Produto: productLabel(sale.product),
        'Forma de pagamento': sale.paymentMethod,
        'Data da venda': formatDate(sale.date),
        'Valor do contrato': sale.value,
        'Nº da parcela': index + 1,
        Valor: installment.value,
        Data: formatDate(installment.dueDate),
        Status: installment.received ? 'Pago' : 'Pendente',
        Comissão: commission.toFixed(2),
        'Link do comprovante': receipt?.path ?? '',
        'Link do contrato': contractReceipt?.path ?? '',
      })
    })
  }

  rows.push({ Cliente: 'TOTAL', Valor: totalValor.toFixed(2), Comissão: totalComissao.toFixed(2) })

  const csv = Papa.unparse(rows)
  const blob = new Blob([String.fromCharCode(0xfeff) + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `focosales-clientes-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)

  return { totalValor: formatCurrency(totalValor), totalComissao: formatCurrency(totalComissao) }
}
