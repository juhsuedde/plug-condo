-- Demo seed data - ONLY RUN IN DEVELOPMENT
-- Run with: psql -h <host> -U postgres -d postgres -f seed-demo.sql

-- Demo condominium
INSERT INTO public.condominios (id, nome, endereco, cnpj, qtd_unidades, preco_kwh, taxa_uso)
VALUES ('11111111-1111-1111-1111-111111111111', 'Edifício Vista Verde', 'Av. Paulista, 1500 - São Paulo, SP', '12.345.678/0001-90', 48, 0.95, 5.00)
ON CONFLICT DO NOTHING;

-- Demo chargers
INSERT INTO public.carregadores (condominio_id, nome, localizacao, potencia_kw, status) VALUES
('11111111-1111-1111-1111-111111111111', 'Carregador A1', 'Garagem -1, Vaga 12', 7.4, 'disponivel'),
('11111111-1111-1111-1111-111111111111', 'Carregador A2', 'Garagem -1, Vaga 13', 7.4, 'ocupado'),
('11111111-1111-1111-1111-111111111111', 'Carregador B1', 'Garagem -2, Vaga 28', 11.0, 'disponivel'),
('11111111-1111-1111-1111-111111111111', 'Carregador B2', 'Garagem -2, Vaga 29', 22.0, 'manutencao')
ON CONFLICT DO NOTHING;