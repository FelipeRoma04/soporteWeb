import * as slaAlertModel from '../models/SlaAlert.js';
import * as notificationModel from '../models/Notification.js';
import { ROLES } from '../models/Role.js';

const CHECK_EVERY_MS = 60_000;
let lastCheck = 0;
let running = false;

const clip = (text) => text.slice(0, 250);

// Cuando un ticket pasa su plazo sin cerrarse se avisa UNA vez (el ticket sigue en su lista, solo se marca como vencido):
//  - al agente que lo tiene asignado (o a todos los agentes activos si nadie lo tiene) para que lo atienda ya;
//  - a los administradores para que sepan que el equipo no lo resolvió a tiempo.
// Las dos cosas son notificaciones normales (campana), que abren el ticket.
export async function notifyOverdueTickets() {
  const overdue = await slaAlertModel.claimNewlyOverdueTickets();
  if (!overdue.length) return 0;
  const [agentIds, adminIds] = await Promise.all([slaAlertModel.listActiveUserIdsByRole(ROLES.AGENT), slaAlertModel.listActiveUserIdsByRole(ROLES.ADMIN)]);

  for (const ticket of overdue) {
    const assignedIsStaff = agentIds.includes(ticket.assigned_to) || adminIds.includes(ticket.assigned_to);
    const agentRecipients = assignedIsStaff ? [ticket.assigned_to] : agentIds;
    const adminRecipients = adminIds.filter((id) => !agentRecipients.includes(id));
    const plazo = `${ticket.sla_hours} h, prioridad ${ticket.priority}`;
    try {
      await notificationModel.createMany(agentRecipients, ticket.id, clip(`Ticket #${ticket.id} vencido (${plazo}): sigue «${ticket.status}». Atiéndelo cuanto antes.`));
      await notificationModel.createMany(adminRecipients, ticket.id, clip(`Plazo vencido en el ticket #${ticket.id} (${plazo}): sigue «${ticket.status}» y el equipo no lo ha resuelto.`));
    } catch (error) {
      console.error(`No se pudo notificar el vencimiento del ticket #${ticket.id}`, error);
    }
  }
  return overdue.length;
}

// Se llama cada vez que alguien carga la lista de tickets (la pantalla la refresca cada minuto), con un máximo de una revisión por minuto.
// Nunca debe romper la respuesta de quien consulta: cualquier error solo se registra. Mientras nadie tenga la app abierta no se revisa nada
// (en el plan gratuito de Render el servidor también duerme), por eso los avisos llegan en cuanto alguien vuelve a entrar.
export function checkOverdueTicketsSoon() {
  const now = Date.now();
  if (running || now - lastCheck < CHECK_EVERY_MS) return;
  running = true;
  lastCheck = now;
  notifyOverdueTickets()
    .catch((error) => console.error('No se pudo revisar los tickets vencidos', error))
    .finally(() => { running = false; });
}