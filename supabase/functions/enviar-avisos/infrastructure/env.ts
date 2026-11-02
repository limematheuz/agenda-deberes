export const env = (nombre: string): string => {
  const v = Deno.env.get(nombre);
  if (!v) throw new Error(`Falta el secreto ${nombre}`);
  return v;
};
