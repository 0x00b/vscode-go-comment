

import * as generate from "./generate";


export type Annotation = {
    annotation: string
    startLine: number
    endLine: number
    find: boolean
    // 0: //  1: /**/
    type: number
};

export type FindCodeResult = {
    code: string;
    startLine: number;
    find: boolean;
    annotation: Annotation;
};


function findCodeAnnotation(ctx: generate.Ctx, lines: string[], lineNumber: number): Annotation {

    let res = {} as Annotation;
    res.find = false;
    if (lineNumber < 0 || lineNumber >= lines.length) {
        return res;
    }

    let start = getLineStartOffset(lines, lineNumber);

    let down = ctx.content.substring(start);

    //这里假设注释风格不会混用，只会单纯出现 // 或者 /**/

    // 找 /**/
    let aEnd = down.indexOf("*/");
    if (aEnd !== -1 && RegExp(".*\\*/\\s*$").test(lines[getLineNumber(lines, start + aEnd)])) {
        let tStart = down.indexOf("/*");
        if (tStart !== -1 && tStart < aEnd && RegExp("^\\s*/\\*.*").test(down)) {
            aEnd += start;
            tStart += start;
            res.find = true;
        } else if (tStart > aEnd || tStart === -1) {
            //当前行是/**/的中间,则注释是 tStart -> aEnd
            tStart = ctx.content.substring(0, start).lastIndexOf("/*");
            if (tStart !== -1) {
                aEnd += start;
                res.find = true;
            }
        }
        if (res.find) {
            res.type = 1;
            res.startLine = getLineNumber(lines, tStart);
            res.annotation = ctx.content.substring((tStart), (aEnd + "*/".length));//+2
            res.endLine = getLineNumber(lines, aEnd);
            return res;
        }
    }

    //找 //
    if (RegExp("^\\s*//.*").test(down)) {
        let anStart = lineNumber;
        aEnd = lineNumber;
        //往下找到结束的行
        for (let i = lineNumber + 1; i < lines.length; i++) {
            let line = lines[i].trim();
            if (RegExp("^\\s*$").test(line)) {
                //如果有空行，按照go注释标准，这个注释不是某代码块的注释
                res.find = false;
                return res;
            }
            if (line.startsWith("//")) {
                aEnd += 1;
                continue;
            }
            break;
        }
        // 往上找到开始的行
        for (let i = lineNumber - 1; i >= 0; i--) {
            let line = lines[i].trim();
            if ("" === line) {
                break;
            }
            if (line.startsWith("//")) {
                anStart -= 1;
                continue;
            }
            break;
        }
        res.type = 0;
        res.startLine = anStart;
        res.annotation = ctx.content.substring(
            getLineStartOffset(lines, anStart), getLineEndOffset(lines, aEnd));
        res.endLine = aEnd;
        res.find = true;
        return res;
    }
    return res;
}

export function findCodeStart(ctx: generate.Ctx): FindCodeResult {
    let res = {} as FindCodeResult;
    res.find = false;

    let lineNumber = ctx.editor.selection.active.line;
    let lines = ctx.content.split("\n");

    // TODO 空多行要不要处理

    //处理只空一行的情况
    if (RegExp("^\\s*$").test(lines[lineNumber])) {
        if (lineNumber + 1 < lines.length && !RegExp("^\\s*$").test(lines[lineNumber + 1])) {
            lineNumber += 1;
        } else {
            return res;
        }
    }

    let ann = findCodeAnnotation(ctx, lines, lineNumber);
    if (!ann.find) {
        if (lineNumber >= 1) {
            ann = findCodeAnnotation(ctx, lines, lineNumber - 1);
        }
    }

    if (ann.find) {
        res.annotation = ann;
        res.startLine = ann.endLine + 1;
        res.code = ctx.content.substring(getLineStartOffset(lines, res.startLine));
        return findCode(res);
    }
    res.annotation = {}as Annotation;
    res.annotation.find = false;
    res.startLine = lineNumber;
    res.code = ctx.content.substring(getLineStartOffset(lines, res.startLine));

    return findCode(res);
}

function findCode(res: FindCodeResult): FindCodeResult {
    //处理完了还是注释那就先不管了
    if (RegExp("^\\s*$").test(res.code) ||
        RegExp("^\\s*//.*").test(res.code,) ||
        RegExp("^\\s*/\\*.*").test(res.code) ||
        RegExp("^\\s*\\*/.*").test(res.code)) {
        res.find = false;
        return res;
    }
    //TODO find code end

    res.find = true;
    return res;
}



export function getLineStartOffset(lines: string[], line: number): number {
    let offset = 0;

    for (let index = 0; index < lines.length; index++) {
        const element = lines[index];
        if (index >= line) {
            return offset;
        }

        offset += element.length + 1;

    }

    return offset;
}

export function getLineEndOffset(lines: string[], line: number): number {
    let offset = 0;

    for (let index = 0; index < lines.length; index++) {
        const element = lines[index];
        offset += element.length + 1;
        if (index >= line) {
            return offset;
        }
    }
    return offset;
}


export function getLineNumber(lines: string[], pos: number): number {
    let offset = 0;

    for (let index = 0; index < lines.length; index++) {
        const element = lines[index];

        if (offset <= pos && pos <= offset + element.length) {
            return index;
        }
        offset += element.length + 1;
    }

    return offset;
}
