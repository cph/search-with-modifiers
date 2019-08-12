import Component from '@ember/component';
import { next } from '@ember/runloop';
import { action, computed } from '@ember/object';
import { classNames } from '@ember-decorators/component';
import Token, { tokenize } from 'search-with-modifiers/models/token';
import KEY from 'search-with-modifiers/utils/keycodes';
import { setCursor } from 'search-with-modifiers/utils/search';

const NAVIGATIONAL_KEYS = [
  KEY.UP,
  KEY.DOWN,
  KEY.LEFT,
  KEY.RIGHT,
  KEY.HOME,
  KEY.END
];

function generateSpaceToken(): Token {
  return new Token('', ' ', null);
}

let passiveEventSupport = false;
try {
  let options = { get passive() { return passiveEventSupport = true; } };
  window.addEventListener('test', options as any, options);
  window.removeEventListener('test', options as any, options as any);
} catch(err) {
  passiveEventSupport = false;
}

@classNames('search-box')
export default class SearchBox extends Component {
  cursorLocation: number = -1;
  maxLength: number = 250;
  tokenConfig: ConfigMap = {};

  onActiveTokenChanged: ActionParam | null = null;
  onSearchTriggered: ActionParam | null = null;
  onDownPressed: ActionParam | null = null;
  onEscPressed: ActionParam | null = null;
  onValueChanged: ActionParam | null = null;
  onClick: ActionParam | null = null;
  onFocus: ActionParam | null = null;
  onBlur: ActionParam | null = null;

  lastActiveToken: Token | null = null;

  __value: string = '';
  __internalValue: string = '';
  __focused: boolean = false;

  get value(): string { return this.__value; }
  set value(newValue: string) {
    this.__value = newValue;
    if (this._value === newValue) { return; }
    this.set('_value', this.value);

  }

  get _value(): string { return this.__internalValue; }
  set _value(newValue: string) {
    this.__internalValue = newValue;
    if (this.onValueChanged) { this.onValueChanged(newValue); }
    next(this, () => {
      this.set('cursorLocation', this.mainInput ? this.mainInput.selectionStart : 0);
      this.scrollBackgroundToMatchInput();
    });
  }

  get focused(): boolean { return this.__focused; }
  set focused(newValue: boolean) {
    this.__focused = newValue;
    if (this.focused && this.mainInput) { this.mainInput.focus(); }
  }

  @computed('_value', 'tokenConfig')
  get tokens(): Token[] {
    return tokenize(this._value, this.tokenConfig);
  }

  @computed('cursorLocation', 'tokens.[]')
  get activeTokenIndex(): number {
    const cursorLocation = this.cursorLocation;
    let sumIndex: number = 0;
    let startIndex: number;
    let endIndex: number;
    let token: Token;
    const tokens = this.tokens;
    const tokensLength = tokens.length;
    for (let i = 0; i < tokensLength; i++) {
      token = tokens[i];
      startIndex = sumIndex;
      endIndex = token.length + startIndex;
      sumIndex = endIndex;
      if (startIndex < cursorLocation && cursorLocation <= endIndex) { return i; }
    }
    return -1;
  }

  @computed('activeTokenIndex', 'tokens.[]')
  get activeToken(): Token | null {
    const activeTokenIndex = this.activeTokenIndex;
    const tokens = this.tokens;
    let activeToken = null;
    if (activeTokenIndex > -1) {
      activeToken = tokens[activeTokenIndex];
    } else if (tokens.length === 0 && this.cursorLocation === 0) {
      activeToken = new Token('+', '', this.tokenConfig);
    }
    if (this.lastActiveToken !== activeToken) {
      if (this.lastActiveToken) { this.lastActiveToken.off('modelAssigned'); }
      if (activeToken) { activeToken.on('modelAssigned', this.updateInputAfterChangingTokenModel.bind(this)); }
      if (this.onActiveTokenChanged) { this.onActiveTokenChanged(activeToken); }
      this.set('lastActiveToken', activeToken);
    }

    return activeToken;
  }

  @computed('isLastTokenSelected', 'activeToken')
  get hintValue(): string | null {
    if (this.isLastTokenSelected) { return this.activeToken && this.activeToken.hint; }
    return null;
  }

  @computed('activeTokenIndex', 'tokens.[]')
  get isLastTokenSelected(): boolean {
    let tokensCount = this.tokens.length;
    return (tokensCount - 1) === this.activeTokenIndex;
  }

  @computed('_value')
  get isCursorAtEndOfInput(): boolean {
    return this.cursorLocation === this._value.length;
  }

  @computed('tokens.@each.fullText', 'hintValue')
  get backgroundText(): string {
    let text: string[] = [];
    this.tokens.forEach((token) => {
      const fullText = token.fullText;
      if (['default', 'modifier-list', 'space'].indexOf(token.type) >= 0) {
        text.push(fullText);
      } else if (token.isValueValid) {
        text.push(`<span class="search-box-hint">${fullText}</span>`);
      } else {
        text.push(`<span class="search-box-hint incomplete">${fullText}</span>`);
      }
    });
    text.push(`<span class="search-box-hint-value">${this.hintValue || ''}</span>`);
    return text.join('');
  }

  private mainInput: HTMLTextAreaElement | null = null;
  private background: Element | null = null;

  init() {
    super.init();
    this.__internalValue = this.value;
  }

  didInsertElement() {
    const searchBox = this.element;
    this.mainInput = searchBox.querySelector('.search-box-input');
    this.background = searchBox.querySelector('.search-box-hints');
    if (this.mainInput) {
      let mainInput = this.mainInput;
      mainInput.addEventListener('mousewheel', this.onMouseScroll, passiveEventSupport ? { passive: true } : false);
      mainInput.addEventListener('DOMMouseScroll', this.onMouseScroll);
      if (this.focused) {
        next(this, () => {
          mainInput.focus();
        });
      }
    }
  }

  willDestroy() {
    if (this.mainInput) {
      this.mainInput.removeEventListener('mousewheel', this.onMouseScroll);
      this.mainInput.removeEventListener('DOMMouseScroll', this.onMouseScroll);
    }
  }

  @action
  onMouseScroll() {
    this.scrollBackgroundToMatchInput();
  }

  @action
  onKeyDown(_input: string, e: KeyboardEvent) {
    const keyCode = e.keyCode;

    if (keyCode === KEY.ENTER) {
      e.preventDefault();
      if (this.onSearchTriggered) { this.onSearchTriggered(); }
    }

    if (keyCode === KEY.DOWN) {
      e.preventDefault();
      if (this.onDownPressed) { this.onDownPressed(); }
    }

    if (keyCode === KEY.ESCAPE) {
      if (this.onEscPressed) { this.onEscPressed(); }
    }

    // There are a number of keypress scenarios that will cause an input
    // field to scroll when the text exceeds the width of the field:
    //
    //   1. Pressing Home or End
    //   2. Pressing Cmd+Right (Mac) or Ctrl+Right (PC)
    //   3. Pasting in text that's longer than the field
    //   4. Typing at the end of the field
    //   5. Pressing and holding the Left or Right keys
    //
    // In these events, we need to update the position of .search-box-hints
    // to match the input field.
    //
    //
    //
    // It would, in theory, be ideal to call `scrollBackgroundToMatchInput`
    // on the keyUp event because, on keyDown, browsers have not yet scrolled
    // and redrawn the input field in response to the event.
    //
    // However, there are a number of scenarios where this will not work:
    //
    //   1. On the Mac, 'keyUp' events for (e.g. arrow keys or V for paste)
    //      are suppressed while the Command key is pressed.
    //
    //   2. When the user presses and holds a key down, the 'keyDown'
    //      event is fired repeatedly, but 'keyUp' events are not.
    //
    // In both of these cases, Firefox will still raise the 'keyPress'
    // event but other browsers will not.
    //
    //
    //
    // For this reason, we have to rely on `keyDown` to get the background
    // position of the element right; but it will do no good to call
    // `scrollBackgroundToMatchInput` immediately.
    //
    // We set two timeouts for calling this method: one without a delay
    // because this works for most browsers and gives a snappier feeling
    // and one with a short delay because, when the first timeout is
    // called, 9 times out of 10, Firefox for Mac has not yet redrawn
    // the input field.

    window.setTimeout(() => { this.scrollBackgroundToMatchInput(); });
    window.setTimeout(() => { this.scrollBackgroundToMatchInput(); }, 50);

    if (keyCode === KEY.TAB || keyCode === KEY.RIGHT || keyCode === KEY.END) {
      if (this.isCursorAtEndOfInput) {
        const activeToken = this.activeToken;
        if (activeToken && activeToken.autoComplete()) {
          if (e.shiftKey) { return; } // Allow Shift+Tab to do its thing
          e.preventDefault();
          this.autocompleteOnTab(activeToken);
        }
      }
    }
  }

  @action
  onKeyUp(_input: string, e: KeyboardEvent) {
    const target = e.target as HTMLTextAreaElement;
    const keyCode = e.keyCode;
    if (NAVIGATIONAL_KEYS.indexOf(keyCode) > -1) {
      this.set('cursorLocation', target.selectionStart);
    }
  }

  @action
  updateInputAfterChangingTokenModel() {
    const token = this.activeToken;
    if (!token) { return; }

    const tokens = this.tokens;

    if (tokens.length === 0) { tokens.push(token); }

    const isLastTokenSelected = (tokens.length - 1) === this.activeTokenIndex;
    if (token.isValueValid && isLastTokenSelected) {
      tokens.push(generateSpaceToken());
    }
    const cursorLocation = this.getTokenEndCursorPos(token) + (!token.isValueValid ? 0 : 1);

    this.set('_value', this.tokensString);
    this.setCursor(cursorLocation);
  }

  setCursor(newLocation: number) {
    this.set('cursorLocation', newLocation);
    next(this, () => {
      if(this.mainInput) {
        this.mainInput.focus();
        setCursor(this.mainInput, newLocation);
      }
    });
  }

  scrollBackgroundToMatchInput() {
    if (this.background && this.mainInput) {
      this.background.scrollLeft = this.mainInput.scrollLeft;
    }
  }

  @action
  changeInternalValue(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.set('_value', target.value);
  }

  @action
  didClick(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.set('cursorLocation', target.selectionStart);
    this.scrollBackgroundToMatchInput();
    if (this.onClick) { this.onClick(); }
  }

  @action
  didPaste({ target }: Event) {
    next(this, function() {
      this.set('_value', (target as HTMLTextAreaElement).value);
    });
  }

  @action
  didCut({ target }: Event) {
    next(this, function() {
      this.set('_value', (target as HTMLTextAreaElement).value);
    });
  }

  @action
  didReceiveFocus() {
    this.set('focused', true);

    // HACK: Needs to be run on the next iteration of the loop thanks to IE.
    // If it doesn't, then IE registers selectionStart as the end of the
    // _placeholder_ text, leading to an inability to discern an activeToken
    // and handle the null state gracefully.
    next(this, () => { this.set('cursorLocation', this.mainInput && this.mainInput.selectionStart || 0); });
    if (this.onFocus) { this.onFocus(); }
  }

  @action
  didLoseFocus() {
    this.set('focused', false);

    // In Chrome (and Chrome only), when the input field loses focus,
    // Chrome scrolls the field all the way left. The other browsers
    // don't do this, but for Chrome's sake, we'll ensure that the
    // background span's position is synced with the input field's.
    next(this, () => { this.scrollBackgroundToMatchInput(); });
    if (this.onBlur) { this.onBlur(); }
  }

  private autocompleteOnTab(activeToken: Token) {
    const hasVal = !!activeToken.value;
    const tokens = this.tokens;
    let cursorLocation = this.getTokenEndCursorPos(activeToken);
    if (hasVal) {
      if (this.isLastTokenSelected) {
        tokens.push(generateSpaceToken());
      }
      cursorLocation += 1;
    }

    this.set('_value', this.tokensString);
    this.setCursor(cursorLocation);
  }

  private getTokenEndCursorPos(token: Token): number {
    let tokens = this.tokens;
    let sum = 0;
    for (let t of tokens) {
      sum += t.length;
      if (t === token) { break; }
    }
    return sum;
  }

  private get tokensString(): string {
    return this.tokens.reduce(function(sum: string, token: Token) {
      sum += token.fullText;
      return sum;
    }, '');
  }
}
