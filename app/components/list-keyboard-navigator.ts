import Component from '@ember/component';
import { next } from '@ember/runloop';
import { action, computed } from '@ember/object';
import { attribute, classNames } from '@ember-decorators/component';
import { observes } from '@ember-decorators/object';
import KEY from 'search-with-modifiers/utils/keycodes';
import { scrollIntoView, scrollToBottom, scrollToTop } from 'search-with-modifiers/utils/scroll-helpers';

@classNames('list-keyboard-navigator')
export default class ListKeyboardNavigator extends Component {
  @attribute('tabindex') tabIndex: number = 0;
  itemSelector: string = 'li';
  selectedItem: object | null = null;
  highlightFromSelection: boolean = false;
  selectImmediately: boolean = false;
  items: object[] = [];
  highlightedItemIndex: number = -1;
  highlightedBy: string | null = null;

  onItemSelected: ActionParam | null = null;
  onTyping: ActionParam | null = null;
  onHitBottom: ActionParam | null = null;
  onHitTop: ActionParam | null = null;
  onChangedFocus: ActionParam | null = null;
  onItemHighlighted: ActionParam | null = null;

  __focused: boolean = false;

  get focused() { return this.__focused; }
  set focused(newValue: boolean) {
    this.__focused = newValue;
    if (this.onChangedFocus) { this.onChangedFocus(newValue); }

    if (!newValue) { return; }
    // Safari will scroll to the top of the div and cancel any click events if
    // we focus on the keyboard navigator when it or a child is already in focus
    const rootEl = (this.element as HTMLElement);
    if (rootEl === null) { return; }
    const alreadyFocused = rootEl === document.activeElement || rootEl.contains(document.activeElement);
    if (!alreadyFocused) {
      rootEl.focus();
      // Simulating a keypress is hard. Can we just call downPressed?
      this.downPressed();
    }
  }

  @computed('selectImmediately')
  get highlightOnMouseOver(): boolean {
    return !this.selectImmediately;
  };

  @computed('highlightedItemIndex', 'highlightFromSelection', 'selectedItemIndex')
  get highlightedIndex(): number {
    const index = this.highlightedItemIndex;
    if (!this.highlightFromSelection) { return index; }
    return index < 0 ? this.selectedItemIndex : index;
  }

  @computed('highlightedIndex', 'items.[]')
  get highlightedItem(): object | null {
    let index = this.highlightedIndex;
    if (index < 0 || this.items.length === 0) { return null; }
    if (index >= this.items.length) { index = index % this.items.length; }
    return this.items[index];
  }

  @computed('selectedItem', 'items.[]')
  get selectedItemIndex(): number {
    let index = -1;
    if (this.selectedItem) { index = this.items.indexOf(this.selectedItem); }
    this.updateHighlightIndex(index, null, true);
    return index;
  }

  private mouseOverHandler: ActionParam;
  private mouseLeaveHandler: ActionParam;
  private keyDownHandler: ActionParam;

  constructor() {
    super(...arguments)
    this.mouseOverHandler = this.onMouseOverItem.bind(this);
    this.mouseLeaveHandler = this.onMouseLeave.bind(this);
    this.keyDownHandler = this.onKeyDown.bind(this);
  }

  didInsertElement() {
    super.didInsertElement();
    this.reset();
    (this.element as HTMLElement).addEventListener('mouseover', this.mouseOverHandler);
    (this.element as HTMLElement).addEventListener('mouseleave', this.mouseLeaveHandler);
    (this.element as HTMLElement).addEventListener('keydown', this.keyDownHandler);
  }

  willDestroyElement() {
    (this.element as HTMLElement).removeEventListener('mouseover', this.mouseOverHandler);
    (this.element as HTMLElement).removeEventListener('mouseleave', this.mouseLeaveHandler);
    (this.element as HTMLElement).removeEventListener('keydown', this.keyDownHandler);
    super.willDestroyElement();
  }

  select() {
    const item = this.highlightedItem;
    if (item && this.onItemSelected) { this.onItemSelected(item); }
  }

  @action
  onMouseOverItem(e: MouseEvent) {
    if (!this.highlightOnMouseOver) { return; }
    const target = e.target as HTMLElement;
    const item = target.closest(this.itemSelector);
    const items = this.findAll(this.itemSelector);
    let index = Array.from(items).indexOf(item as Node);
    this.updateHighlightIndex(index, 'mouse');
  }

  @action
  onMouseLeave(_e: MouseEvent) {
    if (!this.highlightOnMouseOver) { return; }
    this.updateHighlightIndex(-1, 'mouse');
  }

  @action
  onKeyDown(e: KeyboardEvent) {
    const { altKey, ctrlKey, metaKey, shiftKey, keyCode } = e;
    if (altKey || ctrlKey || metaKey || shiftKey) { return; }
    if (e.defaultPrevented) { return; }

    if (keyCode >= KEY.ZERO && keyCode <= KEY.Z ||
        keyCode >= KEY.NUMPAD_ZERO && keyCode <= KEY.NUMPAD_NINE ||
        keyCode === KEY.BACKSPACE) {
      if (this.onTyping) { this.onTyping(); }
    }

    switch (keyCode) {
      case KEY.DOWN:
        e.preventDefault();
        this.downPressed();
        break;
      case KEY.UP:
        e.preventDefault();
        this.upPressed();
        break;
      case KEY.ENTER:
        if (this.highlightedBy !== 'keyboard') { break; }
        if (this.highlightedItem && this.highlightedItem !== this.selectedItem) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.enterPressed();
        }
        break;
    }
  }

  find(selector: string): HTMLElement {
    return (this.element as Element).querySelector(selector) as HTMLElement;
  }

  findAll(selector: string): NodeList {
    return (this.element as Element).querySelectorAll(selector);
  }

  @observes('items.[]')
  reset() {
    this.resetHighlight();
    next(this, () => { this.scrollToSelectedItem(); });
  }

  @action
  downPressed() {
    const itemsLength = this.items.length;
    if (this.highlightedIndex === itemsLength - 1) {
      if (this.onHitBottom) { this.onHitBottom(); }
      return;
    }
    if (itemsLength === 0) { return; }
    const index = Math.min(this.highlightedIndex + 1, itemsLength - 1);
    this.updateHighlightIndex(index, 'keyboard');
  }

  @action
  upPressed() {
    if (this.highlightedIndex <= 0) {
      if (this.onHitTop) {
        this.updateHighlightIndex(-1, 'keyboard');
        this.onHitTop();
      }
      return;
    }
    if (this.items.length === 0) { return; }
    const index = Math.max(0, this.highlightedIndex - 1);
    this.updateHighlightIndex(index, 'keyboard');
  }

  @action
  enterPressed() {
    this.select();
  }

  scrollToHighlightedItem() {
    if (this.highlightedBy === 'mouse') { return; }
    if (this.highlightedIndex < 0) { return; }

    const el = this.find(`${this.itemSelector}:nth-of-type(${this.highlightedIndex + 1})`);
    if (!el) { return; }
    if (this.highlightedIndex === 0) {
      scrollToTop(el);
    } else if (this.highlightedIndex === (this.items.length - 1)) {
      scrollToBottom(el);
    } else {
      scrollIntoView(el);
    }
  }

  scrollToSelectedItem() {
    const index = this.selectedItemIndex;
    if (index < 0) { return; }
    const el = this.find(`${this.itemSelector}:nth-of-type(${index + 1})`);
    if (el) { scrollIntoView(el); }
  }

  resetHighlight() {
    this.updateHighlightIndex(-1);
  }

  private updateHighlightIndex(index: number, highlightedBy: string | null = null, ignoreSelectImmediately: boolean = false) {
    if (this.highlightedItemIndex === index) { return; }
    this.set('highlightedBy', highlightedBy || null);
    this.set('highlightedItemIndex', index);
    if (this.onItemHighlighted) { this.onItemHighlighted(this.highlightedItem); }
    if (!ignoreSelectImmediately && this.selectImmediately) { this.select(); }
    next(this, () => { this.scrollToHighlightedItem(); });
  }
};
