import powerbi from "powerbi-visuals-api";
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
export declare class Visual implements IVisual {
    private config;
    private host;
    private colorPalette;
    private selectionManager;
    private selectionGroups;
    private visualHostTooltipService;
    private dv;
    constructor(options: VisualConstructorOptions);
    private init;
    private syncSelectionState;
    private isSelectionIdInArray;
    private static getSelectionIds;
    private getObjectFromDataView;
    getConfig(): any;
    setConfig(config: any): void;
    manageMySelections(customSelectionObjsArray: any): void;
    customClickHandler(event: any, selectionElm: any): void;
    update(options: VisualUpdateOptions): void;
    enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration;
    destroy(): void;
}
