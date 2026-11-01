# MEDICAREM — plan de pruebas y evidencia

**Versión del plan:** 1.0  
**Fecha:** 26 de octubre de 2026  
**Resultado actual:** 10 pruebas unitarias automatizadas de fecha y zona horaria aprobadas; las 28 pruebas de aceptación siguientes están pendientes de ejecución.

## Pruebas automatizadas ejecutadas

Comando: `pnpm --filter @workspace/api-server test`

| Área | Casos cubiertos | Resultado |
|---|---|---|
| Formato de hora de 24 horas | válidos e inválidos | Aprobado |
| Fechas calendario | año bisiesto y valores fuera de rango | Aprobado |
| Normalización de fecha | fecha ISO y objeto `Date` | Aprobado |
| Aritmética de fechas | límites de mes, año y día bisiesto | Aprobado |
| Zona horaria | fecha local de Colombia y conversión a UTC | Aprobado |
| Ventanas diarias | día de Colombia y transiciones DST de 23/25 horas | Aprobado |

Verificación estática adicional ejecutada: `typecheck` de API y web. Esto no reemplaza pruebas de rutas, permisos, persistencia ni pruebas de aceptación.

## Matriz de aceptación — 28 escenarios

Los escenarios marcados **Pendiente** requieren ejecución manual con cuentas ficticias en una base de desarrollo aislada. No introducir datos de pacientes reales. Guardar evidencia de cada ejecución (fecha, versión, dispositivo/navegador, pasos, resultado y captura sin datos identificables).

| ID | Escenario | Resultado esperado | Estado |
|---|---|---|---|
| A01 | Crear cuenta con un correo ficticio y contraseña válida | La cuenta se crea y muestra el flujo de verificación configurado por Clerk | Pendiente |
| A02 | Intentar entrar con una contraseña incorrecta | Se muestra un error comprensible, sin revelar si existe otra cuenta | Pendiente |
| A03 | Cerrar sesión y volver a entrar | La sesión anterior deja de autorizar solicitudes; el nuevo inicio permite recuperar el perfil | Pendiente |
| A04 | Llamar a una ruta privada de API sin sesión | La API responde no autorizado y no entrega datos | Pendiente |
| A05 | Completar onboarding como paciente | Se guarda el rol, el nombre visible y `America/Bogota` | Pendiente |
| A06 | Completar onboarding como cuidador | Se crea un perfil de cuidador sin conceder acceso automático a pacientes | Pendiente |
| A07 | Intentar cambiar el rol después de crear el perfil | La API rechaza el cambio y conserva el rol original | Pendiente |
| A08 | Activar texto grande y guardar preferencias | La preferencia persiste después de recargar y la interfaz aumenta el texto | Pendiente |
| A09 | Crear un medicamento con nombre, presentación, dosis prescrita y fechas ficticias | Se guarda solo con campos válidos y aparece en la lista del paciente correcto | Pendiente |
| A10 | Enviar medicamento sin nombre o sin dosis prescrita | La interfaz valida lo obligatorio y la API rechaza entradas inválidas | Pendiente |
| A11 | Crear horario con una hora inválida | No se guarda; la persona recibe un mensaje claro | Pendiente |
| A12 | Crear horario con varios días de semana | Solo se generan eventos para los días seleccionados | Pendiente |
| A13 | Configurar fecha final anterior a la inicial | La interfaz o API impide guardar la pauta | Pendiente |
| A14 | Ver un evento alrededor del cambio de día UTC en Pasto | La fecha y la hora mostradas corresponden a `America/Bogota` | Pendiente |
| A15 | Consultar repetidamente la misma programación | No aparecen eventos duplicados para el mismo horario y fecha | Pendiente |
| A16 | Confirmar explícitamente un evento como tomado | El historial registra el estado y la hora del reporte | Pendiente |
| A17 | Marcar explícitamente un evento como no tomado | El historial muestra la omisión informada, sin modificar otras tomas | Pendiente |
| A18 | Dejar pasar un evento sin responder | El sistema no lo convierte en omisión confirmada | Pendiente |
| A19 | Filtrar el historial por estado y fechas | Solo aparecen eventos que cumplen los filtros elegidos | Pendiente |
| A20 | Desactivar un medicamento | Deja de generar eventos futuros y conserva su historial existente | Pendiente |
| A21 | Paciente crea código de invitación | Se genera un código temporal y el paciente puede compartirlo | Pendiente |
| A22 | Cuidador canjea código inválido o vencido | La API rechaza la solicitud sin conceder acceso | Pendiente |
| A23 | Cuidador canjea un código válido | La solicitud queda pendiente de aprobación del paciente | Pendiente |
| A24 | Cuidador intenta leer datos antes de aprobación | La API deniega el acceso aunque el cliente envíe un `patientId` | Pendiente |
| A25 | Paciente aprueba una solicitud | El cuidador autorizado puede consultar únicamente ese perfil | Pendiente |
| A26 | Paciente revoca una autorización activa | Las siguientes solicitudes del cuidador se deniegan de inmediato | Pendiente |
| A27 | Registrar un evento descargado desde la Website sin conexión | El evento queda en la cola del navegador y aparece la opción para sincronizarlo | Pendiente |
| A28 | Volver a enviar la misma cola de eventos | La API procesa de forma idempotente y el navegador solo elimina la cola tras una respuesta exitosa | Pendiente |

## Criterios de aceptación del piloto

1. Ejecutar A01–A28 en desarrollo con al menos dos cuentas ficticias separadas (paciente y cuidador).
2. Repetir los casos críticos A04, A14–A18 y A24–A28 después de cualquier cambio de autorización, fechas o sincronización.
4. Guardar incidencias y resultados sin nombres, correos, códigos ni identificadores de pacientes reales.
5. Solicitar revisión de accesibilidad y pruebas moderadas con representantes del público objetivo, con consentimiento y protocolo aprobado.

La ejecución pendiente de esta matriz no debe presentarse como validación completada ni como evidencia de TRL 5.
