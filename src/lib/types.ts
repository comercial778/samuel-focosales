export type PaymentMethod = 'PIX' | 'Pix Parcelado' | 'Cartão'

export type LeadSource = 'trafego' | 'instagram' | 'will' | 'outro' | (string & {})

export type AppRole = 'owner' | 'observer' | 'member'

export interface Installment {
  id: string
  saleId: string
  value: number
  dueDate: string | null
  received: boolean
  position: number
}

export interface Receipt {
  id: string
  ownerId: string
  saleId: string
  installmentId: string | null
  path: string
  filename: string
  mime: string | null
  size: number | null
  createdAt: string
}

export interface Sale {
  id: string
  ownerId: string
  date: string
  leadName: string
  phone: string | null
  paymentMethod: PaymentMethod
  value: number
  product: string | null
  leadSource: string | null
  isOpportunity: boolean
  contractSigned: boolean
  paymentReceived: boolean
  createdAt: string
  updatedAt: string
  installments: Installment[]
  receipts: Receipt[]
}

export interface SaleInstallmentInput {
  id?: string
  value: number
  dueDate: string | null
  received: boolean
}

export interface SaleInput {
  date: string
  leadName: string
  phone: string | null
  paymentMethod: PaymentMethod
  value: number
  product: string | null
  leadSource: string | null
  isOpportunity: boolean
  contractSigned: boolean
  paymentReceived: boolean
  installments: SaleInstallmentInput[]
}

export interface SalesGoal {
  id: string
  ownerId: string
  cycleStart: string
  cycleEnd: string
  goalAmount: number
  receivedOverride: number | null
  soldOverride: number | null
  createdAt: string
  updatedAt: string
}

export interface UserSettings {
  userId: string
  baseSalary: number
  shareEnabled: boolean
  updatedAt: string
}

export interface Profile {
  id: string
  email: string
  displayName: string | null
  createdAt: string
  role: AppRole | null
}

export interface MyContext {
  userId: string
  email: string
  displayName: string | null
}
