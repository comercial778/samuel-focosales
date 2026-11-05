export interface NavLink {
  to: string
  label: string
}

export const NAV_LINKS: NavLink[] = [
  { to: '/', label: 'Início' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/comprovantes', label: 'Todos os Clientes' },
  { to: '/a-receber', label: 'Clientes a Receber' },
  { to: '/metas', label: 'Metas' },
  { to: '/configuracoes', label: 'Configurações' },
  { to: '/usuarios', label: 'Usuários' },
]
