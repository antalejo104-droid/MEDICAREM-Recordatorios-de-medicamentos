# MEDICAREM — arquitectura y alcance del prototipo

**Estado:** prototipo funcional en desarrollo.  
**Población objetivo definida por el proyecto:** personas mayores de 60 años y sus cuidadores en Pasto, Colombia.

## Componentes

| Componente | Tecnología | Responsabilidad |
|---|---|---|
| Aplicación web | React, Vite, TypeScript | Acceso, perfil, medicamentos, historial y gestión de cuidadores |
| API | Express, TypeScript | Autenticación, validación, permisos, programación e historial |
| Persistencia | PostgreSQL, Drizzle ORM | Perfiles, medicamentos, horarios, eventos, autorizaciones y auditoría |
| Identidad | Clerk | Registro, inicio de sesión y sesión de usuario |

La configuración raíz de Vercel se mantiene conforme al requisito del proyecto. El build de Vite escribe en el directorio raíz `dist/public`, como espera `vercel.json`, y el fallback de Vite para `BASE_PATH` permite generar el build fuera del entorno de Replit.

## Flujo de datos

1. La persona se registra y crea un perfil con rol de paciente o cuidador y zona horaria.
2. El paciente registra el medicamento y la pauta que ya tiene prescrita. MEDICAREM no prescribe ni recomienda dosis.
3. La API genera eventos de horario y usa la zona horaria del perfil para fecharlos.
4. El paciente puede confirmar una toma o marcar explícitamente que no la tomó. La falta de confirmación queda como **sin confirmar**; no se convierte automáticamente en una omisión.
5. Un paciente puede crear un código para que un cuidador solicite acceso. El acceso solo se activa después de la aprobación del paciente y se puede revocar.

## Acceso y privacidad técnica

- Las rutas API requieren sesión autenticada y verifican permisos en el servidor; ocultar un control de interfaz no se considera autorización.
- Los cuidadores solo acceden a perfiles con autorización activa.
- La Website guarda en el navegador solo la cola de eventos pendientes: identificador del evento, estado e identificador idempotente. No conserva nombre, presentación, dosis ni notas del medicamento.
- Los datos del evento siguen siendo sensibles; el almacenamiento local del navegador no ofrece el mismo aislamiento que un almacén seguro del sistema operativo.
- El registro de auditoría no debe incluir dosis, notas ni otros datos clínicos innecesarios.

## Límites conocidos del prototipo

- Sin conexión, la Website puede poner en cola el registro de un evento descargado y la persona puede iniciar su sincronización cuando vuelve la conexión. No se pueden crear medicamentos ni pautas nuevas sin conexión.
- No se han ejecutado pruebas de aceptación con participantes ni en un entorno de producción.
- No se ha demostrado cumplimiento regulatorio ni una clasificación de dispositivo médico.
- Las preferencias de texto grande están disponibles; aún se requiere una evaluación formal de contraste, navegación asistida y comprensión con personas mayores.
- No se debe usar con datos clínicos reales hasta completar revisión de seguridad, privacidad, operación y consentimiento.

## Uso previsto y límites clínicos

MEDICAREM es una herramienta de organización y registro para apoyar conversaciones entre pacientes y cuidadores. No diagnostica, no recomienda tratamientos, no sustituye una prescripción, no confirma que un medicamento haya sido ingerido y no es un servicio de urgencias. Ante dudas sobre una pauta, la persona debe consultar al profesional tratante o al servicio de salud correspondiente.

## Validación de madurez

El prototipo todavía no tiene evidencia suficiente para afirmar TRL 5. La matriz de `PRUEBAS-MEDICAREM.md` separa las pruebas automatizadas ejecutadas de los escenarios que siguen pendientes. Para sostener una afirmación de TRL se necesitan pruebas representativas documentadas, retroalimentación de usuarios objetivo y evidencia de operación en el entorno previsto.
