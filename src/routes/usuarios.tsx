import { createFileRoute } from '@tanstack/react-router'
import { requireAuthContext } from '#/lib/auth-guard'
import { listWorkspaceUsers } from '#/server/users'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent } from '#/components/ui/card'
import { formatDate, initials } from '#/lib/format'

export const Route = createFileRoute('/usuarios')({
  beforeLoad: requireAuthContext,
  loader: async () => ({ users: await listWorkspaceUsers() }),
  component: UsuariosPage,
})

const ROLE_LABEL: Record<string, string> = {
  owner: 'Proprietário',
  observer: 'Observador',
  member: 'Membro',
}

function UsuariosPage() {
  const { users } = Route.useLoaderData()

  return (
    <main className="page-wrap flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Usuários</h1>
        <p className="text-sm text-muted-foreground">Contas com acesso a este workspace</p>
      </div>

      <Card>
        <CardContent className="flex flex-col divide-y p-0">
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-3 p-4">
              <Avatar>
                <AvatarFallback>{initials(user.displayName ?? user.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.displayName ?? user.email}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Desde {formatDate(user.createdAt.slice(0, 10))}
              </p>
              {user.role && <Badge variant="outline">{ROLE_LABEL[user.role] ?? user.role}</Badge>}
            </div>
          ))}
          {users.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
