export function sanitizeInput(input: string): string {
  if (!input) return input;
  
  // Substitui os caracteres usados em tags HTML por entidades HTML para evitar injeção de scripts (XSS).
  // Isso impede que <script> seja renderizado como tag pelo navegador ou interpretado de forma insegura.
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
