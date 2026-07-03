
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_count INTEGER;
  novo_role app_role;
BEGIN
  INSERT INTO public.perfis (id, nome, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email);
  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'administrador';
  novo_role := CASE WHEN admin_count = 0 THEN 'administrador'::app_role ELSE 'funcionario'::app_role END;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, novo_role);
  RETURN NEW;
END; $$;
