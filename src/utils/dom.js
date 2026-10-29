// Mini helper para crear elementos del DOM sin usar innerHTML con texto del usuario
// (los textos se insertan como nodos de texto, así que no hay riesgo de XSS).

/**
 * h('button', { class: 'btn', onClick: fn, disabled: true }, 'Texto', otroNodo)
 * - Las props que empiezan con "on" registran un listener (onClick -> "click").
 * - false / null / undefined se ignoran; true crea un atributo booleano.
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === false || value == null) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }

  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}
