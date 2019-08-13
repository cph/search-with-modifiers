import { computed, set } from '@ember/object';
import Eventable from './eventable';
import ListSource from './list-source';
import { normalized, unquoted } from 'search-with-modifiers/utils/search';

export default class Token extends Eventable {
  modifier: string = '';
  value: string = '';
  configMap: ConfigMap | null = {};

  @computed('modifier', 'configMap')
  get config(): SearchContextConfig | null {
    if (this.modifier && this.configMap) {
      return this.configMap[this.modifier.toLowerCase()];
    } else if (this.configMap && this.value && this.value !== ' ') {
      return this.configMap._default;
    }
    return null;
  }

  @computed('config')
  get type(): string {
    return (this.config && this.config.type) || 'space';
  }

  @computed('config')
  get sectionTitle(): string {
    if (!this.config) { return ''; }
    return this.config.sectionTitle || '';
  }

  @computed('config')
  get content(): Hint[] {
    if (!this.config) { return []; }
    return this.config.content || [];
  }

  @computed('modifier', 'value')
  get fullText(): string {
    return `${this.modifier}${this.value}`;
  }

  set fullText(value) {
    const configs = this.configMap;
    if (configs) {
      let modifier: string = '';
      if (value.substr(0, 1) === '+') {
        modifier = '+';
      } else {
        for (let k in configs) {
          if (value.substr(0, k.length) === k) {
            modifier = k;
            break;
          }
        }
      }
      if (modifier) {
        value = value.substr(modifier.length);
        set(this, 'modifier', modifier);
        set(this, 'value', value);
      } else if (value) {
        set(this, 'value', value);
      }
    }
  }

  @computed('fullText')
  get length(): number {
    return this.fullText.length;
  };

  @computed('normalizedValue', 'hints.[]')
  get firstHint(): Hint {
    let value = this.normalizedValue;
    return this.hints.find((hint) => {
      return value.length === 0 || normalized(ListSource.serialize(hint)).indexOf(value) === 0;
    }) || '';
  }

  @computed('isValueValid', 'value', 'firstHint')
  get subHint(): string | null {
    if (this.isValueValid && this.value.match(/"$/)) { return null; }
    const value = this.value.toLocaleLowerCase();
    if (value.length === 0) { return null; }
    const firstHint = this.firstHint;
    if (firstHint === undefined) { return null; }
    const hint: string = typeof firstHint === 'string' ? firstHint : ListSource.serialize(firstHint);
    if (normalized(hint).indexOf(normalized(value)) === 0) {
      return unquoted(hint).substr(normalized(value).length);
    }
    return null;
  }

  @computed('value', 'subHint', 'config.defaultHint')
  get hint(): string | null {
    if (this.value.length > 0) { return this.subHint; }
    if (!this.config) { return null; }
    return this.config.defaultHint || null;
  }

  @computed('value', 'content')
  get hints(): Hint[] {
    const content = this.content;
    return content ? ListSource.getHints(this.value, content) : [];
  }

  @computed('isValueValid', 'normalizedValue', 'content')
  get model(): Hint | null {
    if (this.isValueValid) {
      return ListSource.deserialize(this.normalizedValue, this.content);
    } else {
      return null;
    }
  }

  set model(newModel: Hint | null) {
    if (!newModel) { return; }
    const val = ListSource.serialize(newModel);
    if (typeof newModel === 'string') {
      set(this, 'value', val);
      this.trigger('modelAssigned');
      return;
    }
    newModel = newModel as Modifier;
    if (newModel.fullText || newModel.modifier) {
      set(this, 'fullText', val);
    } else {
      set(this, 'value', val);
    }
    this.trigger('modelAssigned');
  }

  @computed('value')
  get normalizedValue(): string {
    return normalized(this.value);
  }

  @computed('value', 'content')
  get isValueValid() {
    return ListSource.validate(this.value, this.content);
  }

  constructor(modifier: string, value: string, configMap: ConfigMap | null) {
    super();
    set(this, 'modifier', modifier);
    set(this, 'value', value);
    set(this, 'configMap', configMap);
  }

  autoComplete(): boolean {
    const hint = this.firstHint;
    const subHint = this.subHint;

    if (hint && subHint) {
      const hintValue = typeof hint === 'string' ? (hint as string) : (hint as Modifier).value;
      if (typeof hint !== 'string' && (hint as Modifier).modifier) {
        set(this, 'fullText', hintValue);
      } else {
        set(this, 'value', hintValue);
      }
      return true;
    }
    return false;
  }
}

export function tokenize(text: string, configMap: ConfigMap): Token[] {
  if (!text) { return []; }

  let tokens: Token[] = [];
  let value = '';
  let modifier = '';
  let mode = 'default';

  for (let i = 0; i <= text.length; i++) {
    let character = text[i];

    if (!character) {
      if (modifier !== '' || value.length > 0) {
        tokens.push(new Token(modifier, value, configMap));
      }
      return tokens;
    }

    switch (mode) {
      case 'default':
        if (character === '"') { mode = 'in-quote'; }

        if (modifier !== '') {
          if (character === ' ' && (/[^ ]/.test(value) || modifier === '#')) {
            tokens.push(new Token(modifier, value, configMap));
            modifier = '';
            value = '';
            mode = 'whitespace';
          }
          value += character;
        } else {
          if (character === ' ') {
            if (value.length > 0) {
              tokens.push(new Token(modifier, value, configMap));
              modifier = '';
              value = '';
            }
            mode = 'whitespace';
          }
          value += character;

          if (configMap[value.toLowerCase()] !== undefined) {
            modifier = value;
            value = '';
          }
        }
        break;

      case 'whitespace':
        if (character !== ' ') {
          if (modifier !== '' || value.length > 0) {
            tokens.push(new Token(modifier, value, configMap));
            modifier = '';
            value = '';
          }
          mode = 'default';
        }

        value += character;
        break;

      case 'in-quote':
        if (character === '"') { mode = 'default'; }
        value += character;
        break;
    }
  }

  // Should never get here
  return tokens;
}
