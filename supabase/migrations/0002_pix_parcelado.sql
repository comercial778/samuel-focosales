-- Adiciona a forma de pagamento "Pix Parcelado" (comissão de 6%, igual ao Cartão)
alter table public.sales
  drop constraint if exists sales_payment_method_check;

alter table public.sales
  add constraint sales_payment_method_check
  check (payment_method in ('PIX', 'Pix Parcelado', 'Cartão'));
