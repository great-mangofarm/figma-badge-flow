// src/code.ts

figma.showUI(__html__, { width: 320, height: 600 });
figma.root.setRelaunchData({ open: "" });
function rgbToHex(rgb: { r: number; g: number; b: number }): string {
    const toHex = (value: number) => {
        const hex = Math.round(value * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

// Helper function to convert HEX to Figma RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16) / 255,
              g: parseInt(result[2], 16) / 255,
              b: parseInt(result[3], 16) / 255,
          }
        : null;
}

// Badge size definitions
const badgeStyles = {
    large: { diameter: 32, textFontSize: 18 },
    medium: { diameter: 24, textFontSize: 14 },
    small: { diameter: 18, textFontSize: 12 },
} as const;

// Font definitions
const BADGE_FONT_FAMILY = "Inter";
const BADGE_FONT_STYLE = "Semi Bold"; // For badge numbers
const DESC_FRAME_TEXT_FONT_FAMILY = "Inter";
const DESC_FRAME_TEXT_FONT_STYLE = "Medium"; // For description text

// Plugin Data Keys for Badges
const BADGE_ITEM_PLUGIN_DATA_KEY = "isBadgeFlowItem_v2";
const BADGE_NUMBER_PLUGIN_DATA_KEY = "badgeNumber_v2";
const BADGE_SEQUENCE_ID_PLUGIN_DATA_KEY = "badgeSequenceId_v2";

// Plugin Data Keys for Description Frames
const DESC_FRAME_ITEM_PLUGIN_DATA_KEY = "isDescFrameItem_v1";
const DESC_FRAME_NUMBER_PLUGIN_DATA_KEY = "descFrameNumber_v1";
const DESC_FRAME_SEQUENCE_ID_PLUGIN_DATA_KEY = "descFrameSequenceId_v1";
const DESC_FRAME_SIZE_PLUGIN_DATA_KEY = "descFrameSizeType_v1"; // To store 'large', 'medium', 'small'

// --- Description Frame Definitions ---
const COMMON_DESCRIPTION_FRAME_PROPERTIES = {
    backgroundColor: { r: 1, g: 1, b: 1 }, // White
    cornerRadius: 10,
    placeholderText: "Enter text.",
    badgeTextSpacing: 8, // Space between badge and text block
    textColorHex: "#383838",
};

const descriptionFrameStyles = {
    large: {
        badgeSizeKey: "medium",
        frameWidth: 800,
        padding: 16,
        fontFamily: DESC_FRAME_TEXT_FONT_FAMILY,
        fontStyle: DESC_FRAME_TEXT_FONT_STYLE,
        fontSize: 18,
        lineHeight: 26,
    },
    medium: {
        badgeSizeKey: "small",
        frameWidth: 480,
        padding: 16,
        fontFamily: DESC_FRAME_TEXT_FONT_FAMILY,
        fontStyle: DESC_FRAME_TEXT_FONT_STYLE,
        fontSize: 16,
        lineHeight: 24,
    },
    small: {
        badgeSizeKey: "small",
        frameWidth: 360,
        padding: 12,
        fontFamily: DESC_FRAME_TEXT_FONT_FAMILY,
        fontStyle: DESC_FRAME_TEXT_FONT_STYLE,
        fontSize: 14,
        lineHeight: 20,
    },
} as const;
// --- End Description Frame Definitions ---

// 고유한 시퀀스 ID 생성 함수
function generateSequenceId(prefix: string = "seq"): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function createBadgeNode(
    badgeNumber: number,
    badgeSizeKey: keyof typeof badgeStyles,
    badgeColor: { r: number; g: number; b: number }
): Promise<GroupNode | null> {
    const style = badgeStyles[badgeSizeKey];
    if (!style) return null;

    await figma.loadFontAsync({
        family: BADGE_FONT_FAMILY,
        style: BADGE_FONT_STYLE,
    });

    const circle = figma.createEllipse();
    circle.resize(style.diameter, style.diameter);
    circle.fills = [{ type: "SOLID", color: badgeColor }];
    circle.name = "Badge Circle";

    const text = figma.createText();
    text.fontName = { family: BADGE_FONT_FAMILY, style: BADGE_FONT_STYLE };
    text.fontSize = style.textFontSize;
    text.characters = badgeNumber.toString();
    text.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }]; // White text
    text.textAlignHorizontal = "CENTER";
    text.textAlignVertical = "CENTER";
    text.name = "Badge Number";
    text.resize(style.diameter, style.diameter);
    text.x = circle.x;
    text.y = circle.y;

    const badgeGroup = figma.group([circle, text], figma.currentPage);
    badgeGroup.name = `Badge Only (${badgeNumber})`;
    return badgeGroup;
}

figma.ui.onmessage = async (msg) => {
    if (msg.type === "create-badge") {
        const options = msg.options.badge;
        const styleKey = options.size as keyof typeof badgeStyles;

        if (!badgeStyles[styleKey]) {
            figma.notify("Error: Invalid badge size.", {
                error: true,
            });
            return;
        }

        const badgeColorHex = options.color;
        const badgeFigmaColor = hexToRgb(badgeColorHex);

        if (!badgeFigmaColor) {
            figma.notify("Error: Invalid badge color.", {
                error: true,
            });
            return;
        }

        try {
            let currentSequenceId: string | null = null;
            const selection = figma.currentPage.selection;

            if (
                selection.length === 1 &&
                selection[0].getPluginData(BADGE_ITEM_PLUGIN_DATA_KEY) ===
                    "true"
            ) {
                currentSequenceId =
                    selection[0].getPluginData(
                        BADGE_SEQUENCE_ID_PLUGIN_DATA_KEY
                    ) || generateSequenceId("badge_seq");
            } else {
                currentSequenceId = generateSequenceId("badge_seq");
            }

            const allPluginBadges = figma.currentPage.findAll(
                (n) => n.getPluginData(BADGE_ITEM_PLUGIN_DATA_KEY) === "true"
            );

            const badgesInCurrentSequence = allPluginBadges.filter(
                (b) =>
                    b.getPluginData(BADGE_SEQUENCE_ID_PLUGIN_DATA_KEY) ===
                    currentSequenceId
            );

            let nextNumber = 1;
            if (badgesInCurrentSequence.length > 0) {
                const numbers = badgesInCurrentSequence.map((b) => {
                    const numStr = b.getPluginData(
                        BADGE_NUMBER_PLUGIN_DATA_KEY
                    );
                    return numStr ? parseInt(numStr, 10) : 0;
                });
                nextNumber =
                    Math.max(0, ...numbers.filter((n) => !isNaN(n))) + 1;
            }

            const badgeNode = await createBadgeNode(
                nextNumber,
                styleKey,
                badgeFigmaColor
            );
            if (!badgeNode) {
                figma.notify("Error: Failed to create badge node.", {
                    error: true,
                });
                return;
            }
            const parts = currentSequenceId.split("_");
            const displaySeqId =
                parts.length >= 3
                    ? parts[2].substring(0, 4)
                    : currentSequenceId.substring(currentSequenceId.length - 4);
            badgeNode.name = `N:${nextNumber} (${displaySeqId})`;

            badgeNode.setPluginData(BADGE_ITEM_PLUGIN_DATA_KEY, "true");
            badgeNode.setPluginData(
                BADGE_NUMBER_PLUGIN_DATA_KEY,
                nextNumber.toString()
            );
            badgeNode.setPluginData(
                BADGE_SEQUENCE_ID_PLUGIN_DATA_KEY,
                currentSequenceId
            );

            const centerX = figma.viewport.center.x;
            const centerY = figma.viewport.center.y;
            badgeNode.x = centerX - badgeNode.width / 2;
            badgeNode.y = centerY - badgeNode.height / 2;

            figma.currentPage.selection = [badgeNode];
            figma.notify(
                `Badge ${nextNumber} (Sequence ${displaySeqId}) created`,
                {
                    timeout: 2000,
                }
            );
        } catch (error) {
            console.error("Error creating badge:", error);
            const err = error as Error;
            figma.notify(`Error: ${err.message}`, {
                error: true,
                timeout: 3000,
            });
        }
    } else if (msg.type === "update-badge-color") {
        try {
            const { badgeId, newColor } = msg;
            const targetNode = (await figma.getNodeByIdAsync(
                badgeId
            )) as SceneNode | null;

            if (
                !targetNode ||
                targetNode.type !== "GROUP" ||
                targetNode.getPluginData(BADGE_ITEM_PLUGIN_DATA_KEY) !== "true"
            ) {
                figma.notify("Error: Target badge not found or invalid.", {
                    error: true,
                    timeout: 3000,
                });
                return;
            }

            const badgeColorHex = newColor;
            const badgeFigmaColor = hexToRgb(badgeColorHex);

            if (!badgeFigmaColor) {
                figma.notify("Error: Invalid badge color.", {
                    error: true,
                });
                return;
            }

            const circleNode = targetNode.children.find(
                (child) =>
                    child.type === "ELLIPSE" && child.name === "Badge Circle"
            ) as EllipseNode | undefined;

            if (!circleNode) {
                figma.notify("Error: Cannot find badge circle.", {
                    error: true,
                });
                return;
            }

            circleNode.fills = [{ type: "SOLID", color: badgeFigmaColor }];

            figma.notify("Badge color updated.", { timeout: 2000 });
        } catch (error) {
            console.error("Error updating badge color:", error);
            const err = error as Error;
            figma.notify(`Error: ${err.message}`, {
                error: true,
                timeout: 3000,
            });
        }
    } else if (msg.type === "create-description-frame") {
        const options = msg.options.descriptionFrame;
        const sizeKey = options.size as keyof typeof descriptionFrameStyles;

        if (!descriptionFrameStyles[sizeKey]) {
            figma.notify("Error: Invalid description frame size.", {
                error: true,
            });
            return;
        }
        const style = descriptionFrameStyles[sizeKey];
        const commonStyle = COMMON_DESCRIPTION_FRAME_PROPERTIES;

        try {
            await figma.loadFontAsync({
                family: BADGE_FONT_FAMILY,
                style: BADGE_FONT_STYLE,
            });
            await figma.loadFontAsync({
                family: style.fontFamily,
                style: style.fontStyle,
            });

            let currentSequenceId: string | null = null;
            const selection = figma.currentPage.selection;

            // Determine sequence ID for description frames
            if (
                selection.length === 1 &&
                selection[0].getPluginData(DESC_FRAME_ITEM_PLUGIN_DATA_KEY) ===
                    "true"
            ) {
                currentSequenceId =
                    selection[0].getPluginData(
                        DESC_FRAME_SEQUENCE_ID_PLUGIN_DATA_KEY
                    ) || generateSequenceId("desc_seq");
            } else {
                currentSequenceId = generateSequenceId("desc_seq");
            }

            const allDescFrames = figma.currentPage.findAll(
                (n) =>
                    n.getPluginData(DESC_FRAME_ITEM_PLUGIN_DATA_KEY) === "true"
            );
            const framesInCurrentSequence = allDescFrames.filter(
                (f) =>
                    f.getPluginData(DESC_FRAME_SEQUENCE_ID_PLUGIN_DATA_KEY) ===
                    currentSequenceId
            );

            let nextNumber = 1;
            if (framesInCurrentSequence.length > 0) {
                const numbers = framesInCurrentSequence.map((f) => {
                    const numStr = f.getPluginData(
                        DESC_FRAME_NUMBER_PLUGIN_DATA_KEY
                    );
                    return numStr ? parseInt(numStr, 10) : 0;
                });
                nextNumber =
                    Math.max(0, ...numbers.filter((n) => !isNaN(n))) + 1;
            }

            // 1. Create the main frame
            const frame = figma.createFrame();
            const parts = currentSequenceId.split("_");
            const displaySeqId =
                parts.length >= 3
                    ? parts[2].substring(0, 4)
                    : currentSequenceId.substring(currentSequenceId.length - 4);
            frame.name = `D:${nextNumber} (${displaySeqId}, ${sizeKey})`;

            // Styling
            frame.fills = [
                { type: "SOLID", color: commonStyle.backgroundColor },
            ];
            frame.cornerRadius = commonStyle.cornerRadius;
            frame.paddingLeft = style.padding;
            frame.paddingRight = style.padding;
            frame.paddingTop = style.padding;
            frame.paddingBottom = style.padding;
            frame.itemSpacing = commonStyle.badgeTextSpacing;
            frame.layoutMode = "HORIZONTAL";
            frame.primaryAxisSizingMode = "FIXED";
            frame.counterAxisSizingMode = "AUTO";

            // 2. Create the badge within the frame
            // For description frames, badge color is typically neutral or taken from a default. Let's use a default gray.
            // Or, if you want the user to select color for badges *inside* frames, the UI message needs to carry that.
            // For now, using a fixed color for badges in description frames.
            const badgeColorInFrame = hexToRgb("#383838") || {
                r: 56 / 255,
                g: 56 / 255,
                b: 56 / 255,
            };
            const internalBadge = await createBadgeNode(
                nextNumber,
                style.badgeSizeKey,
                badgeColorInFrame
            );
            if (internalBadge) {
                // 1) 래퍼 Frame 만들기
                const badgeWrapper = figma.createFrame();
                badgeWrapper.name = "Badge Wrapper";
                badgeWrapper.fills = []; // 배경 없음
                badgeWrapper.layoutMode = "VERTICAL"; // 세로 Auto-layout
                badgeWrapper.primaryAxisSizingMode = "FIXED"; // 높이 고정
                badgeWrapper.counterAxisSizingMode = "AUTO"; // 너비 hug
                badgeWrapper.primaryAxisAlignItems = "CENTER"; // 래퍼 안에서 뱃지 수직 중앙

                // 2) 래퍼 높이를 “첫 줄 행간”으로 맞추기
                badgeWrapper.resize(internalBadge.width, style.lineHeight);

                // 3) 뱃지를 래퍼에 붙이고, 래퍼를 최상단 정렬
                internalBadge.layoutAlign = "CENTER";
                badgeWrapper.appendChild(internalBadge);
                badgeWrapper.layoutAlign = "MIN"; // 부모 frame에서 TOP 정렬

                // 4) 래퍼를 부모 frame에 붙이기
                frame.appendChild(badgeWrapper);
            } else {
                figma.notify(
                    "Error: Failed to create badge in description frame.",
                    {
                        error: true,
                    }
                );
                frame.remove();
                return;
            }

            // 3. Create the text node
            await figma.loadFontAsync({
                family: style.fontFamily,
                style: style.fontStyle,
            });

            const textNode = figma.createText();
            textNode.name = "Description Text";
            textNode.fontName = {
                family: style.fontFamily,
                style: style.fontStyle,
            };
            textNode.fontSize = style.fontSize;
            textNode.lineHeight = { value: style.lineHeight, unit: "PIXELS" };
            textNode.characters = commonStyle.placeholderText;
            const textColor = hexToRgb(commonStyle.textColorHex);
            if (textColor) {
                textNode.fills = [{ type: "SOLID", color: textColor }];
            }
            textNode.textAlignHorizontal = "LEFT";
            textNode.textAlignVertical = "TOP"; // This works within the text box itself
            textNode.layoutAlign = "STRETCH"; // To fill vertical space if needed, or use 'MIN' or 'CENTER'
            textNode.layoutGrow = 1; // Allow text to take remaining horizontal space
            textNode.textAutoResize = "HEIGHT"; // Adjust height based on content

            frame.appendChild(textNode);
            frame.resize(style.frameWidth, frame.height);
            // Set plugin data on the main frame
            frame.setPluginData(DESC_FRAME_ITEM_PLUGIN_DATA_KEY, "true");
            frame.setPluginData(
                DESC_FRAME_NUMBER_PLUGIN_DATA_KEY,
                nextNumber.toString()
            );
            frame.setPluginData(
                DESC_FRAME_SEQUENCE_ID_PLUGIN_DATA_KEY,
                currentSequenceId
            );
            frame.setPluginData(DESC_FRAME_SIZE_PLUGIN_DATA_KEY, sizeKey);

            // Position and select
            const centerX = figma.viewport.center.x;
            const centerY = figma.viewport.center.y;
            frame.x = centerX - frame.width / 2;
            frame.y = centerY - frame.height / 2;

            figma.currentPage.selection = [frame];
            figma.notify(
                `Description frame ${nextNumber} (Sequence ${displaySeqId}) created`,
                { timeout: 2000 }
            );
        } catch (error) {
            console.error("Error creating description frame:", error);
            const err = error as Error;
            figma.notify(`Description frame creation error: ${err.message}`, {
                error: true,
                timeout: 3000,
            });
        }
    } else if (
        msg.type === "update-badge-number" ||
        msg.type === "update-description-frame-number"
    ) {
        const isDescriptionFrame =
            msg.type === "update-description-frame-number";
        try {
            const { badgeId, sequenceId, newNumber: newNumberInput } = msg;

            const ITEM_KEY = isDescriptionFrame
                ? DESC_FRAME_ITEM_PLUGIN_DATA_KEY
                : BADGE_ITEM_PLUGIN_DATA_KEY;
            const NUMBER_KEY = isDescriptionFrame
                ? DESC_FRAME_NUMBER_PLUGIN_DATA_KEY
                : BADGE_NUMBER_PLUGIN_DATA_KEY;
            const SEQUENCE_ID_KEY = isDescriptionFrame
                ? DESC_FRAME_SEQUENCE_ID_PLUGIN_DATA_KEY
                : BADGE_SEQUENCE_ID_PLUGIN_DATA_KEY;
            const NODE_TYPE_NAME = isDescriptionFrame
                ? "description frame"
                : "badge";
            const newNumber = parseInt(newNumberInput, 10);
            if (isNaN(newNumber) || newNumber < 1) {
                figma.notify(
                    `Error: New number must be a valid number of 1 or higher. (${NODE_TYPE_NAME})`,
                    { error: true, timeout: 3000 }
                );
                return;
            }

            const targetNode = (await figma.getNodeByIdAsync(
                badgeId
            )) as SceneNode | null;
            if (
                !targetNode ||
                (targetNode.type !== "GROUP" && targetNode.type !== "FRAME") ||
                targetNode.getPluginData(ITEM_KEY) !== "true"
            ) {
                figma.notify(
                    `Error: Target ${NODE_TYPE_NAME} not found or invalid.`,
                    { error: true, timeout: 3000 }
                );
                return;
            }

            const oldNumberStr = targetNode.getPluginData(NUMBER_KEY);
            if (!oldNumberStr) {
                figma.notify(
                    `Error: Cannot read current number of target ${NODE_TYPE_NAME}.`,
                    { error: true, timeout: 3000 }
                );
                return;
            }
            const oldNumber = parseInt(oldNumberStr, 10);
            if (isNaN(oldNumber)) {
                figma.notify(
                    `Error: Current number of target ${NODE_TYPE_NAME} is invalid.`,
                    { error: true, timeout: 3000 }
                );
                return;
            }

            if (newNumber === oldNumber) {
                figma.notify("Number not changed. (Same as existing number)", {
                    timeout: 2000,
                });
                figma.ui.postMessage({
                    type: isDescriptionFrame
                        ? "desc-frame-selection-changed"
                        : "selection-changed",
                    selectedItemInfo: {
                        id: targetNode.id,
                        number: oldNumber,
                        sequenceId: sequenceId,
                        itemType: isDescriptionFrame
                            ? "descriptionFrame"
                            : "badge",
                        size: isDescriptionFrame
                            ? targetNode.getPluginData(
                                  DESC_FRAME_SIZE_PLUGIN_DATA_KEY
                              )
                            : undefined,
                    },
                });
                return;
            }

            const allItemsInSequenceNodes = figma.currentPage.findAll(
                (n) =>
                    n.getPluginData(ITEM_KEY) === "true" &&
                    n.getPluginData(SEQUENCE_ID_KEY) === sequenceId &&
                    (n.type === "GROUP" || n.type === "FRAME") // Allow both types
            ) as (GroupNode | FrameNode)[];

            if (allItemsInSequenceNodes.length === 0) {
                figma.notify(
                    `Error: Cannot find ${NODE_TYPE_NAME} in sequence.`,
                    { error: true, timeout: 3000 }
                );
                return;
            }

            if (newNumber > allItemsInSequenceNodes.length) {
                figma.notify(
                    "Error: New number exceeds total items in sequence.",
                    { error: true, timeout: 4000 }
                );
                return;
            }

            const fontLoadPromises: Promise<void>[] = [];
            const defaultBadgeFont = {
                family: BADGE_FONT_FAMILY,
                style: BADGE_FONT_STYLE,
            };
            const defaultDescTextFont = {
                family: DESC_FRAME_TEXT_FONT_FAMILY,
                style: DESC_FRAME_TEXT_FONT_STYLE,
            };

            for (const itemNode of allItemsInSequenceNodes) {
                if (itemNode.type === "GROUP") {
                    // Badge
                    const textNode = itemNode.children.find(
                        (child) =>
                            child.type === "TEXT" &&
                            child.name === "Badge Number"
                    ) as TextNode | undefined;
                    if (textNode) {
                        const font = textNode.fontName as FontName; // Assuming single font
                        if (font && typeof font !== "symbol")
                            fontLoadPromises.push(figma.loadFontAsync(font));
                        else
                            fontLoadPromises.push(
                                figma.loadFontAsync(defaultBadgeFont)
                            );
                    }
                } else if (itemNode.type === "FRAME" && isDescriptionFrame) {
                    // Description Frame
                    // Badge inside frame
                    const badgeGroup = itemNode.children.find(
                        (child) => child.type === "GROUP"
                    ) as GroupNode | undefined;
                    if (badgeGroup) {
                        const badgeTextNode = badgeGroup.children.find(
                            (child) =>
                                child.type === "TEXT" &&
                                child.name === "Badge Number"
                        ) as TextNode | undefined;
                        if (badgeTextNode) {
                            const font = badgeTextNode.fontName as FontName;
                            if (font && typeof font !== "symbol")
                                fontLoadPromises.push(
                                    figma.loadFontAsync(font)
                                );
                            else
                                fontLoadPromises.push(
                                    figma.loadFontAsync(defaultBadgeFont)
                                );
                        }
                    }
                    // Description text (not numbered, but load its font just in case it was default and needs reload for some reason - less critical)
                    const descTextNode = itemNode.children.find(
                        (child) =>
                            child.type === "TEXT" &&
                            child.name === "Description Text"
                    ) as TextNode | undefined;
                    if (descTextNode) {
                        const font = descTextNode.fontName as FontName;
                        if (font && typeof font !== "symbol")
                            fontLoadPromises.push(figma.loadFontAsync(font));
                        else
                            fontLoadPromises.push(
                                figma.loadFontAsync(defaultDescTextFont)
                            );
                    }
                }
            }
            await Promise.all(fontLoadPromises);

            const itemsData = allItemsInSequenceNodes
                .map((node) => {
                    const numStr = node.getPluginData(NUMBER_KEY);
                    return {
                        node: node,
                        currentNumber: numStr ? parseInt(numStr, 10) : 0,
                    };
                })
                .filter(
                    (data) =>
                        !isNaN(data.currentNumber) && data.currentNumber > 0
                )
                .sort((a, b) => a.currentNumber - b.currentNumber);

            if (!itemsData.find((b) => b.node.id === targetNode.id)) {
                figma.notify(
                    `Error: Problem processing target ${NODE_TYPE_NAME} data.`,
                    { error: true, timeout: 3000 }
                );
                return;
            }

            const updatesToApply: Array<{
                node: GroupNode | FrameNode;
                finalNumber: number;
            }> = [];

            if (newNumber < oldNumber) {
                for (const item of itemsData) {
                    if (item.node.id === targetNode.id) {
                        updatesToApply.push({
                            node: item.node,
                            finalNumber: newNumber,
                        });
                    } else if (
                        item.currentNumber >= newNumber &&
                        item.currentNumber < oldNumber
                    ) {
                        updatesToApply.push({
                            node: item.node,
                            finalNumber: item.currentNumber + 1,
                        });
                    } else {
                        updatesToApply.push({
                            node: item.node,
                            finalNumber: item.currentNumber,
                        });
                    }
                }
            } else {
                for (const item of itemsData) {
                    if (item.node.id === targetNode.id) {
                        updatesToApply.push({
                            node: item.node,
                            finalNumber: newNumber,
                        });
                    } else if (
                        item.currentNumber > oldNumber &&
                        item.currentNumber <= newNumber
                    ) {
                        updatesToApply.push({
                            node: item.node,
                            finalNumber: item.currentNumber - 1,
                        });
                    } else {
                        updatesToApply.push({
                            node: item.node,
                            finalNumber: item.currentNumber,
                        });
                    }
                }
            }

            for (const update of updatesToApply) {
                const { node, finalNumber } = update;
                node.setPluginData(NUMBER_KEY, finalNumber.toString());

                let textNodeToUpdate: TextNode | undefined;
                if (node.type === "GROUP") {
                    textNodeToUpdate = node.children.find(
                        (child) =>
                            child.type === "TEXT" &&
                            child.name === "Badge Number"
                    ) as TextNode | undefined;
                } else if (node.type === "FRAME" && isDescriptionFrame) {
                    const badgeGroup = node.children.find(
                        (child) => child.type === "GROUP"
                    ) as GroupNode | undefined;
                    if (badgeGroup) {
                        textNodeToUpdate = badgeGroup.children.find(
                            (child) =>
                                child.type === "TEXT" &&
                                child.name === "Badge Number"
                        ) as TextNode | undefined;
                    }
                }

                if (textNodeToUpdate) {
                    textNodeToUpdate.characters = finalNumber.toString();
                }

                const seqIdFromNode = node.getPluginData(SEQUENCE_ID_KEY) || "";
                const parts = seqIdFromNode.split("_");
                const displaySeqId =
                    parts.length >= 3
                        ? parts[2].substring(0, 4)
                        : seqIdFromNode.substring(
                              Math.max(0, seqIdFromNode.length - 4)
                          );
                const sizeKey = isDescriptionFrame
                    ? node.getPluginData(DESC_FRAME_SIZE_PLUGIN_DATA_KEY)
                    : undefined;
                const sizeSuffix = sizeKey ? `, Size:${sizeKey}` : "";
                node.name = `${
                    isDescriptionFrame ? "DescFrame" : "Badge"
                } (S:${displaySeqId}, ${finalNumber}${sizeSuffix})`;
            }

            figma.currentPage.selection = [targetNode];

            const finalTargetNumberStr = targetNode.getPluginData(NUMBER_KEY);
            const currentSequenceId = targetNode.getPluginData(SEQUENCE_ID_KEY);

            if (finalTargetNumberStr && currentSequenceId) {
                figma.ui.postMessage({
                    type: isDescriptionFrame
                        ? "desc-frame-selection-changed"
                        : "selection-changed",
                    selectedItemInfo: {
                        id: targetNode.id,
                        number: parseInt(finalTargetNumberStr, 10),
                        sequenceId: currentSequenceId,
                        itemType: isDescriptionFrame
                            ? "descriptionFrame"
                            : "badge",
                        size: isDescriptionFrame
                            ? targetNode.getPluginData(
                                  DESC_FRAME_SIZE_PLUGIN_DATA_KEY
                              )
                            : undefined,
                    },
                });
            }

            figma.notify("Number updated and reordered.", { timeout: 2500 });
        } catch (error) {
            console.error(
                `Error updating ${
                    isDescriptionFrame ? "description frame" : "badge"
                } number:`,
                error
            );
            const err = error as Error;
            figma.notify(`Error: ${err.message}`, {
                error: true,
                timeout: 3000,
            });
        }
    } else if (msg.type === "cancel") {
        figma.closePlugin();
    }
};

figma.on("selectionchange", () => {
    const selection = figma.currentPage.selection;
    if (selection.length === 1) {
        const selectedNode = selection[0];
        let itemType: "badge" | "descriptionFrame" | null = null;
        let id: string | null = null;
        let numberStr: string | undefined | null = null;
        let sequenceId: string | undefined | null = null;
        let size: string | undefined | null = null;
        let color: string | undefined; // 색상 변수 추가

        if (selectedNode.getPluginData(BADGE_ITEM_PLUGIN_DATA_KEY) === "true") {
            itemType = "badge";
            id = selectedNode.id;
            numberStr = selectedNode.getPluginData(
                BADGE_NUMBER_PLUGIN_DATA_KEY
            );
            sequenceId = selectedNode.getPluginData(
                BADGE_SEQUENCE_ID_PLUGIN_DATA_KEY
            );

            if (selectedNode.type === "GROUP") {
                const groupNode = selectedNode as GroupNode;
                const circleNode = groupNode.children.find(
                    (child: SceneNode) =>
                        child.type === "ELLIPSE" &&
                        child.name === "Badge Circle"
                ) as EllipseNode | undefined;

                if (circleNode) {
                    const fills = circleNode.fills;
                    if (Array.isArray(fills) && fills.length > 0) {
                        const fill = fills[0] as Paint;
                        if (fill.type === "SOLID") {
                            const rgbColor = fill.color;

                            color = rgbToHex(rgbColor);
                        }
                    }
                }
            }
        } else if (
            selectedNode.getPluginData(DESC_FRAME_ITEM_PLUGIN_DATA_KEY) ===
            "true"
        ) {
            itemType = "descriptionFrame";
            id = selectedNode.id;
            numberStr = selectedNode.getPluginData(
                DESC_FRAME_NUMBER_PLUGIN_DATA_KEY
            );
            sequenceId = selectedNode.getPluginData(
                DESC_FRAME_SEQUENCE_ID_PLUGIN_DATA_KEY
            );
            size = selectedNode.getPluginData(DESC_FRAME_SIZE_PLUGIN_DATA_KEY);
        }

        if (itemType && id && numberStr && sequenceId) {
            figma.ui.postMessage({
                type:
                    itemType === "descriptionFrame"
                        ? "desc-frame-selection-changed"
                        : "selection-changed",
                selectedItemInfo: {
                    id: id,
                    number: parseInt(numberStr, 10),
                    sequenceId: sequenceId,
                    itemType: itemType,
                    size: size,
                    color: color,
                },
            });
        } else {
            figma.ui.postMessage({ type: "clear-selection" });
        }
    } else {
        figma.ui.postMessage({ type: "clear-selection" });
    }
});
