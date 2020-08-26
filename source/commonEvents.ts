import {IPoint} from "./Point";
import {EventHandler, MouseEventFlags, mouseEvents, sGisEvent} from "./EventHandler";
import {Offset} from "./baseTypes";

export interface sGisMouseEventParams {
    point: IPoint,
    browserEvent: MouseEvent
}

export abstract class sGisMouseEvent extends sGisEvent {
    readonly eventFlag: MouseEventFlags;

    readonly point: IPoint;
    readonly browserEvent: MouseEvent;

    constructor({type, flag}: {type: string, flag: MouseEventFlags}, {point, browserEvent}: sGisMouseEventParams) {
        super(type);
        this.point = point;
        this.browserEvent = browserEvent;
        this.eventFlag = flag;
    }
}

export class sGisClickEvent extends sGisMouseEvent {
    static type: string = mouseEvents.click.type;
    static eventFlag: MouseEventFlags = mouseEvents.click.flag;

    constructor(params: sGisMouseEventParams) {
        super(mouseEvents.click, params);
    }
}

export class sGisDoubleClickEvent extends sGisMouseEvent {
    static type: string = mouseEvents.doubleClick.type;
    static eventFlag: MouseEventFlags = mouseEvents.doubleClick.flag;

    constructor(params: sGisMouseEventParams) {
        super(mouseEvents.doubleClick, params);
    }
}

export class sGisMouseMoveEvent extends sGisMouseEvent {
    static type: string = mouseEvents.mouseMove.type;
    static eventFlag: MouseEventFlags = mouseEvents.mouseMove.flag;

    constructor(params: sGisMouseEventParams) {
        super(mouseEvents.mouseMove, params);
    }
}

export class sGisMouseDownEvent extends sGisMouseEvent {
    static type: string = mouseEvents.mouseDown.type;
    static eventFlag: MouseEventFlags = mouseEvents.mouseDown.flag;

    constructor(params: sGisMouseEventParams) {
        super(mouseEvents.mouseDown, params);
    }
}

export class sGisMouseUpEvent extends sGisMouseEvent {
    static type: string = mouseEvents.mouseUp.type;
    static eventFlag: MouseEventFlags = mouseEvents.mouseUp.flag;

    constructor(params: sGisMouseEventParams) {
        super(mouseEvents.mouseUp, params);
    }
}

export class sGisMouseOutEvent extends sGisMouseEvent {
    static type: string = mouseEvents.mouseOut.type;
    static eventFlag: MouseEventFlags = mouseEvents.mouseOut.flag;

    constructor(params: sGisMouseEventParams) {
        super(mouseEvents.mouseOut, params);
    }
}

export class sGisMouseOverEvent extends sGisMouseEvent {
    static type: string = mouseEvents.mouseOver.type;
    static eventFlag: MouseEventFlags = mouseEvents.mouseOver.flag;

    constructor(params: sGisMouseEventParams) {
        super(mouseEvents.mouseOver, params);
    }
}

export class DragStartEvent extends sGisMouseEvent {
    static type: string = mouseEvents.dragStart.type;
    static eventFlag: MouseEventFlags = mouseEvents.dragStart.flag;

    draggingObject: EventHandler;

    constructor(draggingObject: EventHandler, params: sGisMouseEventParams) {
        super(mouseEvents.dragStart, params);
        this.draggingObject = draggingObject;
    }
}

export interface DragEventParams extends sGisMouseEventParams {
    offset: Offset,
    pxOffset: Offset
}

export class DragEvent extends sGisMouseEvent {
    static type: string = mouseEvents.drag.type;
    static eventFlag: MouseEventFlags = mouseEvents.drag.flag;

    readonly offset: Offset;
    readonly pxOffset: Offset;

    constructor({point, browserEvent, offset, pxOffset}: DragEventParams) {
        super(mouseEvents.drag, {point, browserEvent});
        this.offset = offset;
        this.pxOffset = pxOffset;
    }
}

export class DragEndEvent extends sGisMouseEvent {
    static type: string = mouseEvents.dragEnd.type;
    static eventFlag: MouseEventFlags = mouseEvents.dragEnd.flag;

    constructor(params: sGisMouseEventParams) {
        super(mouseEvents.dragEnd, params);
    }
}

export class sGisTouchStartEvent extends sGisMouseEvent {
    static type: string = mouseEvents.touchStart.type;
    static eventFlag: MouseEventFlags = mouseEvents.touchStart.flag;

    constructor(params: sGisMouseEventParams) {
        super(mouseEvents.touchStart, params);
    }
}

export class sGisTouchMoveEvent extends sGisMouseEvent {
    static type: string = mouseEvents.touchMove.type;
    static eventFlag: MouseEventFlags = mouseEvents.touchMove.flag;

    constructor(params: sGisMouseEventParams) {
        super(mouseEvents.touchMove, params);
    }
}

export class sGisTouchEndEvent extends sGisMouseEvent {
    static type: string = mouseEvents.touchEnd.type;
    static eventFlag: MouseEventFlags = mouseEvents.touchEnd.flag;

    constructor(params: sGisMouseEventParams) {
        super(mouseEvents.touchEnd, params);
    }
}

