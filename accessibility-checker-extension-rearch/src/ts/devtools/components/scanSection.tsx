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

import * as React from 'react';
import { getDevtoolsController, ViewState } from '../devtoolsController';
import { getTabId } from '../../util/tabId';
import { getBGController, TabChangeType } from '../../background/backgroundController';
import { 
    Button,
    Column,
    ContentSwitcher,
    InlineLoading,
    Grid,
    OverflowMenu,
    OverflowMenuItem,
    Switch,
    Theme
} from "@carbon/react";
import {
    Keyboard,
    KeyboardOff,
    Renew
} from "@carbon/react/icons";
import { ListenerType } from '../../messaging/controller';
import { IReport } from '../../interfaces/interfaces';
import { ChevronDown } from "@carbon/react/icons";

let devtoolsController = getDevtoolsController();
let bgController = getBGController();

interface ScanSectionState {
    scanInProgress: number
    pageStatus: string
    viewState: ViewState
    reportContent: boolean
    scannedOnce: boolean
    storeReports: boolean,
    storedReportsCount: number
}

export class ScanSection extends React.Component<{}, ScanSectionState> {
    state : ScanSectionState = {
        scanInProgress: 0,
        pageStatus: "complete",
        viewState: {
            kcm: false
        },
        scannedOnce: false,
        reportContent: false,
        storeReports: false,
        storedReportsCount: 0
    }

    reportListener : ListenerType<IReport> = async (report) => {
        let self = this;
        let hasReportContent = false;
        if (report && report.results.length > 0) {
            hasReportContent = true;
        }
        self.setState( { scanInProgress: hasReportContent ? 2 : 0, reportContent: hasReportContent });
        setTimeout(() => {
            self.setState( { scanInProgress: 0 });
        }, 500);
    }

    async componentDidMount(): Promise<void> {
        devtoolsController.addReportListener(this.reportListener);
        devtoolsController.addViewStateListener(async (newState) => {
            this.setState( { viewState: newState });
        })
        devtoolsController.addStoreReportsListener(async (newState) => {
            this.setState( { storeReports: newState });
        })
        bgController.addTabChangeListener(async (content: TabChangeType) => {
            if (content.changeInfo.status) {
                this.setState({ pageStatus: content.changeInfo.status, scannedOnce: false });
            }
        });
        let hasReportContent = false;
        let report = await devtoolsController.getReport();
        if (report && report.results.length > 0) {
            hasReportContent = true;
        }
        this.setState({ 
            viewState: (await devtoolsController.getViewState())!, 
            reportContent: hasReportContent, 
            storeReports: (await devtoolsController.getStoreReports()),
            storedReportsCount: (await devtoolsController.getStoredReportsCount())
        });
    }

    componentWillUnmount(): void {
        devtoolsController.removeReportListener(this.reportListener);
    }

    async scan() {
        this.setState( { scanInProgress: 1, scannedOnce: true });
        await bgController.requestScan(getTabId()!);
    }

    render() {
        return (
            <Grid className="scanSection"> 
                <Column sm={4} md={8} lg={8}>
                    <div style={{display: "flex", flexWrap: "wrap", gap: "1rem"}}>
                        <div style={{flex: "0 1 8.75rem"}}>
                            <div style={{display: "flex"}}>
                                <div style={{flex: "1 1 8.75rem" }}>
                                    {this.state.scanInProgress > 0 && <InlineLoading 
                                        description={"Scanning"}
                                        style={{minWidth: "8.75rem", paddingLeft: ".5rem", backgroundColor: "#e0e0e0" }}
                                        status={this.state.scanInProgress === 1 ? 'active' : 'finished'}
                                    />}
                                    {this.state.scanInProgress === 0 && <Button 
                                        size="sm"
                                        style={{minWidth: "8.75rem"}}
                                        disabled={this.state.pageStatus !== "complete"} 
                                        renderIcon={Renew} 
                                        onClick={() => { 
                                            this.scan(); 
                                        }
                                    }>Scan</Button>}
                                </div>
                                <Theme theme="g100" style={{flex: "0 1 2rem"}}>
                                    <OverflowMenu size="sm" ariaLabel="stored scans" align="bottom" renderIcon={ChevronDown}>
                                        <OverflowMenuItem
                                            disabled={!this.state.reportContent}
                                            itemText="Download current scan" 
                                            requireTitle
                                            onClick={() => devtoolsController.exportXLSLast() }
                                        />
                                        <OverflowMenuItem 
                                            // if scanStorage false not storing scans, if true storing scans
                                            itemText= {this.state.storeReports ? "Stop storing scans" : "Start storing scans"}
                                            onClick={() => {
                                                devtoolsController.setStoreReports(!this.state.storeReports);
                                            }}
                                        />
                                        <OverflowMenuItem 
                                            disabled={this.state.storedReportsCount === 0} // disabled when no stored scans or 1 stored scan
                                            itemText="Download stored scans" 
                                            requireTitle
                                            onClick={() => devtoolsController.exportXLSAll() }
                                        />
                                        <OverflowMenuItem 
                                            disabled={this.state.storedReportsCount === 0} // disabled when no stored scans or 1 stored scan
                                            itemText="View stored scans" 
                                            // onClick={this.props.reportManagerHandler} // need to pass selected as scanType
                                        />
                                        <OverflowMenuItem 
                                            disabled={this.state.storedReportsCount === 0}
                                            isDelete={this.state.storedReportsCount > 0}
                                            hasDivider
                                            itemText="Delete stored scans" 
                                            onClick={() => devtoolsController.clearStoredReports() }
                                        />
                                    </OverflowMenu>
                                </Theme>
                            </div>
                        </div>
                        <div style={{flex: "1 1 8.75rem"}}>
                            <ContentSwitcher style={{maxWidth: "20rem", marginLeft: "auto" }} size="sm" onChange={(evt: any) => {
                                console.log("Switch", evt);
                            }}>
                                <Switch
                                    name="one"
                                    text="First section"
                                />
                                <Switch
                                    name="two"
                                    text="All"
                                />
                            </ContentSwitcher>
                        </div>
                        <Button
                            style={{flex: "1 1 2rem"}}
                            hasIconOnly
                            renderIcon={this.state.viewState.kcm ? KeyboardOff : Keyboard} 
                            disabled={!this.state.reportContent}
                            iconDescription="Keyboard Checker Mode" tooltipPosition="left" 
                            onClick={async () => {
                                let newState :ViewState = JSON.parse(JSON.stringify(this.state.viewState));
                                newState.kcm = !newState.kcm;
                                await devtoolsController.setViewState(newState);
                            }}
                            size="sm"
                            kind="secondary"
                        />
                    </div>
                </Column>
            </Grid>
        );
    }
}