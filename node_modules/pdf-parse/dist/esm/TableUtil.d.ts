import type { TextItem } from 'pdfjs-dist/types/src/display/api.js';
declare enum RelativeDirections {
    None = 0,
    Left = 1,
    Right = 2,
    Top = 3,
    Bottom = 4
}
export declare class Rectangle {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    x2: number;
    y2: number;
    text: string;
    constructor(id: number, x: number, y: number, width: number, height: number);
    toString(): string;
    tryAddText(item: TextItem): boolean;
    isNeighbour(rect: Rectangle, distance?: number): RelativeDirections;
}
type TableRow = Array<Rectangle>;
export declare class Table {
    grid: Array<TableRow>;
    private minTableX1;
    private minTableY1;
    private maxTableX2;
    private maxTableY2;
    constructor(rect: Rectangle);
    private _cellCount;
    get cellCount(): number;
    get width(): number;
    get height(): number;
    static tryAddText(pageTables: Array<Table>, item: TextItem): boolean;
    static addRectangle(pageTables: Array<Table>, rect: Rectangle): boolean;
    getTableArray(): Array<Array<string>>;
    initMinMax(): void;
    isInside(item: TextItem): boolean;
    toString(): string;
}
export {};
//# sourceMappingURL=TableUtil.d.ts.map