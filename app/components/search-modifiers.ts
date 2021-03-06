import Component from '@ember/component';
import { action, computed } from '@ember/object';
import { classNames } from '@ember-decorators/component';
import { observes } from '@ember-decorators/object';

interface DisplayHint {
  category: string;
  index: number;
  label: string;
  modifier: boolean;
  position: number;
  value: string;
}

interface DisplayHintList {
  section: string;
  list: DisplayHint[];
}

@classNames('search-modifiers')
export default class SearchModifiers extends Component {
  focused: boolean = false;
  hintList: HintList[] = [];

  onSelect: ActionParam | null = null;
  onHighlightHint: ActionParam | null = null;

  __currentIndex: number = -1;

  get currentIndex(): number { return this.__currentIndex; }
  set currentIndex(newValue: number) {
    // Correct scroll
    this.__currentIndex = newValue;
    if (newValue === -1) { return; }
    const listItem = this.element.querySelector(`div.search-modifier:nth-of-type(${newValue + 1})`) as HTMLElement;
    const list = listItem.parentElement as HTMLElement;
    const scroll = list.scrollTop;
    const listHeight = list.scrollHeight;
    const itemHeight = listItem.scrollHeight;
    const top = listItem.offsetTop - scroll; // I think this is equal to jQuery's $(el).position().top
    const bottom = top + itemHeight;
    if (top < 0) {
      list.scrollTo(list.scrollLeft, Math.max(scroll + top - 8));
    } else if (listHeight < bottom) {
      list.scrollTo(list.scrollLeft, scroll + top - listHeight + itemHeight);
    }
  }

  @computed('hintList.[]')
  get list(): DisplayHintList[] {
    let index = -1;
    return (this.hintList || []).map((section: HintList) => {
      return {
        list: section.list.map((listItem: Modifier) => {
          index += 1;
          return {
            category: section.section,
            index,
            label: listItem.label || '',
            modifier: listItem.modifier || false,
            position: index,
            value: listItem.value
          };
        }),
        section: section.section
      };
    });
  }

  @computed('list.[]')
  get flatList(): DisplayHint[] {
    return this.list.reduce((list: DisplayHint[], item: DisplayHintList): DisplayHint[] => {
      return list.concat(item.list);
    }, []);
  }

  didInsertElement() {
    if (this.focused) {
      const keyboardNavigator = this.element.querySelector('.list-keyboard-navigator') as HTMLElement;
      if (keyboardNavigator) { keyboardNavigator.focus(); }
    }
  }

  @observes('hintList.[]')
  updateLists() {
    this.set('currentIndex', -1);
  }

  select() {
    if (this.currentIndex === -1) { return; }
    const item = this.flatList[this.currentIndex];
    if (this.onSelect) { this.onSelect(item); }
  }

  @action
  selectItem(index: number) {
    this.set('currentIndex', index);
    this.select();
  }

  @action
  didPressEnterOnNode(node: any) {
    this.set('currentIndex', node.index);
    this.select();
  }

  @action
  didHighlightNode(node: any) {
    if (!node) { return; }
    const hint = this.flatList[node.index];
    if (hint && this.onHighlightHint) { this.onHighlightHint(hint); }
  }

  @action
  didChangeFocus(focused: boolean) {
    this.set('focused', focused);
  }
};
