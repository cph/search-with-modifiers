
import Ember from 'ember';

declare global {
  interface Array<T> extends Ember.ArrayPrototypeExtensions<T> {}
  // interface Function extends Ember.FunctionPrototypeExtensions {}

  interface Modifier {
    fullText?: boolean;
    label?: string;
    modifier?: boolean;
    searchOnEnter?: boolean;
    section?: string;
    value: string;
  }

  type Hint = string | Modifier;

  interface HintList {
    section: string;
    list: Hint[];
  }

  interface SearchContextConfig {
    content: Hint[];
    defaultHint?: string;
    unlisted?: boolean;
    sectionTitle?: string;
    type: string;
  }

  interface ConfigMap {
    [index: string]: SearchContextConfig;
  }

  type ActionParam = (...args: any[]) => any;
}

export {};

