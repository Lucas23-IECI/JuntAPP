-- Seed File for local development
-- password for all users: password123
-- Hash: $2a$10$yFfJ3NpeNlEuxmK2DkC/lO0zXpG5p1Y.hP6j24dK4f9FfGjH69g.a

-- 1. Seed Auth Users
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, created_at, updated_at, last_sign_in_at)
VALUES 
('d5089e9f-9694-4d87-8d26-384196c80001', '00000000-0000-0000-0000-000000000000', 'admin@juntapp.cl', '$2a$10$yFfJ3NpeNlEuxmK2DkC/lO0zXpG5p1Y.hP6j24dK4f9FfGjH69g.a', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Vecina Presidenta (Admin)","rut":"12.345.678-9","address":"Pasaje Los Aromos 110"}', false, 'authenticated', NOW(), NOW(), NOW()),
('d5089e9f-9694-4d87-8d26-384196c80002', '00000000-0000-0000-0000-000000000000', 'luis.munoz@correo.cl', '$2a$10$yFfJ3NpeNlEuxmK2DkC/lO0zXpG5p1Y.hP6j24dK4f9FfGjH69g.a', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Luis Humberto Muñoz Henríquez","rut":"8.122.904-7","address":"Calle Principal 1024","phone":"+56 9 5432 1098"}', false, 'authenticated', NOW(), NOW(), NOW()),
('d5089e9f-9694-4d87-8d26-384196c80003', '00000000-0000-0000-0000-000000000000', 'maria.ramirez@correo.cl', '$2a$10$yFfJ3NpeNlEuxmK2DkC/lO0zXpG5p1Y.hP6j24dK4f9FfGjH69g.a', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"María José Ramírez Valdés","rut":"14.341.203-K","address":"Pasaje Los Aromos 345","phone":"+56 9 8765 4321"}', false, 'authenticated', NOW(), NOW(), NOW()),
('d5089e9f-9694-4d87-8d26-384196c80004', '00000000-0000-0000-0000-000000000000', 'pedro.soto@correo.cl', '$2a$10$yFfJ3NpeNlEuxmK2DkC/lO0zXpG5p1Y.hP6j24dK4f9FfGjH69g.a', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Pedro Ignacio Soto Contreras","rut":"9.403.220-4","address":"Avenida Los Girasoles 120","phone":"+56 9 7654 3210"}', false, 'authenticated', NOW(), NOW(), NOW());

-- 2. Adjust Profiles status that might differ from trigger defaults
UPDATE public.profiles
SET role = 'dirigente', cuota_status = 'al_dia'
WHERE id = 'd5089e9f-9694-4d87-8d26-384196c80001';

UPDATE public.profiles
SET cuota_status = 'al_dia'
WHERE id = 'd5089e9f-9694-4d87-8d26-384196c80003';

UPDATE public.profiles
SET cuota_status = 'al_dia'
WHERE id = 'd5089e9f-9694-4d87-8d26-384196c80004';

-- 3. Seed Transactions
INSERT INTO public.transactions (type, description, amount, date, created_by)
VALUES 
('ingreso', 'Subsidio Municipal FONDEVE 2025', 300000.00, '2026-05-02', 'd5089e9f-9694-4d87-8d26-384196c80001'),
('egreso', 'Compra de ampolletas LED para plaza', 15000.00, '2026-05-05', 'd5089e9f-9694-4d87-8d26-384196c80001'),
('egreso', 'Cerradura nueva y copias llaves sede social', 25000.00, '2026-05-10', 'd5089e9f-9694-4d87-8d26-384196c80001'),
('ingreso', 'Aporte extraordinario bingo municipal', 120000.00, '2026-05-12', 'd5089e9f-9694-4d87-8d26-384196c80001'),
('egreso', 'Servicio de limpieza y desmalezado de jardines', 25000.00, '2026-05-20', 'd5089e9f-9694-4d87-8d26-384196c80001'),
('ingreso', 'Recaudación cuotas sociales del mes', 65500.00, '2026-05-25', 'd5089e9f-9694-4d87-8d26-384196c80001');

-- 4. Seed Polls
INSERT INTO public.polls (id, title, description, active, options)
VALUES 
('poll-fondeve-2026', 'Consulta: Prioridad de Inversión FONDEVE 2026', 'Este año postularemos al Fondo de Desarrollo Vecinal municipal (FONDEVE). ¿Cuál de las propuestas considera prioritaria?', true, '[{"id": "opt-1", "text": "Cámaras de Seguridad Vecinal HD"}, {"id": "opt-2", "text": "Repavimentación de pasajes interiores"}, {"id": "opt-3", "text": "Luminarias LED ornamentales para la plaza"}]'::jsonb);

-- 5. Seed Votes
INSERT INTO public.votes (user_id, poll_id, option_id)
VALUES 
('d5089e9f-9694-4d87-8d26-384196c80003', 'poll-fondeve-2026', 'opt-1'),
('d5089e9f-9694-4d87-8d26-384196c80004', 'poll-fondeve-2026', 'opt-3');

-- 6. Seed Announcements
INSERT INTO public.announcements (category, title, content, date, author)
VALUES 
('urgente', 'Corte de agua programado', 'Estimados vecinos: Esval informa que se realizará un corte de agua programado para todo el sector de Villa Los Jardines mañana Jueves entre las 14:00 y las 18:00 hrs por mantención en la matriz de calle principal.', '2026-05-28', 'Directiva JuntAPP'),
('asamblea', 'Reunión Ordinaria Mensual de Coordinación', 'Citamos a todos los socios a nuestra asamblea mensual presencial en la Sede Comunitaria el día Sábado 14 de Junio a las 18:00 hrs. Rendición financiera de Mayo y postulación FONDEVE.', '2026-05-25', 'Directiva JuntAPP'),
('beneficio', 'Taller Gratuito: Alfabetización Digital para Adultos Mayores', 'Nos alegra informar que nos hemos adjudicado un taller municipal para enseñar el uso de smartphones, BancoEstado y JuntAPP. Clases inician el 2 de Junio.', '2026-05-20', 'Comisión Social');

-- 7. Seed Notifications
INSERT INTO public.notifications (user_id, type, title, message, read, action, target_socio_id)
VALUES 
('d5089e9f-9694-4d87-8d26-384196c80002', 'cuota', 'Cobro de Cuota Pendiente', 'Estimado Luis, tu cuota de Mayo ($5.000) está disponible para pago electrónico seguro.', false, 'pay-cuota', 4),
('d5089e9f-9694-4d87-8d26-384196c80002', 'asamblea', 'Asamblea Mensual', 'Convocatoria ordinaria: Reunión el Sábado 14 de Junio a las 18:00 hrs.', false, NULL, NULL);
