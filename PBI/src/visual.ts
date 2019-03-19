/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

/*
 *  This file is based on or incorporates material from the projects listed below (Third Party IP).
 *  The original copyright notice and the license under which Microsoft received such Third Party IP,
 *  are set forth below. Such licenses and notices are provided for informational purposes only.
 *  Microsoft licenses the Third Party IP to you under the licensing terms for the Microsoft product.
 *  Microsoft reserves all other rights not expressly granted under this agreement, whether by
 *  implication, estoppel or otherwise.
 *
 *  d3 Force Layout
 *  Copyright (c) 2010-2015, Michael Bostock
 *  All rights reserved.
 *
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions are met:
 *
 *  * Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 *  * The name Michael Bostock may not be used to endorse or promote products
 *    derived from this software without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 *  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 *  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 *  DISCLAIMED. IN NO EVENT SHALL MICHAEL BOSTOCK BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 *  BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 *  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 *  OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 *  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import "./../style/visual.less";

import * as d3 from "d3";
import * as _ from "lodash";
import powerbi from "powerbi-visuals-api";
import constructPage from "../../dist/bundle.js";

import IViewport = powerbi.IViewport;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import IColorPalette = powerbi.extensibility.IColorPalette;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import DataView = powerbi.DataView;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumn = powerbi.DataViewValueColumn;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
import VisualObjectInstancesToPersist = powerbi.VisualObjectInstancesToPersist;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;


export class Visual implements IVisual {
    private config: any;
    private host: IVisualHost;
    private colorPalette: IColorPalette;
    private selectionManager: ISelectionManager;
    private selectionGroups: any;
    private dv: any;

    constructor(options: VisualConstructorOptions) {
        this.config = {};
        this.host = options.host;
        this.selectionManager = options.host.createSelectionManager();
        this.selectionGroups = [];
        this.selectionManager.registerOnSelectCallback(() => {
            this.syncSelectionState(this.selectionGroups, this.selectionManager.getSelectionIds() as ISelectionId[]);
        });
        this.colorPalette = options.host.colorPalette;
        this.init(options);
    }

    private init(options: VisualConstructorOptions): void {
        let appContainer = d3.select(options.element).append("div").attr("id", "appContainer");
        appContainer.style("width", "100%")
            .style("height", "100%")
            .style("overflow", "auto");
        appContainer.append("div").attr("id", "app");

    }

    private syncSelectionState(
        selection: any,
        selectionIds: ISelectionId[]
    ): void {
        /*
         Selection = [
             {
                 selectionId:id,
                 show:func,
                 hide:func
             }
         ]
        */
        if (!selection || !selectionIds) {
            return;
        }

        if (!selectionIds.length) {
            for (let i = 0; i < selection.length; i++) {
                selection[i].show();
            }
            return;
        }

        const self: this = this;

        for (let i = 0; i < selection.length; i++) {
            const isSelected: boolean = self.isSelectionIdInArray(selectionIds, selection[i].selectionId);
            if (isSelected) {
                selection[i].show();
            } else {
                selection[i].hide();
            }
        }
    }

    private isSelectionIdInArray(selectionIds: ISelectionId[], selectionId: ISelectionId): boolean {
        if (!selectionIds || !selectionId) {
            return false;
        }

        return selectionIds.some((currentSelectionId: ISelectionId) => {
            return currentSelectionId.includes(selectionId);
        });
    }

    private static getSelectionIds(dataView: DataView, host: IVisualHost): powerbi.visuals.ISelectionId[] {
        return dataView.table.identity.map((identity: any) => {
            const categoryColumn: DataViewCategoryColumn = {
                source: dataView.table.columns[0],
                values: null,
                identity: [identity]
            };

            return host.createSelectionIdBuilder()
                .withCategory(categoryColumn, 0)
                .createSelectionId();
        });
    }

    private getObjectFromDataView(dv) {
        let selectionIds = Visual.getSelectionIds(dv, this.host);
        let that = this;
        let all = [];
        for (let c = 0; c < dv.table.columns.length; c++) {
            let currC = dv.table.columns[c];
            let field = d3.keys(currC.roles)[0];
            currC.displayName = field;
        }


        for (let r = 0; r < dv.table.rows.length; r++) {
            let currR = dv.table.rows[r];
            let item = {};
            item["selectionId"] = selectionIds[r];
            for (let c = 0; c < dv.table.columns.length; c++) {
                let currC = dv.table.columns[c];
                item[currC.displayName] = currR[c];
            }
            all.push(item);
        }

        console.log(all);

        return {
            data: all
        };
    }

    public getConfig() {
        let configString = "{}";
        if (this.dv && this.dv.metadata.objects && this.dv.metadata.objects.chartSettings && this.dv.metadata.objects.chartSettings.config) {
            configString = this.dv.metadata.objects.chartSettings.config;
        }
        console.log("saved cofig is: ", JSON.parse(configString));
        return JSON.parse(configString);
    }

    public setConfig(config: any) {
        let configString: string = JSON.stringify(config) || "";
        console.log("config to save is: ", configString);
        let objects: VisualObjectInstancesToPersist = {
            merge: [
                <VisualObjectInstance>{
                    objectName: "chartSettings",
                    selector: null,
                    properties: { "config": configString },
                }]
        };
        this.host.persistProperties(objects);
    }

    public manageMySelections(customSelectionObjsArray) {
        this.selectionGroups = customSelectionObjsArray;
    }

    public customClickHandler(event, selectionElm) {
        if (this.host.allowInteractions) {
            const isCtrlPressed: boolean = (event as any).data.originalEvent.ctrlKey || false;
            if (selectionElm) {
                this.selectionManager
                    .select(selectionElm.selectionId, isCtrlPressed)
                    .then((ids: ISelectionId[]) => {
                        this.syncSelectionState(this.selectionGroups, ids);
                    });
            } else {
                this.selectionManager
                    .clear()
                    .then(() => {
                        this.syncSelectionState(this.selectionGroups, []);
                    });
            }
            (<Event>event as any).data.originalEvent.stopPropagation();
        }
    }

    public update(options: VisualUpdateOptions): void {
        if (!options
            || !options.dataViews
            || !options.dataViews[0]
        ) {
            return;
        }
        this.dv = options.dataViews[0];
        let results = this.getObjectFromDataView(options.dataViews[0]);
        // console.log(options, results);

        (window as any).constructPage(results.data, {
            get: this.getConfig.bind(this),
            set: this.setConfig.bind(this),
            edit: options.editMode ? true : false,
            manageMySelections: this.manageMySelections.bind(this),
            customClickHandler: this.customClickHandler.bind(this),
        });
        let needToLoad = constructPage;
    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
        let objectName = options.objectName;
        let objectEnumeration: VisualObjectInstance[] = [];
        switch (objectName) {
            case "chartSettings":
                // ignore
                break;
        }
        return objectEnumeration;
    }

    public destroy(): void {
    }
}

