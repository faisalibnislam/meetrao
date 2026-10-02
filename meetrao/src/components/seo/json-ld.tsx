/**
 * One `<script type="application/ld+json">`.
 *
 * The escape is not decoration. JSON-LD sits inside a script element, where the
 * HTML parser is still looking for `</script`, and any string in the graph (a
 * FAQ answer, a meeting description) can contain one. Escaping `<` as `<`
 * keeps the JSON valid and the tag closed by us rather than by a visitor's copy.
 */
export function JsonLd({ json }: { json: string }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json.replace(/</g, "\\u003c") }}
    />
  );
}
