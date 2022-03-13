/******************************************************************************
  Copyright:: 2022- IBM, Inc
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
  http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*****************************************************************************/

import { Rule, RuleResult, RuleFail, RuleContext, RulePotential, RuleManual, RulePass, RuleContextHierarchy } from "../../../api/IRule";
import { eRulePolicy, eToolkitLevel } from "../../../api/IRule";
import { RPTUtil } from "../../../../v2/checker/accessibility/util/legacy";

export let Valerie_Table_DataCellRelationships: Rule = {
    id: "Valerie_Table_DataCellRelationships",
    context: "dom:td, dom:th",
    help: {
        "en-US": {
            "Pass_0": "Valerie_Table_DataCellRelationships.html",
            "Fail_1": "Valerie_Table_DataCellRelationships.html",
            "group": "Valerie_Table_DataCellRelationships.html"
        }
    },
    messages: {
        "en-US": {
            "Pass_0": "Rule Passed",
            "Fail_1": "Complex table does not have headers for each cell properly defined with 'header' or 'scope'",
            "group": "For a complex data table, all <th> and <td> elements must be related via 'header' or 'scope' attributes"
        }
    },
    rulesets: [{
        "id": ["IBM_Accessibility", "WCAG_2_1", "WCAG_2_0"],
        "num": ["1.3.1"],
        "level": eRulePolicy.VIOLATION,
        "toolkitLevel": eToolkitLevel.LEVEL_TWO
    }],
    act: {},
    run: (context: RuleContext, options?: {}, contextHierarchies?: RuleContextHierarchy): RuleResult | RuleResult[] => {
        const ruleContext = context["dom"].node as Element;
        let parentTable = RPTUtil.getAncestor(ruleContext, "table");
        // If this is a layout table or a simple table the rule does not apply.
        if (parentTable == null || !RPTUtil.isComplexDataTable(parentTable))
            return null;

        // If this table hasn't been preprocessed, process it.
        if (RPTUtil.getCache(ruleContext, "Valerie_Table_DataCellRelationships", null) === null) {
            // Build a grid that's actually usable (rowspan and colspan elements are duplicated)
            // This builds a real 2d table array.
            let grid = [];
            for (let i = 0; i < parentTable.rows.length; ++i) {
                let row = parentTable.rows[i];
                if (!grid[i]) grid[i] = [];
                for (let j = 0; j < row.cells.length; ++j) {
                    let cell = row.cells[j];
                    RPTUtil.setCache(cell, "Valerie_Table_DataCellRelationships", i + ":" + j);
                    let width = parseInt(cell.getAttribute("colspan"));
                    if (!width) width = 1;
                    let height = parseInt(cell.getAttribute("rowspan"));
                    if (!height) height = 1;
                    let gX = 0;
                    while (grid[i][gX]) gX += 1;
                    for (let k = 0; k < height; ++k) {
                        if (!grid[i + k]) grid[i + k] = []
                        for (let l = 0; l < width; ++l) {
                            grid[i + k][gX + l] = cell;
                        }
                    }
                }
            }

            // Iterate through the table grid and record headers that point to cells and
            // cells that are pointed to by headers
            let doc = ruleContext.ownerDocument;
            let lookup = {}
            let scopedCols = {};
            for (let i = 0; i < grid.length; ++i) {
                let rowScoped = false;
                for (let j = 0; j < grid[i].length; ++j) {
                    let gridCell = grid[i][j];
                    let gridNodeName = gridCell.nodeName.toLowerCase();
                    if (gridNodeName == "th") {
                        if (gridCell.getAttribute("scope") == "row") {
                            rowScoped = true;
                            // If there's an axis attribute, it must be referred to by headers,
                            // scope is not enough.
                            if (!RPTUtil.attributeNonEmpty(gridCell, "axis"))
                                lookup[RPTUtil.getCache(gridCell, "Valerie_Table_DataCellRelationships", null)] = true;
                        } else if (gridCell.getAttribute("scope") == "col") {
                            scopedCols[j] = true;
                            // If there's an axis attribute, it must be referred to by headers,
                            // scope is not enough.
                            if (!RPTUtil.attributeNonEmpty(gridCell, "axis"))
                                lookup[RPTUtil.getCache(gridCell, "Valerie_Table_DataCellRelationships", null)] = true;
                        }
                        // Headers can refer to other headers
                        if (RPTUtil.attributeNonEmpty(gridCell, "headers")) {
                            let hdrs = gridCell.getAttribute("headers").split(" ");
                            for (let k = 0; k < hdrs.length; ++k) {
                                let headElem = doc.getElementById(hdrs[k].trim());
                                if (headElem && RPTUtil.getAncestor(headElem, "table") == parentTable) {
                                    lookup[RPTUtil.getCache(headElem, "Valerie_Table_DataCellRelationships", null)] = true;
                                }
                            }
                        }
                    } else if (gridNodeName == "td") {
                        if (rowScoped || scopedCols[j]) {
                            lookup[RPTUtil.getCache(gridCell, "Valerie_Table_DataCellRelationships", null)] = true;
                        } else if (RPTUtil.attributeNonEmpty(gridCell, "headers")) {
                            let hdrs = gridCell.getAttribute("headers").split(" ");
                            for (let k = 0; k < hdrs.length; ++k) {
                                let headElem = doc.getElementById(hdrs[k].trim());
                                if (headElem && RPTUtil.getAncestor(headElem, "table") == parentTable) {
                                    lookup[RPTUtil.getCache(gridCell, "Valerie_Table_DataCellRelationships", null)] = true;
                                    lookup[RPTUtil.getCache(headElem, "Valerie_Table_DataCellRelationships", null)] = true;
                                }
                            }
                        }
                    }
                }
            }
            RPTUtil.setCache(parentTable, "Valerie_Table_DataCellRelationships", lookup);
        }

        let rcInfo = RPTUtil.getCache(ruleContext, "Valerie_Table_DataCellRelationships", null);
        let tInfo = RPTUtil.getCache(parentTable, "Valerie_Table_DataCellRelationships", null);
        let passed = rcInfo !== null && tInfo !== null && rcInfo in tInfo;

        if (!passed && rcInfo === "0:0" &&
            RPTUtil.getInnerText(ruleContext).trim().length == 0) {
            // We don't test if it's the upper-left cell and it's empty
            return null;
        }

        // If the table has no th's, it may just be that this was supposed to be a layout
        // table, which introduces a lot of noise.  In that case, only trigger this error
        // once per table.
        if (!passed && parentTable.getElementsByTagName("th").length == 0) {
            if (RPTUtil.getCache(parentTable, "Valerie_Table_DataCellRelationships_TrigOnce", false) === true) {
                passed = true;
            } else {
                RPTUtil.setCache(parentTable, "Valerie_Table_DataCellRelationships_TrigOnce", true);
            }
        }

        if (!passed) {
            return RuleFail("Fail_1");
        } else {
            return RulePass("Pass_0");
        }
    }
}