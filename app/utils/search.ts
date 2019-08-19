import unaccent from './unaccent';

const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
function escapeForRegExp(input: string): string {
  return input.replace(matchOperatorsRe, '\\$&');
}

function deepClone<T extends object>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

function toWords(s: string): string[] {
  return s.split(/\s+/);
}

export function unquoted(value: string): string {
  return value.replace(/"/g, '');
}

export function normalized(value: string): string {
  return unquoted(unaccent(value)).replace(/^ */, '').toLocaleLowerCase();
}

export function getMatch(subString: string, list: Hint[], key?: 'value' | 'label'): Hint[] {
  const regex = new RegExp(`\\b${escapeForRegExp(normalized(subString))}`, 'i');
  return list.filter(function(value: Hint) {
    if (key) { value = (value as Modifier)[key] || ''; }
    if (!value) { return false; }
    value = value as string;
    return subString.length < value.length && regex.test(normalized(value));
  });
}

export function getDefaultContent(configMap: ConfigMap, modifiersList: Modifier[]): Hint[] {
  let allList: Modifier[] = [];
  let mapContent = function(item: Hint): Modifier {
    if (typeof item === 'string') { item = { value: item }; }
    if (toWords(item.value).length > 1) { item.value = `"${item.value}"`; }
    return item;
  };

  for (let key in configMap) {
    if (configMap.hasOwnProperty(key)) { // Required by tslint
      let config = configMap[key];
      if (config.type === 'list' && config.content) {
        config.content = config.content.map(mapContent);
        let list = config.content.map(function(item: Modifier): Modifier {
          let compositeValue = item.value;
          compositeValue = key === '#' ? `#${compositeValue}` : `${key} ${compositeValue}`;
          return {
            fullText: true,
            label: item.label,
            section: config.sectionTitle,
            value: compositeValue
          };
        });
        allList = allList.concat(list);
      }
    }
  }
  const modifiers = modifiersList.map(function(item: Modifier) {
    item.section = 'Narrow your Search';
    return item;
  });
  return modifiers.concat(allList);
}

export function getAllModifiers(configMap: ConfigMap, onlyVisible: boolean=false): Modifier[] {
  let modifiers: Modifier[] = [];
  for (let key in configMap) {
    if (configMap.hasOwnProperty(key)) {
      const config = configMap[key];
      if (onlyVisible && config.unlisted) { continue; }
      const section = config.type === 'date' ? 'time' : 'others';
      modifiers.push({
        label: config.defaultHint,
        modifier: true,
        section,
        value: key
      });
    }
  }
  return modifiers;
}

export function prepareConfig(configMap: ConfigMap): ConfigMap {
  configMap = deepClone(configMap);
  configMap['+'] = { type: 'modifier-list', content: getAllModifiers(configMap, true) };
  configMap._default = {
    content: getDefaultContent(configMap, getAllModifiers(configMap)),
    type: 'default'
  };
  return configMap;
}

// Making node any allows us to test for nonstandard methods (IE) that we
// might need to use and are not part of the typing.
export function setCursor(node: any, pos: number): boolean {
  if (node) {
    if (node.createTextRange) {
      let textRange = node.createTextRange();
      textRange.collapse(true);
      textRange.moveEnd('character', pos);
      textRange.moveStart('character', pos);
      textRange.select();

      // This forces the browser to scroll to the cursor
      node.blur();
      node.focus();
      return true;
    } else if (node.setSelectionRange) {
      node.setSelectionRange(pos, pos);

      // This forces the browser to scroll to the cursor
      node.blur();
      node.focus();
      return true;
    }
  }
  return false;
}
