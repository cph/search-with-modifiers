export default class EventableEvent {
  public get type(): string { return this._type; }
  public get target(): any { return this._target; }
  public get stopped(): boolean { return this._stopped; }

  private _type: string;
  private _target: any;
  private _stopped: boolean = false;

  constructor(target: any, type: string) {
    this._target = target;
    this._type = type;
  }

  public stop() {
    this._stopped = true;
  }
}
