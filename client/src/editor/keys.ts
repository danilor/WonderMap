/** True when a key press belongs to a text box, a menu or an open dialog rather than to the map. */
export function isKeyCaptured(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable) {
    // Range sliders and checkboxes do not take text, so the editor shortcuts keep working after touching them.
    const type = (el as HTMLInputElement).type;
    return !(el.tagName === 'INPUT' && (type === 'range' || type === 'checkbox' || type === 'radio'));
  }
  return !!el.closest('.modal, .dropdown-menu');
}
