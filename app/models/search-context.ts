import { set } from '@ember/object';
import { computed } from '@ember-decorators/object';

interface RawModifier {
  hint: string;
  modifier: string;
  title: string;
  values: Hint[];
}

export default class SearchContext {
  modifiers: RawModifier[] = [];
  scope: string = '';

  @computed('scope')
  get queryScope(): string { return this.scope; }

  @computed('modifiers.[]')
  public get config(): ConfigMap {
    let config: ConfigMap = {};
    this.modifiers.forEach(({ modifier, hint, title, values }) => {
      if (modifier !== '#') { modifier = `${modifier}:`; }
      config[modifier] = {
        content: values,
        defaultHint: hint,
        sectionTitle: title,
        type: 'list'
      };
    });
    return config;
  }

  constructor(scope: string, modifiers: RawModifier[]) {
    set(this, 'scope', scope);
    set(this, 'modifiers', modifiers);
  }
}
