
import * as generate from "./generate";
import * as vscode from 'vscode';

export function generateFunc(ctx: generate.Ctx) {


}

export type Variable = {
    name: string,
    type: string
};

export function parseString(code: string): Variable | null {

    if (!code || code === undefined || code.trim() === "") {
        return null;
    }
    let variable = {} as Variable;
    let res = RegExp(/^(?:\s*(\w*)\s+)?(.*)\s*/).exec(code);
    if (res !== null) {
        variable.name = res[1];
        variable.type = res[2];
        return variable;
    }

    return null;
}
export function parseGeneric(code: string): Variable[] | null {
    if (!code || code === undefined || code.trim() === "") {
        return null;
    }
    let typeStrs = code.split(",");
    let res = [] as Variable[];
    for (const i in typeStrs) {
        let t = parseString(typeStrs[i]);
        if (t !== null) {
            res.push(t);
        }
    }
    return res;
}

export type GoFunc = {
    //函数名
    name: string,
    //函数接收器
    generics: Variable[] | null,
    //函数接收器
    receiver: Variable | null,
    //参数
    parameters: Variable[] | null,
    //返回值
    returns: Variable[] | null,

};

function autoComplete(func: GoFunc): GoFunc | null {
    if (func !== null) {
        func.parameters = autoCompleteList(func.parameters);
        func.returns = autoCompleteList(func.returns);
    }
    return func;
}

//自动补全参数的name和type
//使用后面的type来作为前面无type的参数的type
function autoCompleteList(list: Variable[] | null): Variable[] | null {
    if (null === list || list.length === 0) {
        return list;
    }
    let lastName = list[list.length - 1].name;
    if (lastName?.trim() === "") {
        return list;
    }
    let lastType = "";
    for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].name && list[i].name !== "") {
            lastType = list[i].type;
        } else if (lastType && lastType !== "") {
            list[i].name = list[i].type;
            list[i].type = lastType;
        }
    }
    return list;
}

function parse(code: string) {

    let f = {} as GoFunc;
    //func (r receiver) Foo [T] (
    let res = RegExp(/^\s*(?:func(?:\s+|\s+\(([\w\s\*]+)\)\s+))?(\w+)\s*(?:\[([\w\*\|\s,]*)\])*\s*\(/).exec(code);
    if (res !== null) {
        f.receiver = parseString(res[1]);
        f.name = res[2];
        f.generics = parseGeneric(res[3]);
        //parse parameters and return parameters
        return parseInParams(f, code, res[0].length);

    } else {
        //type Foo func(
        let res = RegExp(/^\s*type\s*(\w+)\s*func\s*\(/).exec(code);
        if (res !== null) {

            f.name = res[1];
            //parse parameters and return parameters
            return parseInParams(f, code, res[0].length);
        }
    }

    //not function
    return null;
}

type ParseParamsResult = {
    list: Variable[],
    start: number

};

function parseParams(list: Variable[], code: string, start: number): ParseParamsResult | null {

    // (x1, x2 int, f func(t1, t2 interface{}) )

    let end = findBracketEnd(code, start, false);
    if (-1 === end) {
        return null;
    }
    let paramCode = code.substring(start, end);
    let params = paramCode.split(",");

    for (let i = 0; i < params.length; i++) {
        let p = params[i];
        if (p && p !== undefined && RegExp(/.*func\s*\(/).test(p)) {
            //find end ')
            let paramEnd = findBracketEnd(code, start, true);
            if (-1 === paramEnd) {
                return null;
            }

            paramEnd += 1;

            //如果有返回值，找到结束位置
            if (!RegExp("^\\s*\\,").test(code.substring(paramEnd))) {
                let returnResult = parseReturns(code, paramEnd);
                if (returnResult !== null) {
                    paramEnd = returnResult.start;
                }
            }

            let funcParam = code.substring(start, paramEnd);
            let v = parseString(funcParam);
            if (v !== null) {
                list.push(v);
            }

            start = paramEnd + 1;
            if (start < end) {
                return parseParams(list, code, start);
            } else {
                break;
            }
        }

        let v = parseString(p);
        if (v !== null) {
            list.push(v);
        }
        start += p.length + 1;
    }

    let result = {} as ParseParamsResult;
    result.list = list;
    result.start = start;
    return result;
}

function parseInParams(func: GoFunc, code: string, start: number) {

    let list = [] as Variable[];
    let result = parseParams(list, code, start);
    if (result === null) {
        return null;
    }
    func.parameters = result.list;

    let returns = parseReturns(code, result.start);
    if (returns !== null) {
        func.returns = returns.list;
    }

    return func;
}

function parseReturns(code: string, start: number): ParseParamsResult | null {

    let returnParam = code.substring(start);

    let matcher = RegExp("^\\s*\\(").exec(returnParam);
    if (matcher !== null) {
        let list = [] as Variable[];
        let result = parseParams(list, code, start + matcher[0].length);
        if (result === null) {
            return null;
        }
        return result;
    } else {
        let ps = returnParam.split("\n");
        if (ps.length > 0) {
            let matcher1 = RegExp("^\\s*func\\s*\\(").exec(ps[0]);
            if (matcher1 !== null) {
                //TODO 返回值 func (
                let list = [] as Variable[];
                let result = parseParams(list, code, start + matcher1[0].length);
                if (result?.list === null) {
                    result.list = [];
                }
                if (result !== null) {
                    let retResult = parseReturns(code, result.start);
                    if (retResult !== null) {
                        let v = parseString(code.substring(start, retResult.start));
                        if (v !== null) {
                            result.list.push(v);
                        }
                        return result;
                    }
                    let v = parseString(code.substring(start, result.start));
                    if (v !== null) {
                        result.list.push(v);
                    }
                    return result;
                }
            }

            let result = {} as ParseParamsResult;
            result.list = [];
            matcher = RegExp("^\\s*(\\**\\[*\\w*\\]*\\**\\w*\\.*\\w*(?:\\{\\})*)\\s*\\,?\\{?\\s*").exec(ps[0]);
            if (matcher !== null) {
                let v = parseString(matcher[1]);
                if (v !== null) {
                    result.list.push(v);
                }

                result.start = start + ps[0].indexOf(matcher[1]) + matcher[1].length;
                return result;
            }
        }
    }

    return null;
}


function findBracketEnd(code: string, start: number, hasFirstBracket: boolean) {
    let stack = [];
    if (!hasFirstBracket) {
        stack.push("(");
    }
    for (let i = start; i < code.length; i++) {
        let ch = code.charAt(i);
        if (ch === '(') {
            stack.push("(");
        }
        if (ch === ')') {
            stack.pop();
            if (stack.length === 0) {
                //find parameters end position
                return i;
            }
        }
    }
    return -1;
}

export type DetectResult = {
    //是否命中类型
    code: string;
    //code的起始行
    startLine: number;

    result: any;

    linePrefix: string;
};

export function detect(ctx: generate.Ctx): DetectResult | null {

    let func = parse(ctx.code.code);
    if (func === null) {
        return null;
    }

    func = autoComplete(func);

    let funcCode = ctx.code.code;
    let res = {} as DetectResult;
    res.result = func;
    res.code = funcCode;
    res.startLine = ctx.code.startLine;
    let matcher = RegExp("^(\\s*)\\w+").exec(funcCode);
    if (matcher !== null) {
        res.linePrefix = matcher[1];
    }

    return res;
}

export class LineTemplate {
    keys: string[];
    lineTemplate: string;
    type: number;

    constructor(keys: string[],
    lineTemplate: string,
    type: number) {
        this.keys = keys;
        this.lineTemplate = lineTemplate;
        this.type = type;
    }
    // 拷贝构造函数
    static from(lt: LineTemplate): LineTemplate {
        return new LineTemplate(lt.keys, lt.lineTemplate,lt.type);
    }

};


// current date
export const DATE = "${date}";
export const GIT_NAME = "${git_name}";

export const UPDATE = "@update";

export const LINE_DATE = "@date";
export const LINE_AUTHOR = "@author";


export const LINEUNKOWN = 0;
export const LINEUPDATE = 1;
export const LINEDATE = 2;
export const LINEAUTHOR = 3;
const LINERECEIVER = 4;
const LINEPARAM = 5;
const LINERETURN = 6;
const LINEFUNC = 7;
const LINEGENERIC = 8;

type Template = {
    lines: LineTemplate[]

    // 0:// other: /**/
    annotateType: number
};

export function parseTemplate(ctx: generate.Ctx, keys: string[], tempStr: string): Template | null {

    let template = {} as Template;
    template.lines = [];

    if (!tempStr.startsWith("//") && !tempStr.startsWith("/*")) {
        return null;
    }

    if (tempStr.startsWith("/*")) {
        ///*
        // aaa*/
        template.annotateType = 1;
        tempStr = tempStr.substring(2, tempStr.lastIndexOf("*/"));
        if (tempStr.charAt(tempStr.length - 1) === '\n') {
            // /*
            // * aaa
            // */
            template.annotateType = 2;
        }
    }

    let lines = tempStr.split("\n");

    for (let i = 0; i < lines.length; i++) {
        let kt = {} as LineTemplate;
        kt.keys = [] as string[];

        //空行
        if (RegExp("^\\s*$").test(lines[i])) {
            continue;
        }

        if (!RegExp(".*\\s+$").test(lines[i])) {
            //主动补个空格,真正的注释是空格后的，查找原注释内容按照这个规则
            lines[i] += " ";
        }
        kt.lineTemplate = lines[i];
        kt.type = templateLineType(kt.lineTemplate);

        for (let j = 0; j < keys.length; j++) {
            if (lines[i].includes(keys[j])) {
                kt.keys.push(keys[j]);
            }
        }
        template.lines.push(kt);
    }
    return template;
}

export function parseOriginAnnotation(ctx: generate.Ctx): string[] | null {
    if (!ctx.code.annotation.find) {
        return null;

    }
    let content = ctx.code.annotation.annotation;
    let lines = content.split("\n");
    if (lines.length === 0) {
        return null;
    }

    let annotations = [] as string[];

    let current = 0;
    annotations.push(lines[0]);


    for (let i = 1; i < lines.length; i++) {
        //空行
        if (RegExp("^\\s*$").test(lines[i])) {
            continue;
        }

        let type = lineType(lines[i]);
        if (type === LINEUNKOWN) {
            annotations[current] = annotations[current] + "\n" + lines[i];
            continue;
        }
        current++;
        annotations.push(lines[i]);
    }

    return annotations;
}



function escapeSpecialRegexChars(str: string): string {
    return str.replace(/[\{\}\(\)\\\[\]\.\+\*\?\^\$\|]/g, '\\$&');
}

export function originContent(ctx: generate.Ctx, originAnnotation: string[] | null, line: string, firstLine: boolean) {
    if (originAnnotation === null || originAnnotation === undefined) {
        return "";
    }

    line = escapeSpecialRegexChars(line);

    let reg = line.replace(/\s+/g, "\\s*") + "\\s+(.+)";
    for (const i in originAnnotation) {
        let s = originAnnotation[i];
        let matcher = RegExp(reg).exec(s);
        if (matcher !== null) {
            let t = matcher[1];
            if (RegExp("^\\s*$").test(t)) {
                return "";
            }
            return s.substring(s.lastIndexOf(t));
        }
    }
    if (firstLine && originAnnotation.length > 0) {
        let anno = RegExp(/^(\s*[\/|\*]*\s*).*/g).exec(originAnnotation[0]);
        if (anno && anno.length > 1) {
            return originAnnotation[0].substring(anno[1].length);
        }
    }
    return "";
}




// default template code
const DEFAULTFUNCTEMPLATE = "// ${func_name} \n" +
"// @receiver ${receiver_name} \n" +
"// @param ${param_name} \n" +
"// @return ${return_name} \n";

// current method name
const FUNCTION_NAME = "${func_name}";

// golang receiver
const RECEIVER_NAME_TYPE = "${receiver_name_type}";
// golang receiver name
const RECEIVER_NAME = "${receiver_name}";
// golang receiver type
const RECEIVER_TYPE = "${receiver_type}";

// param info
const PARAM_NAME_TYPE = "${param_name_type}";
// param name info
const PARAM_NAME = "${param_name}";
// param info
const PARAM_TYPE = "${param_type}";

// return info
const RET_NAME_TYPE = "${return_name_type}";
// return name
const RET_NAME = "${return_name}";
// return type
const RET_TYPE = "${return_type}";


let KEYS: string[] = [
    FUNCTION_NAME,
    RECEIVER_NAME_TYPE,
    RECEIVER_NAME,
    RECEIVER_TYPE,
    PARAM_NAME_TYPE,
    PARAM_NAME,
    PARAM_TYPE,
    RET_NAME_TYPE,
    RET_NAME,
    RET_TYPE,
    DATE,
    GIT_NAME,
];

const RECEIVER = "@receiver";
const PARAM = "@param";
const RETURN = "@return";

function lineType(line: string): number {
    if (line.includes(LINE_AUTHOR)) {
        return LINEAUTHOR;
    }
    if (line.includes(LINE_DATE)) {
        return LINEDATE;
    }
    if (line.includes(RECEIVER)) {
        return LINERECEIVER;
    }
    if (line.includes(PARAM)) {
        return LINEPARAM;
    }
    if (line.includes(RETURN)) {
        return LINERETURN;
    }
    if (line.includes(UPDATE)) {
        return LINEUPDATE;
    }
    return LINEUNKOWN;
}

function templateLineType(line: string): number {
    let t = lineType(line);
    if (t !== LINEUNKOWN) {
        return t;
    }
    if (line.includes(FUNCTION_NAME)) {
        return LINEFUNC;
    }
    return LINEUNKOWN;
}

// 记住一个原则，go的参数type一定会有，name不一定有
export function generateComment(ctx: generate.Ctx, result: DetectResult): string | null {

    // if (!result.result.GoFunc.class)) {
    //     return "";
    // }

    let func: GoFunc = result.result;

    let originAnnotation = null;
    if (ctx.code.annotation.find) {
        originAnnotation = parseOriginAnnotation(ctx);
    }
    let linePrefix = result.linePrefix;

    const config = vscode.workspace.getConfiguration();
    let templateStr:string|undefined = config.get("functionTemplate");

    if (!templateStr || RegExp("^\\s*$").test(templateStr)) {
        templateStr = DEFAULTFUNCTEMPLATE;
    }

    let template = parseTemplate(ctx, KEYS, templateStr);
    if (!template) {
        return null;
    }

    let annotation = "";

    for (let i = 0; i < template?.lines.length; i++) {
        let lineTemplate = template.lines[i];
        let line = lineTemplate.lineTemplate;
        switch (lineTemplate.type) {
            case LINEUNKOWN:
                break;
            case LINEPARAM:
                if (!func.parameters) {
                    break;
                }
                for (let j = 0; j < func.parameters.length; j++) {
                    line = replaceVariablesKey(ctx, line, func, lineTemplate, func.parameters[j]);
                    annotation = formatLine(ctx, i === 0, func, lineTemplate, originAnnotation, annotation, linePrefix, line) + "\n";
                }
                break;
            case LINERETURN:
                if (!func.returns) {
                    break;
                }
                for (let index = 0; index < func.returns.length; index++) {
                    line = replaceVariablesKey(ctx, line, func, lineTemplate, func.returns[index]);
                    annotation = formatLine(ctx, i === 0, func, lineTemplate, originAnnotation, annotation, linePrefix, line) + "\n";
                }
                break;
            case LINEDATE:
                let templine = getDateOriginAnotation(ctx, originAnnotation, line, i === 0);

                const datePattern = /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/;
                const match = templine.match(datePattern);
                if (match) {
                    const date = match[1]; // 提取日期部分
                    const newLineTpl = LineTemplate.from(lineTemplate);
                    // 先把时间替换了，replaceKey就不会更新时间了
                    newLineTpl.lineTemplate = newLineTpl.lineTemplate.replace(DATE, date);
                    templine = replaceKey(ctx, func, newLineTpl);
                    annotation += templine+'\n';
                } else {
                    line = replaceKey(ctx, func, lineTemplate);
                    annotation = formatLine(ctx, i === 0, func, lineTemplate, originAnnotation, annotation, linePrefix, line) + "\n";
                }
                break;
            case LINERECEIVER:
                if (!func.receiver) {
                    break;
                }
            case LINEUPDATE:
            case LINEFUNC:
            default:
                line = replaceKey(ctx, func, lineTemplate);
                annotation = formatLine(ctx, i === 0, func, lineTemplate, originAnnotation, annotation, linePrefix, line) + "\n";
        }
    }
    if (RegExp("^\\s*$").test(annotation)) {
        return null;
    }
    annotation = annotation.substring(0, annotation.length - "\n".length);
    //        annotation = annotation.replaceAll("\\s+$", "");

    if (template.annotateType === 1 || template.annotateType === 2) {
        let idx = annotation.indexOf(linePrefix);
        if (idx < 0) {
            annotation = linePrefix + "/*" + annotation;
        } else {
            let index = annotation.indexOf(linePrefix);
            if (-1 !== index) {
                annotation = annotation.substring(0, index) + linePrefix + "/*" + annotation.substring(index + linePrefix.length);
            }

        }
        switch (template.annotateType) {
            case 1:
                annotation = annotation + "*/";
                break;
            case 2:
                annotation = annotation + "\n" + linePrefix + "*/";
                break;
            default:
        }
    }
    return annotation;
}
function getDateOriginAnotation(ctx: generate.Ctx, originAnnotation: string[] | null, line: string, firstLine: boolean):string {
    if (!originAnnotation)
    {
        return "";
    }
    let content = "";
     for (const i in originAnnotation) { 
        if (originAnnotation[i].indexOf(LINE_DATE) > 0) {
            content = originAnnotation[i];
            break;
        }
    }
    return content;
}

function formatLine(ctx: generate.Ctx, firstLine: boolean, func: GoFunc, lineTemplate: LineTemplate, originAnnotation: string[] | null, annotation: string, linePrefix: string, line: string): string {

    let content = "";
    if (firstLine 
        && originAnnotation !== null 
        && originAnnotation.length === 1 
        && lineTemplate.type === LINEFUNC) {
        let origin = originAnnotation[0];
        if (RegExp("^\\s*(?://|/\\*)\\s*" + func.name).test(origin)) {
            let m = RegExp("^\\s*(?://|/\\*)\\s*" + func.name + "\\s*(.*)").exec(origin);
            if (m && !RegExp("^\\s*$").test(m[1])) {
                content = origin.substring(origin.indexOf(m[1]));
            }
        } else {
            //满足go规范的注释模版，如果原来的不满足，则直接用原来的注释补充第一行
            content = origin.trim().substring(2).trim();
        }

    } else {
        content = originContent(ctx, originAnnotation, line, firstLine);
    }

    //      content.split("\n");

    annotation += linePrefix + line + content;

    return annotation;

}


function replaceVariablesKey(ctx: generate.Ctx, line: string, func: GoFunc, lineTemplate: LineTemplate, variable: Variable): string {

    line = replaceKey(ctx, func, lineTemplate);

    for (let j = 0; j < lineTemplate.keys.length; j++) {
        let key = lineTemplate.keys[j];
        let type = 0;
        switch (lineTemplate.keys[j]) {
            case PARAM_NAME_TYPE:
            case RET_NAME_TYPE:
                type = 0;
                break;
            case PARAM_NAME:
            case RET_NAME:
                type = 1;
                break;
            case PARAM_TYPE:
            case RET_TYPE:
                type = 2;
                break;
        }
        line = replaceVariableKey(ctx, line, key, variable, type);
    }

    return line;

}

export function replaceVariableKey(ctx: generate.Ctx, line: string, key: string, variable: Variable, type: number): string {
    switch (type) {
        case 1: //name
            if (variable.name && !RegExp("^\\s*$").test(variable.name)) {
                line = line.replace(key, variable.name);
            } else {
                line = line.replace(key, variable.type);
            }
            break;
        case 2: //type
            line = line.replace(key, variable.type);
            break;
        default:
            if (variable.name && !RegExp("^\\s*$").test(variable.name) && !RegExp("^\\s*$").test(variable.type)) {
                line = line.replace(key, variable.name + " " + variable.type);
            } else {
                line = line.replace(key, variable.type);
            }
            break;
    }
    return line;
}

function replaceKey(ctx: generate.Ctx, func: GoFunc, lineTemplate: LineTemplate): string {
    let line = lineTemplate.lineTemplate;
    for (let j = 0; j < lineTemplate.keys.length; j++) {
        switch (lineTemplate.keys[j]) {
            case FUNCTION_NAME:
                line = line.replace(FUNCTION_NAME, func.name);
                break;
            case RECEIVER_NAME_TYPE:
                if (!func.receiver || RegExp("^\\s*$").test(func.receiver.type)) {
                    line = line.replace(RECEIVER_NAME_TYPE, "");
                    continue;
                }
                if (func.receiver.name && !RegExp("^\\s*$").test(func.receiver.name)) {
                    let value = func.receiver.name + " " + func.receiver.type;
                    line = line.replace(RECEIVER_NAME_TYPE, value);
                } else if (func.receiver.type) {
                    line = line.replace(RECEIVER_NAME_TYPE, func.receiver.type);
                }
                break;
            case RECEIVER_NAME:
                if (!func.receiver) {
                    line = line.replace(RECEIVER_NAME_TYPE, "");
                    continue;
                }
                if (func.receiver.name && !RegExp("^\\s*$").test(func.receiver.name)) {
                    line = line.replace(RECEIVER_NAME, func.receiver.name);
                } else if (func.receiver.type) {
                    line = line.replace(RECEIVER_NAME, func.receiver.type);
                }
                break;
            case RECEIVER_TYPE:
                if (!func.receiver || !func.receiver.type) {
                    continue;
                }
                line = line.replace(RECEIVER_TYPE, func.receiver.type);
                break;
            case DATE:
                line = line.replace(DATE, ctx.date);
            case GIT_NAME:
                line = line.replace(GIT_NAME, ctx.gitName);
            default:
        }
    }
    return line;
}


