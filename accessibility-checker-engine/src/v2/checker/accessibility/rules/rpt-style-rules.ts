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

import {
    Rule,
    RuleResult,
    RuleFail,
    RuleContext,
    RulePotential,
    RuleManual,
    RulePass,
} from "../../../api/IEngine";
import { RPTUtil, NodeWalker } from "../util/legacy";

let a11yRulesStyle: Rule[] = [
    {
        /**
         * Description: Trigger on all pages containing CSS (trigger once)
         * Origin: RPT 5.6
         */
        id: "RPT_Style_Trigger2",
        context: "dom:style, dom:link, dom:*[style]",
        run: (
            context: RuleContext,
            options?: {}
        ): RuleResult | RuleResult[] => {
            const ruleContext = context["dom"].node as Element;
            let nodeName = ruleContext.nodeName.toLowerCase();
            if (
                nodeName === "link" &&
                (!ruleContext.hasAttribute("rel") ||
                    ruleContext.getAttribute("rel").toLowerCase() !=
                        "stylesheet")
            )
                return RulePass("Pass_0");
            if (
                nodeName != "style" &&
                nodeName != "link" &&
                ruleContext.hasAttribute("style") &&
                ruleContext.getAttribute("style").trim().length == 0
            )
                return RulePass("Pass_0");
            let triggered = RPTUtil.getCache(
                ruleContext.ownerDocument,
                "RPT_Style_Trigger2",
                false
            );
            let passed = triggered;
            //        Packages.java.lang.System.out.println(triggered);
            RPTUtil.setCache(
                ruleContext.ownerDocument,
                "RPT_Style_Trigger2",
                true
            );
            if (passed) return RulePass("Pass_0");
            if (!passed) return RuleManual("Manual_1");
        },
    },
    {
        /**
         * Description: Trigger for use of CSS background images
         * Origin: RPT 5.6 G456
         */
        id: "RPT_Style_BackgroundImage",
        context: "dom:style, dom:*[style]",
        run: (
            context: RuleContext,
            options?: {}
        ): RuleResult | RuleResult[] => {
            const ruleContext = context["dom"].node as Element;
            let nodeName = ruleContext.nodeName.toLowerCase();
            let passed = true;
            if (
                nodeName == "link" &&
                ruleContext.hasAttribute("rel") &&
                ruleContext.getAttribute("rel").toLowerCase() == "stylesheet"
            ) {
                // External stylesheet - trigger
                passed = RPTUtil.triggerOnce(
                    ruleContext,
                    "RPT_Style_BackgroundImage",
                    false
                );
            }
            if (
                (passed && nodeName == "style") ||
                ruleContext.hasAttribute("style")
            ) {
                let styleText;
                if (nodeName == "style")
                    styleText = RPTUtil.getInnerText(ruleContext);
                else styleText = ruleContext.getAttribute("style");
                let bgMatches = styleText.match(/background:[^;]*/g);
                if (bgMatches != null) {
                    for (let i = 0; passed && i < bgMatches.length; ++i)
                        passed = bgMatches[i].indexOf("url(") == -1;
                }
            }
            if (passed) return RulePass("Pass_0");
            if (!passed) return RulePotential("Potential_1");
        },
    },
    {
        /**
         * Description: Trigger if on hover any content displayed is not persistent
         * Origin: Requirement 1.4.13
         */

        id: "style_hover_persistent",
        context: "dom:style, dom:*[style], dom:*",
        run: (
            context: RuleContext,
            options?: {}
        ): RuleResult | RuleResult[] => {
            let pass0 = false;
            let pass1 = false;
            let pass2 = false; // never happen
            let potential1 = false;
            let potential2 = false;
            let potential3 = false;

            const ruleContext = context["dom"].node as Element;
            let nodeName = ruleContext.nodeName.toLowerCase();
            let styleText = "";
            if (nodeName == "style") {
                // console.log("RULE RUN ******************");
                styleText = RPTUtil.getInnerText(ruleContext).toLowerCase();
                // check import
                // console.log("ruleContext.ownerDocument.styleSheets.length = "+ruleContext.ownerDocument.styleSheets.length);
                for (
                    let sIndex = 0;
                    sIndex < ruleContext.ownerDocument.styleSheets.length;
                    sIndex++
                ) {
                    let sheet = ruleContext.ownerDocument.styleSheets[
                        sIndex
                    ] as CSSStyleSheet;
                    if (sheet && sheet.ownerNode == ruleContext) {
                        try {
                            let styleRules = sheet.cssRules
                                ? sheet.cssRules
                                : sheet.rules;
                            // console.log("styleRules.length = "+styleRules.length);
                            for (
                                let styleRuleIndex = 0;
                                styleRuleIndex < styleRules.length;
                                styleRuleIndex++
                            ) {
                                // console.log("**********");
                                // console.log("********** FOR LOOP styleRuleIndex = "+styleRuleIndex);
                                let foundHover = false;
                                let hoverElement = "";
                                let plusCombinator = false;
                                let tildeCombinator = false;
                                let afterCombinatorElement = "";
                                let afterCombinatorElementDisplay = false;
                                let afterCombinatorElementDisplayValue = false;
                                let afterCombinatorElementHover = false;
                                let supportingElement = false;
                                let supportingHover = false;
                                let supportingHoverElementDisplayProperty =
                                    false;
                                let supportingHoverElementDisplayValue = false;
                                let adjacentPlusSibling = false;
                                let adjacentTildeMultipleSibling = false;
                                let styleRule = styleRules[styleRuleIndex];
                                let ruleText =
                                    styleRules[styleRuleIndex].cssText;
                                // console.log("styleRules["+styleRuleIndex+"] = "+ruleText);
                                // 1. Check for :hover
                                if (ruleText.match(/:hover/g)) {
                                    foundHover = true;
                                    // console.log("1. found :hover = "+ foundHover);
                                    // 2. Get hover element
                                    hoverElement = ruleText.split(":")[0];
                                    // console.log("2. found element that goes with :hover = "+hoverElement);
                                } else {
                                    // console.log("1. No hover on css element so skip this rule");
                                    continue; // if no :hover skip this rule
                                }
                                // 3a. Check for css combinator +
                                // 4a. if so do we have an after combinator element
                                let plusTempStr = ruleText.substring(
                                    ruleText.indexOf("+") + 1
                                );
                                plusTempStr = plusTempStr.trim();
                                if (
                                    ruleText.match(/:hover \+/g) ||
                                    ruleText.match(/:hover\+/g)
                                ) {
                                    plusCombinator = true;
                                    // console.log("3a. Found plusCombinator = "+ plusCombinator);
                                    afterCombinatorElement =
                                        plusTempStr.split(" ")[0];
                                    // console.log("4a. Found plus afterCombinatorElement = "+afterCombinatorElement);
                                }

                                // 3b. Check for css combinator +
                                // 4b. if so do we have an after combinator element
                                if (
                                    ruleText.match(/:hover \~/g) ||
                                    ruleText.match(/:hover\~/g)
                                ) {
                                    // console.log("match = "+ruleText.match(":hover \~"));
                                    tildeCombinator = true;
                                    // console.log("3b. Found tildeCombinator = "+ tildeCombinator);
                                    let plusTempStr = ruleText.substring(
                                        ruleText.indexOf("~") + 1
                                    );
                                    plusTempStr = plusTempStr.trim();
                                    afterCombinatorElement =
                                        plusTempStr.split(" ")[0];
                                    // console.log("4b. Found tilde afterCombinatorElement = "+afterCombinatorElement);
                                }

                                if (!plusCombinator && !tildeCombinator) {
                                    // NO plusCombinator or tildeCombinator so skip this rule
                                    // console.log("NO plusCombinator or tildeCombinator so PASS");
                                    // console.log("**** REPORT PASS 0 HERE");
                                    return RulePass("Pass_0"); // JCH: should we have a N/A pass
                                }

                                // So now we have a css element with hover - element:hover so we have problems
                                // to check

                                // 5. Check if the after combinator element has display: property
                                // 6. Check if display property is not none
                                if (afterCombinatorElement) {
                                    // get index of display:
                                    // console.log("plusTempStr = "+plusTempStr);
                                    let index = plusTempStr.indexOf("display:");
                                    if (index) {
                                        afterCombinatorElementDisplay = true;
                                        // console.log("5. Found afterCombinatorElementDisplay = "+afterCombinatorElementDisplay);
                                        if (
                                            plusTempStr
                                                .slice(index + 8)
                                                .trim()
                                                .split(" ")[0] !== "none;"
                                        ) {
                                            afterCombinatorElementDisplayValue =
                                                true;
                                            // console.log("6. Found afterCombinatorElementDisplayValue not none = "+afterCombinatorElementDisplayValue);
                                        } else {
                                            // console.log("afterCombinatorElementDisplayValue === none");
                                            // console.log("**** PUT POTENTIAL 0 HERE");
                                            continue;
                                        }
                                    } else {
                                        // this is bad css so it won't happen
                                        // console.log("NO afterCombinatorElementDisplay so skip this rule");
                                        continue;
                                    }
                                } else {
                                    // this is bad css so it won't happen
                                    // console.log("NO afterCombinatorElement so skip this rule");
                                    continue;
                                }

                                if (afterCombinatorElementDisplayValue)
                                    if (
                                        sheet &&
                                        sheet.ownerNode == ruleContext
                                    ) {
                                        // console.log("**** At this point we have verified that we have a css element with a hover of the format span:hover + div { display: block; } with all the proper properties and values");
                                        // NOTE: At this point we have verified that we have a css element with a hover
                                        //       of the format span:hover + div { display: block; }
                                        //       with all the proper properties and values

                                        try {
                                            let styleRules2 = sheet.cssRules
                                                ? sheet.cssRules
                                                : sheet.rules;
                                            // console.log("styleRules2.length = "+styleRules2.length);
                                            for (
                                                let styleRuleIndex2 = 0;
                                                styleRuleIndex2 <
                                                styleRules2.length;
                                                styleRuleIndex2++
                                            ) {
                                                // Check rule for afterCominatorElement:hover
                                                // If find afterCombinatorElement:hover see if rule has property display: value where
                                                // value != none
                                                // console.log("**********");
                                                // console.log("********** 2nd FOR styleRuleIndex2 = "+styleRuleIndex2);
                                                let ruleText2 =
                                                    styleRules[styleRuleIndex2]
                                                        .cssText;
                                                // console.log("ruleText2 = ", ruleText2);
                                                // console.log("afterCombinatorElement = "+afterCombinatorElement);
                                                // Check all supporting elements for margin property
                                                // If find margin STOP and REPORT ERROR
                                                let regExString =
                                                    afterCombinatorElement +
                                                    " {";
                                                let trimRuleText2 =
                                                    ruleText2.trim();
                                                let regIndex =
                                                    trimRuleText2.indexOf(
                                                        regExString
                                                    );
                                                let afterCombinatorElementProperties =
                                                    trimRuleText2
                                                        .slice(regIndex)
                                                        .trim();

                                                if (
                                                    !afterCombinatorElementProperties.match(
                                                        /margin/g
                                                    )
                                                ) {
                                                    // console.log("No margin problem so continue on...");
                                                    // do we have a supporting element css definitions
                                                    let supportingHoverElement =
                                                        ruleText2.split(":")[0];
                                                    supportingHoverElement =
                                                        supportingHoverElement.split(
                                                            " "
                                                        )[0];
                                                    // console.log("supportingHoverElement = "+supportingHoverElement);
                                                    // console.log("afterCombinatorElement = "+afterCombinatorElement);

                                                    // NEED TO CHECK FOR afterCominatorElement:hover in ONE STEP

                                                    if (
                                                        supportingHoverElement ===
                                                            afterCombinatorElement &&
                                                        ruleText2.match(
                                                            /:hover/g
                                                        )
                                                    ) {
                                                        // console.log("7. Found supporting hover element same as afterCombinatorElement")
                                                        // 7. Found supporting hover element same as afterCombinatorElement
                                                        supportingElement =
                                                            true;
                                                        // does supporting element have hover
                                                        // console.log("8. Supporting element has hover also = "+ foundHover);
                                                        // 8. Supporting element has hover also
                                                        supportingHover = true;
                                                        let index =
                                                            ruleText2.indexOf(
                                                                "display:"
                                                            );
                                                        // console.log("index = "+index);
                                                        if (index) {
                                                            // 9. Found supportingHoverElementDisplayProperty
                                                            supportingHoverElementDisplayProperty =
                                                                true;
                                                            // console.log("9. Found supportingHoverElementDisplayProperty = "+supportingHoverElementDisplayProperty);
                                                            if (
                                                                plusTempStr
                                                                    .slice(
                                                                        index +
                                                                            8
                                                                    )
                                                                    .trim()
                                                                    .split(
                                                                        " "
                                                                    )[0] !==
                                                                "none;"
                                                            ) {
                                                                // 10. Found supportingHoverElementDisplayValue not none
                                                                supportingHoverElementDisplayValue =
                                                                    true;
                                                                // console.log("10. Found supportingHoverElementDisplayValue not none = "+supportingHoverElementDisplayValue);
                                                                // Get list of hover elements and next sibling for +
                                                                // For + there must be at least one ADJACENT sibling
                                                                if (
                                                                    hoverElement !==
                                                                        "" &&
                                                                    plusCombinator
                                                                ) {
                                                                    let hoverElementList =
                                                                        ruleContext.ownerDocument.getElementsByTagName(
                                                                            hoverElement.toUpperCase()
                                                                        );
                                                                    // console.log("hoverElementList.length = "+hoverElementList.length);
                                                                    // console.log("hoverElementList[0].tagName = "+hoverElementList[0].tagName);
                                                                    // Get adjacent sibling
                                                                    // console.log("Adjacent sibling = "+hoverElementList[0].nextElementSibling.tagName);
                                                                    // console.log("afterCombinatorElement.toUpperCase() = "+afterCombinatorElement.toUpperCase());

                                                                    if (
                                                                        afterCombinatorElement.toUpperCase() ===
                                                                        hoverElementList[0]
                                                                            .nextElementSibling
                                                                            .tagName
                                                                    ) {
                                                                        // console.log("11a. Hover with plus has adjacent sibling.")
                                                                        // 11a. Hover with plus has adjacent sibling.
                                                                        adjacentPlusSibling =
                                                                            true;
                                                                        // At this point we have verified a supporting afterCombinatorElement css rule that contains hover and display property that is not equal to none and has a hover element in the body with an adjacent sibling
                                                                        // console.log("**** REPORT PASS 1 HERE");
                                                                        pass0 =
                                                                            true;
                                                                        continue;
                                                                    }
                                                                } else if (
                                                                    plusCombinator
                                                                ) {
                                                                    // console.log("11a. Main hover with + combinator has no adjacent sibling");
                                                                    if (
                                                                        !potential1
                                                                    ) {
                                                                        // console.log("**** PUT POTENTIAL 1 HERE");
                                                                        potential1 =
                                                                            true;
                                                                        break;
                                                                    }
                                                                    continue;
                                                                }
                                                                // Get list of hover elements and determine if there are 2 or more adjacent siblings for ~
                                                                // For ~ there must be at least one ADJACENT sibling
                                                                if (
                                                                    hoverElement !==
                                                                        "" &&
                                                                    tildeCombinator
                                                                ) {
                                                                    // console.log("hoverElement.toUpperCase() = "+hoverElement.toUpperCase());
                                                                    let hoverElementList =
                                                                        ruleContext.ownerDocument.getElementsByTagName(
                                                                            hoverElement.toUpperCase()
                                                                        );
                                                                    // console.log("hoverElementList.length = "+hoverElementList.length);
                                                                    // Check for two or more adjacent siblings
                                                                    let siblings =
                                                                        [];
                                                                    let sibling =
                                                                        hoverElementList[0]
                                                                            .nextElementSibling;
                                                                    do {
                                                                        // console.log("sibling.tagName = "+sibling.tagName);
                                                                        if (
                                                                            sibling.tagName ===
                                                                            afterCombinatorElement.toUpperCase()
                                                                        ) {
                                                                            siblings.push(
                                                                                sibling
                                                                            );
                                                                        } else {
                                                                            break;
                                                                        }
                                                                    } while (
                                                                        (sibling =
                                                                            sibling.nextElementSibling)
                                                                    );
                                                                    let siblingCount =
                                                                        siblings.length;
                                                                    // console.log("siblingCount = "+siblingCount);
                                                                    // JCH TODO: what if sibling count 0
                                                                    if (
                                                                        siblingCount ==
                                                                        1
                                                                    ) {
                                                                        // console.log("11b. Hover with tilde and one adjacent sibling");
                                                                        adjacentTildeMultipleSibling =
                                                                            true;
                                                                        // console.log("**** REPORT PASS 2 HERE");
                                                                        return RulePass(
                                                                            "Pass_2"
                                                                        );
                                                                    } else if (
                                                                        siblingCount >
                                                                        1
                                                                    ) {
                                                                        // console.log("Main hover with ~ combinator has two or more siblings");
                                                                        if (
                                                                            !potential2
                                                                        ) {
                                                                            // console.log("**** PUT POTENTIAL 2 HERE");
                                                                            return RulePotential(
                                                                                "Potential_2"
                                                                            );
                                                                        }
                                                                    }
                                                                }
                                                            } else if (
                                                                plusCombinator
                                                            ) {
                                                                // supportingHoverElementDisplayValue
                                                                // if we make it to the last rule and supportingHoverElementDisplayValue is still false => potential1
                                                                if (
                                                                    styleRuleIndex2 ==
                                                                        styleRules2.length -
                                                                            1 &&
                                                                    supportingHoverElementDisplayValue ===
                                                                        false
                                                                ) {
                                                                    // console.log("NO plus supportingHoverElementDisplayProperty");
                                                                    // console.log("**** PUT POTENTIAL 1 HERE");
                                                                    return RulePotential(
                                                                        "Potential_1"
                                                                    );
                                                                } else {
                                                                    continue;
                                                                }
                                                            } else if (
                                                                tildeCombinator
                                                            ) {
                                                                // if we make it to the last rule and supportingHoverElementDisplayValue is still false => potential2
                                                                if (
                                                                    styleRuleIndex2 ==
                                                                        styleRules2.length -
                                                                            1 &&
                                                                    supportingHoverElementDisplayValue ===
                                                                        false
                                                                ) {
                                                                    // console.log("NO plus supportingHoverElementDisplayProperty");
                                                                    // console.log("**** PUT POTENTIAL 2 HERE");
                                                                    return RulePotential(
                                                                        "Potential_1"
                                                                    );
                                                                } else {
                                                                    continue;
                                                                }
                                                            }

                                                            // note at least one of the rules must have a display property
                                                        } else if (
                                                            plusCombinator
                                                        ) {
                                                            // if we make it to the last rule and supportingHoverElementDisplayProperty is still false => potential1
                                                            if (
                                                                styleRuleIndex2 ==
                                                                    styleRules2.length -
                                                                        1 &&
                                                                supportingHoverElementDisplayProperty ===
                                                                    false
                                                            ) {
                                                                // console.log("NO plus supportingHoverElementDisplayProperty");
                                                                // console.log("**** PUT POTENTIAL 1 HERE");
                                                                return RulePotential(
                                                                    "Potential_1"
                                                                );
                                                            } else {
                                                                continue;
                                                            }
                                                        } else if (
                                                            tildeCombinator
                                                        ) {
                                                            // if we make it to the last rule and supportingHoverElementDisplayProperty is still false => potential2
                                                            if (
                                                                styleRuleIndex2 ==
                                                                    styleRules2.length -
                                                                        1 &&
                                                                supportingHoverElementDisplayProperty ===
                                                                    false
                                                            ) {
                                                                // console.log("NO tilde supportingHoverElementDisplayProperty");
                                                                // console.log("**** PUT POTENTIAL 2 HERE");
                                                                return RulePotential(
                                                                    "Potential_1"
                                                                );
                                                            } else {
                                                                continue;
                                                            }
                                                        }

                                                        // note at least one of the rules must have a supportingElement:hover
                                                    } else if (plusCombinator) {
                                                        // if we make it to the last rule and supportingElement is still false => potential1
                                                        // console.log("styleRuleIndex2 = "+styleRuleIndex2);
                                                        // console.log("styleRules2.length = "+styleRules2.length);
                                                        // console.log("supportingElement = "+supportingHover);
                                                        if (
                                                            styleRuleIndex2 ==
                                                                styleRules2.length -
                                                                    1 &&
                                                            supportingHover ===
                                                                false
                                                        ) {
                                                            // console.log("NO plus supportingElement:hover");
                                                            // console.log("**** PUT POTENTIAL 1 HERE");
                                                            return RulePotential(
                                                                "Potential_1"
                                                            );
                                                        } else {
                                                            continue;
                                                        }
                                                    } else if (
                                                        tildeCombinator
                                                    ) {
                                                        // if we make it to the last rule and supportingElement is still false => potential2
                                                        // console.log("styleRuleIndex2 = "+styleRuleIndex2);
                                                        // console.log("styleRules2.length = "+styleRules2.length);
                                                        // console.log("supportingElement = "+supportingHover);
                                                        if (
                                                            styleRuleIndex2 ==
                                                                styleRules2.length -
                                                                    1 &&
                                                            supportingHover ===
                                                                false
                                                        ) {
                                                            // console.log("NO tilde supportingElement:hover");
                                                            // console.log("**** PUT POTENTIAL 2 HERE");
                                                            return RulePotential(
                                                                "Potential_2"
                                                            );
                                                        } else {
                                                            continue;
                                                        }
                                                    }
                                                } else {
                                                    // console.log("There is a margin in the supporting element");
                                                    if (!potential3) {
                                                        // console.log("**** PUT POTENTIAL 3 HERE");
                                                        potential3 = true;
                                                        return RulePotential(
                                                            "Potential_3"
                                                        );
                                                    }
                                                }
                                            }
                                        } catch (e) {
                                            // Silence css access issues
                                        }
                                    }
                            }
                        } catch (e) {
                            // Silence css access issues
                        }
                    }
                }
            }
            // console.log("----------------------");
            // console.log("pass0 = "+pass0);
            // console.log("pass1 = "+pass1);
            // console.log("pass2 = "+pass2);
            // console.log("potential1 = "+potential1);
            // console.log("potential2 = "+potential2);
            // console.log("potential3 = "+potential3);
            if (pass0) return RulePass("Pass_0");
            if (pass1) return RulePass("Pass_2");
            if (pass2) return RulePass("Pass_3");
            if (potential1) return RulePotential("Potential_1");
            if (potential2) return RulePotential("Potential_2");
            if (potential3) return RulePotential("Potential_3");
        },
    },
    {
        /**
         * Description: Trigger when color is used, but has no semantic meaning.
         * Origin: RPT 5.6 G466 Error
         */
        id: "RPT_Style_ColorSemantics1",
        context: "dom:style, dom:*[style], dom:font[color], dom:link",
        run: (
            context: RuleContext,
            options?: {}
        ): RuleResult | RuleResult[] => {
            const ruleContext = context["dom"].node as Element;
            let nodeName = ruleContext.nodeName.toLowerCase();
            let styleText = "";
            if (nodeName == "style") {
                styleText = RPTUtil.getInnerText(ruleContext).toLowerCase();
                // check import
                for (
                    let sIndex = 0;
                    sIndex < ruleContext.ownerDocument.styleSheets.length;
                    sIndex++
                ) {
                    let sheet = ruleContext.ownerDocument.styleSheets[
                        sIndex
                    ] as CSSStyleSheet;
                    if (sheet && sheet.ownerNode == ruleContext) {
                        try {
                            let styleRules = sheet.cssRules
                                ? sheet.cssRules
                                : sheet.rules;
                            for (
                                let styleRuleIndex = 0;
                                styleRuleIndex < styleRules.length;
                                styleRuleIndex++
                            ) {
                                let styleRule = styleRules[styleRuleIndex];
                                let styleImportRule: CSSImportRule;
                                if (
                                    styleRule.type &&
                                    styleRule.type === CSSRule.IMPORT_RULE &&
                                    (styleImportRule =
                                        styleRule as CSSImportRule).styleSheet
                                ) {
                                    let importRules = styleImportRule.styleSheet
                                        .cssRules
                                        ? styleImportRule.styleSheet.cssRules
                                        : styleImportRule.styleSheet.rules;
                                    for (
                                        let rIndex = 0;
                                        rIndex < importRules.length;
                                        rIndex++
                                    ) {
                                        let iRule = importRules[rIndex];
                                        styleText += iRule.cssText;
                                    }
                                }
                            }
                        } catch (e) {
                            // Silence css access issues
                        }
                    }
                }
            } else if (ruleContext.hasAttribute("style")) {
                styleText = ruleContext.getAttribute("style").toLowerCase();
            } else if (
                nodeName == "link" && //check external styles
                ruleContext.hasAttribute("rel") &&
                ruleContext.getAttribute("rel").toLowerCase() == "stylesheet" &&
                ruleContext.hasAttribute("href") &&
                ruleContext.getAttribute("href").trim().length !== 0
            ) {
                for (
                    let sIndex = 0;
                    sIndex < ruleContext.ownerDocument.styleSheets.length;
                    sIndex++
                ) {
                    let sheet = ruleContext.ownerDocument.styleSheets[
                        sIndex
                    ] as CSSStyleSheet;
                    if (sheet && sheet.ownerNode === ruleContext) {
                        try {
                            let rules = sheet.cssRules
                                ? sheet.cssRules
                                : sheet.rules;
                            for (
                                let rIndex = 0;
                                rIndex < rules.length;
                                rIndex++
                            ) {
                                styleText += rules[rIndex].cssText;
                            }
                        } catch (e) {
                            // Silence css access issues
                        }
                    }
                }
            }
            let passed = true;

            // Defect 1022: Find uses of 'color' and '*background*' only
            let isBgUsed = styleText.match(/\bbackground\b/i);

            let theColorStyleToCheck = styleText.replace(/-color/g, "");
            let isColorUsed = theColorStyleToCheck.match(/\bcolor\b/i);

            if (ruleContext.hasAttribute("color") || isColorUsed || isBgUsed) {
                let goodTagNames = {
                    em: "",
                    strong: "",
                    cite: "",
                    dfn: "",
                    code: "",
                    samp: "",
                    kbd: "",
                    var: "",
                    abbr: "",
                    acronym: "",
                };
                // Color used � are there semantics involved?
                passed =
                    nodeName in goodTagNames ||
                    RPTUtil.getAncestor(ruleContext, goodTagNames) != null;
                if (!passed && ruleContext.hasChildNodes()) {
                    let nw = new NodeWalker(ruleContext);
                    while (!passed && nw.nextNode() && nw.node != ruleContext) {
                        passed = nw.node.nodeName.toLowerCase() in goodTagNames;
                    }
                }
            }
            // Trigger only once
            if (!passed) {
                let triggered = RPTUtil.getCache(
                    ruleContext.ownerDocument,
                    "RPT_Style_ColorSemantics1",
                    false
                );
                passed = triggered;
                RPTUtil.setCache(
                    ruleContext.ownerDocument,
                    "RPT_Style_ColorSemantics1",
                    true
                );
            }

            if (passed) return RulePass("Pass_0");
            if (!passed) return RulePotential("Potential_1");
        },
    },
    {
        /**
         * Description: Trigger when color is used, but has no semantic meaning.
         * Origin: Various
         */
        id: "RPT_Style_ExternalStyleSheet",
        context: "dom:link[rel], dom:style",
        run: (
            context: RuleContext,
            options?: {}
        ): RuleResult | RuleResult[] => {
            const ruleContext = context["dom"].node as Element;
            let passed = true;
            let nodeName = ruleContext.nodeName.toLowerCase();
            if (nodeName == "style") {
                passed =
                    RPTUtil.getInnerText(ruleContext).indexOf("@import url") ==
                    -1;
            } else if (nodeName == "link") {
                passed =
                    !ruleContext.hasAttribute("rel") ||
                    ruleContext.getAttribute("rel").toLowerCase() !=
                        "stylesheet";
            }
            return passed ? RulePass("Pass_0") : RulePotential("Potential_1");
        },
    },
    {
        /**
         * Description: Trigger on CSS that affects the focus box
         * Origin: RPT 5.6 G506 Error
         */
        id: "RPT_Style_HinderFocus1",
        context: "dom:style, dom:*[style]",
        run: (
            context: RuleContext,
            options?: {}
        ): RuleResult | RuleResult[] => {
            const validateParams = {
                skipNodes: {
                    value: ["table"],
                    type: "[string]",
                },
                regex1: {
                    value: /(^|})([^{]*){[^}]*(outline|border)[ \t]*\:/gi,
                    type: "regex",
                },
                regex2: {
                    value: /([a-z]+)[ \t]*(,|$)/gi,
                    type: "regex",
                },
            };
            const ruleContext = context["dom"].node as Element;
            let skipNodes = validateParams.skipNodes.value;

            let passed = true;
            // Note: link to be handled by RPT_Style_ExternalStyleSheet
            let nodeName = ruleContext.nodeName.toLowerCase();
            if (nodeName == "style") {
                let textValue = RPTUtil.getInnerText(ruleContext);
                let r = validateParams.regex1.value;
                r.lastIndex = 0;
                let m;
                let m2;
                while (passed && (m = r.exec(textValue)) != null) {
                    let selector = m[2];
                    let r2 = validateParams.regex2.value;
                    r2.lastIndex = 0;
                    while (passed && (m2 = r2.exec(selector)) != null) {
                        passed = skipNodes.includes(m2[1].trim().toLowerCase());
                    }
                }
            } else if (
                !ruleContext.hasAttribute("disabled") ||
                ruleContext.getAttribute("disabled").toLowerCase() == "false"
            ) {
                let textValue = ruleContext.getAttribute("style");
                passed =
                    skipNodes.includes(nodeName) ||
                    !/(outline|border)[ \t]*\:/.test(textValue);
            }
            if (passed) return RulePass("Pass_0");
            if (!passed) return RulePotential("Potential_1");
        },
    },
    {
        /**
         * Description: Trigger if :before and :after are used in CSS (Internal and External) with content
         * Origin: WCAG 2.0 F87
         */
        id: "WCAG20_Style_BeforeAfter",
        context: "dom:style, dom:link",
        run: (
            context: RuleContext,
            options?: {}
        ): RuleResult | RuleResult[] => {
            const ruleContext = context["dom"].node as Element;
            let passed = true;
            //check Internal styles
            if (ruleContext.nodeName.toLowerCase() == "style") {
                let css = RPTUtil.CSS(ruleContext);
                for (let i = 0; passed && i < css.length; ++i) {
                    // Guard against bad CSS
                    if (css[i].selector) {
                        passed =
                            (css[i].selector.indexOf(":before") == -1 &&
                                css[i].selector.indexOf(":after") == -1) ||
                            !("content" in css[i].values) ||
                            css[i].values["content"].trim().length == 0 ||
                            css[i].values["content"].trim() == '""' ||
                            css[i].values["content"].trim() == "''" ||
                            css[i].values["content"].trim() == "none" ||
                            css[i].values["content"].trim() == "attr(x)" ||
                            css[i].values["content"].trim() == "attr(y)";
                    }
                }

                // check special rules in the stylesheets
                if (passed) {
                    for (
                        let sIndex = 0;
                        sIndex < ruleContext.ownerDocument.styleSheets.length;
                        sIndex++
                    ) {
                        let sheet = ruleContext.ownerDocument.styleSheets[
                            sIndex
                        ] as CSSStyleSheet;
                        if (sheet.ownerNode === ruleContext) {
                            try {
                                let styleRules = sheet.cssRules
                                    ? sheet.cssRules
                                    : sheet.rules;
                                if (styleRules) {
                                    for (
                                        let styleRuleIndex = 0;
                                        passed &&
                                        styleRuleIndex < styleRules.length;
                                        styleRuleIndex++
                                    ) {
                                        let styleRule =
                                            styleRules[styleRuleIndex];

                                        // check @media rules
                                        //
                                        // The check 'if (styleRule instanceof CSSMediaRule)' doesn't work when run in Karma(but works in DAP)
                                        // so let's access the type directly as a workaround
                                        let styleMediaRule: CSSMediaRule;
                                        let styleImportRule: CSSImportRule;
                                        if (
                                            styleRule.type &&
                                            styleRule.type ===
                                                CSSRule.MEDIA_RULE
                                        ) {
                                            let styleMediaRule =
                                                styleRule as CSSMediaRule;
                                            let mediaRules =
                                                styleMediaRule.cssRules;
                                            if (mediaRules) {
                                                for (
                                                    let rIndex = 0;
                                                    passed &&
                                                    rIndex < mediaRules.length;
                                                    rIndex++
                                                ) {
                                                    let mRule = mediaRules[
                                                        rIndex
                                                    ] as any; // selectorText not recognized
                                                    if (
                                                        mRule.selectorText !==
                                                            null &&
                                                        mRule.selectorText !==
                                                            undefined
                                                    ) {
                                                        let rule =
                                                            mRule.selectorText.toLowerCase();
                                                        if (
                                                            rule.indexOf(
                                                                ":before"
                                                            ) !== -1 ||
                                                            rule.indexOf(
                                                                ":after"
                                                            ) !== -1
                                                        ) {
                                                            let content =
                                                                mRule.style[
                                                                    "content"
                                                                ];
                                                            if (
                                                                content &&
                                                                content.trim()
                                                                    .length
                                                            ) {
                                                                if (
                                                                    content.trim() !==
                                                                        '""' &&
                                                                    content.trim() !==
                                                                        "''" &&
                                                                    content.trim() !==
                                                                        "none" &&
                                                                    content.trim() !==
                                                                        "attr(x)" &&
                                                                    content.trim() !==
                                                                        "attr(y)"
                                                                ) {
                                                                    passed =
                                                                        false;
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        // check import rules
                                        else if (
                                            styleRule.type &&
                                            styleRule.type ===
                                                CSSRule.IMPORT_RULE &&
                                            (styleImportRule =
                                                styleRule as CSSImportRule)
                                                .styleSheet
                                        ) {
                                            let rules = styleImportRule
                                                .styleSheet.cssRules
                                                ? styleImportRule.styleSheet
                                                      .cssRules
                                                : styleImportRule.styleSheet
                                                      .rules;
                                            if (rules) {
                                                for (
                                                    let rIndex = 0;
                                                    passed &&
                                                    rIndex < rules.length;
                                                    rIndex++
                                                ) {
                                                    let importedRule =
                                                        rules[rIndex];
                                                    // check @media rules
                                                    if (
                                                        importedRule.type &&
                                                        importedRule.type ===
                                                            CSSRule.MEDIA_RULE
                                                    ) {
                                                        let mediaRules = (
                                                            importedRule as CSSMediaRule
                                                        ).cssRules;
                                                        if (mediaRules) {
                                                            for (
                                                                let mIndex = 0;
                                                                mIndex <
                                                                mediaRules.length;
                                                                mIndex++
                                                            ) {
                                                                let mRule =
                                                                    mediaRules[
                                                                        mIndex
                                                                    ] as any; // selectorText not recognized
                                                                if (
                                                                    mRule.selectorText !==
                                                                        null &&
                                                                    mRule.selectorText !==
                                                                        undefined
                                                                ) {
                                                                    let rule =
                                                                        mRule.selectorText.toLowerCase();
                                                                    if (
                                                                        rule.indexOf(
                                                                            ":before"
                                                                        ) !==
                                                                            -1 ||
                                                                        rule.indexOf(
                                                                            ":after"
                                                                        ) !== -1
                                                                    ) {
                                                                        let content =
                                                                            mRule
                                                                                .style[
                                                                                "content"
                                                                            ];
                                                                        if (
                                                                            content &&
                                                                            content.trim()
                                                                                .length
                                                                        ) {
                                                                            if (
                                                                                content.trim() !==
                                                                                    '""' &&
                                                                                content.trim() !==
                                                                                    "''" &&
                                                                                content.trim() !==
                                                                                    "none" &&
                                                                                content.trim() !==
                                                                                    "attr(x)" &&
                                                                                content.trim() !==
                                                                                    "attr(y)"
                                                                            ) {
                                                                                passed =
                                                                                    false;
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    } else if (
                                                        (importedRule as any)
                                                            .selectorText !==
                                                            null &&
                                                        (importedRule as any)
                                                            .selectorText !==
                                                            undefined
                                                    ) {
                                                        let rule = (
                                                            importedRule as any
                                                        ).selectorText.toLowerCase();
                                                        //support both single colon (:) and double colon (::) pseudo
                                                        if (
                                                            rule.indexOf(
                                                                ":before"
                                                            ) !== -1 ||
                                                            rule.indexOf(
                                                                ":after"
                                                            ) !== -1
                                                        ) {
                                                            let content = (
                                                                importedRule as any
                                                            ).style["content"];
                                                            if (
                                                                content &&
                                                                content.trim()
                                                                    .length
                                                            ) {
                                                                if (
                                                                    content.trim() !==
                                                                        '""' &&
                                                                    content.trim() !==
                                                                        "''" &&
                                                                    content.trim() !==
                                                                        "none" &&
                                                                    content.trim() !==
                                                                        "attr(x)" &&
                                                                    content.trim() !==
                                                                        "attr(y)"
                                                                ) {
                                                                    passed =
                                                                        false;
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch (e) {
                                // Ignore css access issues
                            }
                        }
                    }
                }
            }

            //check external styles
            if (
                ruleContext.nodeName.toLowerCase() == "link" &&
                ruleContext.hasAttribute("rel") &&
                ruleContext.getAttribute("rel").toLowerCase() == "stylesheet" &&
                ruleContext.hasAttribute("href") &&
                ruleContext.getAttribute("href").trim().length !== 0
            ) {
                for (
                    let sIndex = 0;
                    sIndex < ruleContext.ownerDocument.styleSheets.length;
                    sIndex++
                ) {
                    let sheet = ruleContext.ownerDocument.styleSheets[
                        sIndex
                    ] as CSSStyleSheet;
                    if (sheet && sheet.ownerNode === ruleContext) {
                        try {
                            let rules = sheet.cssRules
                                ? sheet.cssRules
                                : sheet.rules;
                            if (rules) {
                                for (
                                    let rIndex = 0;
                                    passed && rIndex < rules.length;
                                    rIndex++
                                ) {
                                    let ruleFromLink = rules[rIndex];
                                    // check @media rules
                                    if (
                                        ruleFromLink.type &&
                                        ruleFromLink.type === CSSRule.MEDIA_RULE
                                    ) {
                                        let mediaRules = (
                                            ruleFromLink as CSSMediaRule
                                        ).cssRules;
                                        if (mediaRules) {
                                            for (
                                                let mIndex = 0;
                                                passed &&
                                                mIndex < mediaRules.length;
                                                mIndex++
                                            ) {
                                                let mRule = mediaRules[
                                                    mIndex
                                                ] as any;
                                                if (
                                                    mRule.selectorText !==
                                                        null &&
                                                    mRule.selectorText !==
                                                        undefined
                                                ) {
                                                    let ruleSelTxt =
                                                        mRule.selectorText.toLowerCase();
                                                    if (
                                                        ruleSelTxt.indexOf(
                                                            ":before"
                                                        ) !== -1 ||
                                                        ruleSelTxt.indexOf(
                                                            ":after"
                                                        ) !== -1
                                                    ) {
                                                        let content =
                                                            mRule.style[
                                                                "content"
                                                            ];
                                                        if (
                                                            content &&
                                                            content.trim()
                                                                .length
                                                        ) {
                                                            if (
                                                                content.trim() !==
                                                                    '""' &&
                                                                content.trim() !==
                                                                    "''" &&
                                                                content.trim() !==
                                                                    "none" &&
                                                                content.trim() !==
                                                                    "attr(x)" &&
                                                                content.trim() !==
                                                                    "attr(y)"
                                                            ) {
                                                                passed = false;
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    } else if (
                                        (rules[rIndex] as any).selectorText !==
                                            null &&
                                        (rules[rIndex] as any).selectorText !==
                                            undefined
                                    ) {
                                        let rule = (
                                            rules[rIndex] as any
                                        ).selectorText.toLowerCase();
                                        //support both single colon (:) and double colon (::) pseudo
                                        if (
                                            rule.indexOf(":before") !== -1 ||
                                            rule.indexOf(":after") !== -1
                                        ) {
                                            let content = (rules[rIndex] as any)
                                                .style["content"];
                                            if (
                                                content &&
                                                content.trim().length
                                            ) {
                                                if (
                                                    content.trim() !== '""' &&
                                                    content.trim() !== "''" &&
                                                    content.trim() !== "none" &&
                                                    content.trim() !==
                                                        "attr(x)" &&
                                                    content.trim() !== "attr(y)"
                                                ) {
                                                    passed = false;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            // Ignore css access issues
                        }
                    }
                }
            }
            if (passed) return RulePass("Pass_0");
            if (!passed) return RulePotential("Potential_1");
        },
    },

    {
        /**
         * Description: Trigger when viewport units are used for font size.
         * Origin: Various
         */
        id: "WCAG21_Style_Viewport",
        context: "dom:link, dom:style, dom:*[style]",
        run: (
            context: RuleContext,
            options?: {}
        ): RuleResult | RuleResult[] => {
            const ruleContext = context["dom"].node as Element;
            let passed = true;
            let thePattern = /\d+(vw|vh|vmin|vmax)/gi;
            let nodeName = ruleContext.nodeName.toLowerCase();
            if (nodeName == "style") {
                for (
                    let sIndex = 0;
                    sIndex < ruleContext.ownerDocument.styleSheets.length;
                    sIndex++
                ) {
                    let sheet = ruleContext.ownerDocument.styleSheets[
                        sIndex
                    ] as CSSStyleSheet;
                    if (sheet.ownerNode === ruleContext) {
                        try {
                            let styleRules = sheet.cssRules
                                ? sheet.cssRules
                                : sheet.rules;
                            if (styleRules) {
                                for (
                                    let styleRuleIndex = 0;
                                    passed &&
                                    styleRuleIndex < styleRules.length;
                                    styleRuleIndex++
                                ) {
                                    let rule = styleRules[styleRuleIndex];
                                    if (
                                        rule.type &&
                                        rule.type === CSSRule.STYLE_RULE
                                    ) {
                                        let styleRule = rule as CSSStyleRule;
                                        if (styleRule.style["fontSize"]) {
                                            let fontSize =
                                                styleRule.style[
                                                    "fontSize"
                                                ].trim();
                                            let found =
                                                fontSize.match(thePattern);
                                            if (fontSize.length && found) {
                                                passed = false;
                                            }
                                        }
                                    }
                                    // check import rules
                                    else if (
                                        rule.type &&
                                        rule.type === CSSRule.IMPORT_RULE &&
                                        (rule as CSSImportRule).styleSheet
                                    ) {
                                        let importRule = rule as CSSImportRule;
                                        let rules = importRule.styleSheet
                                            .cssRules
                                            ? importRule.styleSheet.cssRules
                                            : importRule.styleSheet.rules;
                                        if (rules) {
                                            for (
                                                let rIndex = 0;
                                                passed && rIndex < rules.length;
                                                rIndex++
                                            ) {
                                                let importedRule = rules[
                                                    rIndex
                                                ] as any;
                                                if (
                                                    importedRule.type &&
                                                    importedRule.type ===
                                                        CSSRule.STYLE_RULE
                                                ) {
                                                    if (
                                                        importedRule.style[
                                                            "fontSize"
                                                        ]
                                                    ) {
                                                        let fontSize =
                                                            importedRule.style[
                                                                "fontSize"
                                                            ].trim();
                                                        let found =
                                                            fontSize.match(
                                                                thePattern
                                                            );
                                                        if (
                                                            fontSize.length &&
                                                            found
                                                        ) {
                                                            passed = false;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            // Ignore css access issues
                        }
                    }
                }
            } else if (nodeName == "link") {
                for (
                    let sIndex = 0;
                    sIndex < ruleContext.ownerDocument.styleSheets.length;
                    sIndex++
                ) {
                    let sheet = ruleContext.ownerDocument.styleSheets[
                        sIndex
                    ] as CSSStyleSheet;
                    if (sheet && sheet.ownerNode === ruleContext) {
                        try {
                            let rules = sheet.cssRules
                                ? sheet.cssRules
                                : sheet.rules;
                            if (rules) {
                                for (
                                    let rIndex = 0;
                                    passed && rIndex < rules.length;
                                    rIndex++
                                ) {
                                    let ruleFromLink = rules[rIndex] as any;
                                    // check rules
                                    if (
                                        ruleFromLink.type &&
                                        ruleFromLink.type === CSSRule.STYLE_RULE
                                    ) {
                                        if (ruleFromLink.style["fontSize"]) {
                                            let fontSize =
                                                ruleFromLink.style[
                                                    "fontSize"
                                                ].trim();
                                            let found =
                                                fontSize.match(thePattern);
                                            if (fontSize.length && found) {
                                                passed = false;
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            // Ignore css access issues
                        }
                    }
                }
            } else {
                let styleValue = ruleContext.getAttribute("style");
                if (styleValue) {
                    let stylePattern = /font-size:\s*\d+(vw|vh|vmin|vmax)/gi;
                    let found = styleValue.match(stylePattern);
                    if (found) {
                        passed = false;
                    }
                }
            }

            return passed ? RulePass("Pass_0") : RulePotential("Potential_1");
        },
    },
];
export { a11yRulesStyle };
