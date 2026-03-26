/**
 * Wrapper genérico para embeber las docs de Docsify en un iframe
 * dentro del layout de la app.
 *
 * Props:
 *   src  — URL del Docsify servido por el backend (ej: /docs/functional/)
 *   title — texto del atributo title del iframe (accesibilidad)
 */
export default function DocsPage({ src, title }) {
  return (
    <div className="-mx-4 -mt-4 lg:-mx-6 lg:-mt-6 overflow-hidden">
      <iframe
        src={src}
        title={title}
        className="w-full border-0 block"
        style={{ height: 'calc(100dvh - 3.5rem)' }}
        allow="same-origin"
      />
    </div>
  );
}
