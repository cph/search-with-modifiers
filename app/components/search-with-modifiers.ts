import Component from '@ember/component';
import { set, action, computed } from '@ember/object';
import { next } from '@ember/runloop';
import { classNames } from '@ember-decorators/component';
import fetch from 'fetch';
import { prepareConfig } from 'search-with-modifiers/utils/search';
import SearchContext from 'search-with-modifiers/models/search-context';
import Token from 'search-with-modifiers/models/token';

interface SectionHintsMap {
  [key: string]: Hint[];
}

interface SampleQuery {
  query: string;
  label: string;
}

@classNames('search')
export default class SearchWithModifiers extends Component {
  activeToken: Token | null = null;
  query: string = '';
  cachedQuery: string | null = null;
  _lastQuery: string = '';
  configHash: any = null;
  limit: number = 32;
  inputFocused: boolean = true;
  hintsFocused: boolean = false;
  forceHidingSearchHelps: boolean = false;
  forceShowingSearchHelps: boolean = false;
  contextPath: string = '';
  searchPath: string = '';
  button: string | null = null;
  buttonClasses: string = '';

  @computed('cachedQuery', 'query')
  get _query(): string {
    return this.cachedQuery !== null ? this.cachedQuery : this.query || '';
  }

  @computed('_lastQuery', '_query')
  get dirtySearch(): boolean {
    return this._lastQuery !== this._query;
  }

  @computed('configHash')
  get tokenConfig(): ConfigMap {
    return prepareConfig(this.configHash || {});
  }

  @computed('forceHidingSearchHelps', 'forceShowingSearchHelps', 'isHintListEmpty', 'activeToken')
  get showModifierList(): boolean {
    if (this.forceShowingSearchHelps) { return true; }
    if (this.forceHidingSearchHelps) { return false; }
    if (this.isHintListEmpty) { return false; }
    const type = this.activeToken && this.activeToken.type;
    return !!type && (type !== 'space');
  }

  @computed('activeToken', 'limit', 'isQueryBlank')
  get hintList(): HintList[] {
    const token = this.activeToken;
    const hints = token && token.hints;
    if (!token || !hints) { return []; }

    const limit = this.limit;
    const hintsBySection: SectionHintsMap = hints.reduce(function(sum: SectionHintsMap, listItem: Hint) {
      let section = (listItem.hasOwnProperty('section') && (listItem as Modifier).section) || token.sectionTitle;
      if (sum[section]) {
        if (sum[section].length < limit) {
          sum[section].push(listItem);
        }
      } else {
        sum[section] = [listItem];
      }
      return sum;
    }, {});

    const sections = Object.keys(hintsBySection);

    let hintList = sections.map(function(section: string): HintList {
      let list = hintsBySection[section];
      if (sections.length > 1) { list = list.slice(0, 5); }
      return { list, section };
    });

    if (this.isQueryBlank) {
      const examples = this.sampleQueries;
      hintList = [{
        list: examples.map(function({ query, label }): Hint {
          return {
            label,
            modifier: true,
            searchOnEnter: true,
            section: 'How to Search',
            value: query
          };
        }),
        section: 'How to Search'
      }].concat(hintList);
    }

    return hintList;
  }

  private sampleQueries: SampleQuery[] = [];

  @computed('_query')
  get isQueryBlank(): boolean {
    return !this.query;
  }

  @computed('hintList.[]')
  get isHintListEmpty(): boolean {
    return this.hintList.length === 0;
  }

  init() {
    super.init();
    if (this.contextPath) {
      fetch(this.contextPath).then((response) => {
        response.json().then(({ scope, modifiers }) => {
          const context = new SearchContext(scope, modifiers);
          this.set('configHash', context.config);
        });
      });
    }

    if (!this.query) {
      const queryParams = new URLSearchParams(window.location.search);
      this.set('query', queryParams.get('q') || '');
    }
  }

  @action
  didSelectModifier(model: Modifier) {
    const token = this.activeToken;
    if (!token) return;
    next(this, () => {
      set(token, 'model', model);
      if (model.searchOnEnter) {
        next(this, () => { this.performSearch(); });
      }
    });
  }

  @action
  valueDidChange(newValue: string) {
    this.set('cachedQuery', newValue);
  }

  @action
  updateActiveToken(newToken: Token) {
    this.set('activeToken', newToken);
  }

  @action
  performSearch() {
    this.set('_lastQuery', this._query);
    if (this.searchPath) {
      const path = this.searchPath.replace(/^\//, '');
      const url = `/${path}?q=${encodeURIComponent(this._query)}`;
      window.location.assign(url);
    }
  }

  @action
  focusOnInput() {
    this.setProperties({
      inputFocused: true,
      hintsFocused: false
    });
  }

  @action
  focusOnHints() {
    this.setProperties({
      inputFocused: false,
      hintsFocused: true
    });
  }

  @action
  onInputFocus() {
    this.set('inputFocused', true);
  }

  @action
  onInputBlur() {
    this.set('inputFocused', false);
  }

  @action
  onHintsFocus() {
    this.set('hintsFocused', true);
  }

  @action
  onHintsBlur() {
    this.set('hintsFocused', false);
  }

  @action
  hideSearchHelps() {
    this.setProperties({
      forceHidingSearchHelps: true,
      forceShowingSearchHelps: false
    });
  }

  @action
  showSearchHelps() {
    this.setProperties({
      forceHidingSearchHelps: false,
      forceShowingSearchHelps: true
    });
  }

  showSearchHelpsOnFocus() {
    if(this.isQueryBlank && !this.forceHidingSearchHelps) {
      this.showSearchHelps();
    }
  }
}
