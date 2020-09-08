/******************************************************************************
     Copyright:: 2020- IBM, Inc

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
 
import React from "react";

import {
} from 'carbon-components-react';

import { IReport, IReportItem, valueMap } from "./Report";
import ReportRow from "./ReportRow";

interface IReportRulesState {
}
interface IReportRulesProps {
    report: IReport;
    selectItem: (item: IReportItem) => void,
    getItem: (item: IReportItem) => void,
    learnItem: IReportItem | null,
    layout: string,
    dataFromParent: boolean[],
    focusedViewFilter: boolean
}
interface IGroup {
    title: string,
    counts: { [key: string]: number }
    items: IReportItem[]
}

export default class ReportRules extends React.Component<IReportRulesProps, IReportRulesState> {
    state: IReportRulesState = {
    };
    
    render() {
        let itemIdx = 0;
        let groupMap : {
            [key: string]: IGroup
        } | null = {};
        for (const item of this.props.report.results) {
            if (item.value[1] === "PASS") {
                continue;
            }
            item.itemIdx = itemIdx++;

            if (!(item.ruleId in groupMap)) {
                groupMap[item.ruleId] = {
                    // TODO: Change out for passive rule message
                    title: this.props.report.nls[item.ruleId][0] || item.ruleId,
                    counts: {},
                    items: []
                }
            }
            let curGroup = groupMap[item.ruleId];
            curGroup.items.push(item);
            let val = valueMap[item.value[0]][item.value[1]] || item.value[0] + "_" + item.value[1];
            curGroup.counts[val] = (curGroup.counts[val] || 0) + 1;
        }

        let groups : IGroup[] = [];
        for (const ruleId in groupMap) {
            groups.push(groupMap[ruleId]);
        }
        
        // to sort issue according to type in order Violations, Needs Review, Recommendations
        // at the group level
        const valPriority = ["Violation", "Needs review", "Recommendation"];
        groups.sort( function(a,b) {
            let aVal = valueMap[a.items[0].value[0]][a.items[0].value[1]] || a.items[0].value[0] + "_" + a.items[0].value[1];
            let bVal = valueMap[b.items[0].value[0]][b.items[0].value[1]] || b.items[0].value[0] + "_" + b.items[0].value[1];
            let aIndex = valPriority.indexOf(aVal);
            let bIndex = valPriority.indexOf(bVal);
            return aIndex - bIndex;
        })

        // are any selected items in any of the groups
        let rulesCount = 0;
        let rulesSelectedCount = 0;
        let atLeastOneSelected:boolean = false;
        groups.map(group => {
            group.items.map(item => {
                rulesCount++;
                if (item.selected == true || item.selectedChild == true) {
                    rulesSelectedCount++;
                    atLeastOneSelected = true;
                }
            })
        });
        console.log("rulesSelectedCount = ", rulesSelectedCount);
        console.log("rulesCount = ", rulesCount);
        console.log("atLeastOneSelected = ",atLeastOneSelected);

        let idx=0;
        let scrollFirst = true;
        return <div className="bx--grid report" role="table" style={{paddingLeft:"1rem", paddingRight:"0"}} aria-label="Issues grouped by rule">
            <div role="rowgroup">
                <div className="bx--row reportHeader" role="row">
                    <div className="bx--col-sm-1" role="columnheader">
                        Issues                    
                    </div>
                    <div className="bx--col-sm-3" role="columnheader">
                        Rule
                    </div>
                </div>
            </div>
            <div role="rowgroup">
                {groups.map(group => {
                    let thisIdx = idx;
                    idx += group.items.length+1; 
                    group.items.map(item => {
                        item.scrollTo = item.scrollTo && scrollFirst;
                        scrollFirst = scrollFirst && !item.scrollTo;
                    })       
                    return <ReportRow
                        idx={thisIdx} 
                        report={this.props.report} 
                        group={group}
                        getItem={this.props.getItem}
                        learnItem={this.props.learnItem}
                        selectItem={this.props.selectItem}
                        layout={this.props.layout}
                        dataFromParent={this.props.dataFromParent}
                        focusedViewFilter={this.props.focusedViewFilter}
                        atLeastOnSelected={atLeastOneSelected}
                    />                
                })}
            </div>
        </div>
    }
}