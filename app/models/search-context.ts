import { computed, set } from '@ember/object';

interface RawModifier {
  unlisted?: boolean;
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
    this.modifiers.forEach((rawModifier) => {
      let { modifier, hint, title, values } = rawModifier;
      let unlisted = !!rawModifier.unlisted;
      if (modifier !== '#') { modifier = `${modifier}:`; }
      config[modifier] = {
        content: values,
        defaultHint: hint,
        unlisted,
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
