/** A tiny SVG builder: escapes attributes and text so callers never concatenate markup by hand. */

class Raw {
  constructor(xml) {
    this.xml = xml;
  }
}

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escape = (text) => String(text).replace(/[&<>"]/g, (c) => ESCAPES[c]);

/** h("text", { x: 1, class: "a" }, "hello") -> Raw. Strings are escaped, Raw children are inserted as-is, null/false are skipped. */
export function h(tag, attrs = {}, ...children) {
  const attributes = Object.entries(attrs)
    .filter(([, value]) => value != null && value !== false)
    .map(([name, value]) => ` ${name}="${escape(value)}"`)
    .join("");
  const body = children
    .flat(Infinity)
    .filter((child) => child != null && child !== false)
    .map((child) => (child instanceof Raw ? child.xml : escape(child)))
    .join("");
  return new Raw(body ? `<${tag}${attributes}>${body}</${tag}>` : `<${tag}${attributes}/>`);
}

/** Text that must not be escaped (e.g. CSS inside <style>). */
export const raw = (xml) => new Raw(xml);

export const toString = (node) => node.xml;
