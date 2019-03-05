import { getMatch, normalized } from 'search-with-modifiers/utils/search';

export default class ListSource {
  public static serialize(value: Hint): string {
    return (value && typeof value !== 'string') ? (value as Modifier).value : '';
  }

  public static deserialize(label: string, list?: Hint[]): Hint {
    if (!list) { return label; }
    return list.find((item) => item.hasOwnProperty('value') && (item as Modifier).value === label) || '';
  }

  public static validate(str: string, list?: Hint[]): boolean {
    return list ? list.some((item) => normalized(ListSource.serialize(item)) === normalized(str)) : !!str;
  }

  public static getHints(str: string, list?: Hint[]): Hint[] {
    if (list && list.length > 0) {
      const labelMatches = getMatch(str, list, 'label');
      const valueMatches = getMatch(str, list, 'value');

      const matches = labelMatches
        .concat(valueMatches)
        .filter((value: Hint, index: number, self: Hint[]) => {
          if (self.indexOf(value) !== index) { return false; }
          return typeof value !== 'string' && (value as Modifier).value !== str;
        });
      if (matches.length > 0) { return matches; }
    }
    return [];
  }
}
