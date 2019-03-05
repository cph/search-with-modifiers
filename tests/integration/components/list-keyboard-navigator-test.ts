import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { find, findAll, render, triggerKeyEvent } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

const COMPLEX_TEMPLATE = hbs`
  {{#list-keyboard-navigator
      onHitTop=actionTop
      onHitBottom=actionBottom
      onItemSelected=actionSelect
      onTyping=actionTyping
      items=aList as |highlighted|}}
    {{#each aList as |item|}}
      <li class="item{{if (eq item highlighted) " active"}}">{{item}}</li>
    {{/each}}
  {{/list-keyboard-navigator}}
`;
const LIST = [ 'enie', 'menie', 'miny', 'moe' ];

module('Integration | Component | list-keyboard-navigator', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`{{list-keyboard-navigator}}`);

    assert.ok(find('div'));
  });

  test('it renders its block', async function(assert) {
    this.set('aList', LIST);
    await render(COMPLEX_TEMPLATE);

    assert.equal(findAll('li').length, 4);
  });

  test('it tracks highlighting up and down', async function(assert) {
    this.set('aList', LIST);
    await render(COMPLEX_TEMPLATE);
    await triggerKeyEvent('.list-keyboard-navigator', 'keydown', 'ArrowDown');
    await triggerKeyEvent('.list-keyboard-navigator', 'keydown', 'ArrowDown');

    let highlighted = find('.active');
    assert.ok(highlighted);
    assert.equal((highlighted as Element).textContent, LIST[1]);

    await triggerKeyEvent('.list-keyboard-navigator', 'keydown', 'ArrowUp');
    highlighted = find('.active');
    assert.ok(highlighted);
    assert.equal((highlighted as Element).textContent, LIST[0]);
  });

  test('it triggers onHitTop when highlight reaches the top', async function(assert) {
    this.set('aList', LIST);
    this.set('actionTop', function() { assert.ok(true); });
    await render(COMPLEX_TEMPLATE);
    await triggerKeyEvent('.list-keyboard-navigator', 'keydown', 'ArrowDown');
    await triggerKeyEvent('.list-keyboard-navigator', 'keydown', 'ArrowUp');
  });

  test('it triggers onHitBottom when highlight reaches the bottom', async function(assert) {
    this.set('aList', LIST);
    this.set('actionBottom', function() { assert.ok(true); });
    await render(COMPLEX_TEMPLATE);
    await triggerKeyEvent('.list-keyboard-navigator', 'keydown', 'ArrowDown');
    await triggerKeyEvent('.list-keyboard-navigator', 'keydown', 'ArrowDown');
    await triggerKeyEvent('.list-keyboard-navigator', 'keydown', 'ArrowDown');
    await triggerKeyEvent('.list-keyboard-navigator', 'keydown', 'ArrowDown');
    await triggerKeyEvent('.list-keyboard-navigator', 'keydown', 'ArrowDown');
  });

  test('it triggers onItemSelected with the item when enter is pressed on a highlighted item', async function(assert) {
    this.set('aList', LIST);
    this.set('actionSelect', function(item: string) { assert.equal(item, LIST[0]); });
    await render(COMPLEX_TEMPLATE);
    await triggerKeyEvent('.list-keyboard-navigator', 'keydown', 'ArrowDown');
    await triggerKeyEvent('.list-keyboard-navigator', 'keydown', 'Enter');
  });

  test('it triggers onTyping when a non-navigation key is pressed', async function(assert) {
    this.set('aList', LIST);
    this.set('actionTyping', function() { assert.ok(true); });
    await render(COMPLEX_TEMPLATE);
    await triggerKeyEvent('.list-keyboard-navigator', 'keydown', 'A');
  });
});
