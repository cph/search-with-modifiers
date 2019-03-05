import Controller from '@ember/controller';

export default class ApplicationController extends Controller.extend({
  queryParams: ['q']
}) {
  q: string = '';
}
