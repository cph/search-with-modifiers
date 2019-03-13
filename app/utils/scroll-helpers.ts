// cf. https://developer.mozilla.org/en-US/docs/Web/API/Element/closest#Polyfill
if (!Element.prototype.matches) {
  Element.prototype.matches = (Element.prototype as any).msMatchesSelector || Element.prototype.webkitMatchesSelector;
}

if (!Element.prototype.closest) {
  Element.prototype.closest = function(s: string) {
    let el = this;
    do {
      if (el.matches(s)) { return el; }
      el = (el.parentElement || el.parentNode) as Element;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}

export function scrollIntoView(el: HTMLElement) {
  const scrollParent = el.closest('.scrollable') as HTMLElement;
  if (!scrollParent) { return; }
  const scrollTop = scrollParent.scrollTop;

  // elTop is the distance between the top edge of the node
  // and the top edge of its scroll container.
  const elTop = el.offsetTop + scrollTop - scrollParent.offsetTop;
  const elHeight = el.offsetHeight;

  // [minOffset, maxOffset] describe the range of offsets which are currently
  // scrolled into view.
  //
  // If the element's offset is between these values, it is entirely visible,
  // and we should not scroll to it.
  const minOffset = scrollTop;
  const maxOffset = scrollTop + scrollParent.offsetHeight - elHeight;

  // Scroll up or down just enough to reveal the element.
  let scrollDelta = 0;
  if (elTop < minOffset) {
    scrollDelta = elTop - minOffset;
  } else if (elTop > maxOffset) {
    scrollDelta = elTop - maxOffset;
  }

  if (scrollDelta !== 0) { scrollParent.scrollTo(scrollParent.scrollLeft, scrollTop + scrollDelta); }
}

export function scrollToTop(el: HTMLElement) {
  const scrollParent = el.closest('.scrollable') as HTMLElement;
  if (scrollParent) { scrollParent.scrollTo(scrollParent.scrollLeft, 0); }
}

export function scrollToBottom(el: HTMLElement) {
  const scrollParent = el.closest('.scrollable');
  if (scrollParent) { scrollParent.scrollTo(scrollParent.scrollLeft, scrollParent.scrollHeight); }
}
