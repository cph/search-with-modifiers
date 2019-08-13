import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { fillIn, render, triggerKeyEvent } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { prepareConfig } from 'search-with-modifiers/utils/search';

const COMPLEX_TEMPLATE = hbs`
  {{search-box
      tokenConfig=tokenConfig
      onValueChanged=actionValue
      onDownPressed=actionDown
      onSearchTriggered=actionSearch
      onActiveTokenChanged=actionToken}}
`;

const TOKEN_CONFIG = prepareConfig({
  'published:': {
    content: ['1984', '1985', '1986', '1987', '1988', '1989'],
    type: 'modifier-list'
  }
});

module('Integration | Component | search-box', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`{{search-box}}`);

    assert.ok(this.element.querySelector('div.search-box'));
    assert.ok(this.element.querySelector('div.search-box textarea'), 'Expected textarea');
  });

  test('it triggers onDownPressed when at the end of the input', async function(assert) {
    this.set('tokenConfig', TOKEN_CONFIG);
    this.set('actionDown', function() { assert.ok(true); });
    await render(COMPLEX_TEMPLATE);
    await fillIn('textarea', 'Search');
    await triggerKeyEvent('textarea', 'keydown', 'ArrowDown');
  });

  test('it autocompletes if available', async function(assert) {
    let checkOk = false;
    this.set('tokenConfig', TOKEN_CONFIG);
    this.set('actionValue', function(value: string) {
      if(checkOk) { assert.equal(value, 'published:'); }
    });

    await render(COMPLEX_TEMPLATE);
    await fillIn('textarea', 'publi');

    checkOk = true;
    await triggerKeyEvent('textarea', 'keydown', 'ArrowRight');
  });

  test('it triggers search when enter is pressed', async function(assert) {
    this.set('tokenConfig', TOKEN_CONFIG);
    this.set('actionSearch', function() { assert.ok(true); });
    await render(COMPLEX_TEMPLATE);
    await fillIn('textarea', 'query');
    await triggerKeyEvent('textarea', 'keydown', 'Enter');
  });
});
