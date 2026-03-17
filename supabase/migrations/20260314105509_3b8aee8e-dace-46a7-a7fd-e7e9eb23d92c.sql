
UPDATE dumpster_sizes SET price = 180.00, title = 'Pequenas Reformas', order_index = 1 WHERE id = '299bf98b-4fee-4516-a3e8-ddec2b784503';

INSERT INTO dumpster_sizes (size, title, description, price, order_index, active)
VALUES ('4m³', 'Reformas Médias', 'Para reformas de banheiro, cozinha e obras de médio porte.', 260.00, 2, true);

UPDATE dumpster_sizes SET price = 340.00, title = 'Reformas Residenciais', order_index = 3 WHERE id = 'd88e0721-2204-4935-97ea-2da59c5f965b';

UPDATE dumpster_sizes SET price = 460.00, title = 'Obras Grandes', order_index = 4 WHERE id = 'd7599a99-0690-4fb6-b303-46a64807dc17';

UPDATE dumpster_sizes SET price = 720.00, title = 'Grandes Projetos', order_index = 5 WHERE id = '09bcca7d-65af-48e0-962d-a703bff9d8e6';
