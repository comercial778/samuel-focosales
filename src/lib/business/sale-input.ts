import type { Sale, SaleInput } from '#/lib/types'

export function saleToInput(sale: Sale): SaleInput {
  return {
    date: sale.date,
    leadName: sale.leadName,
    phone: sale.phone,
    paymentMethod: sale.paymentMethod,
    value: sale.value,
    product: sale.product,
    leadSource: sale.leadSource,
    isOpportunity: sale.isOpportunity,
    contractSigned: sale.contractSigned,
    paymentReceived: sale.paymentReceived,
    installments: sale.installments.map((i) => ({
      id: i.id,
      value: i.value,
      dueDate: i.dueDate,
      received: i.received,
    })),
  }
}
