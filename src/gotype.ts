import { DetectResult, DATE, GIT_NAME, LINEUPDATE, LINEUNKOWN, UPDATE, parseOriginAnnotation, parseTemplate, LineTemplate, originContent } from "./func";
import { Ctx } from "./generate";
import * as vscode from 'vscode';

export type GoType = {
    name: string;
    type: string;

};

// match "type XXX ..."
const typeRegexPattern = RegExp("^\\s*type\\s*(\\w+)(?:\\s+(\\w+))?\\s*");

export function detect(ctx: Ctx): DetectResult | null {
    let f = {} as GoType;
    let funcRegexMatcher = typeRegexPattern.exec(ctx.code.code);

    if (!funcRegexMatcher) {
        return null;
    }
    f.name = funcRegexMatcher[1];
    f.type = funcRegexMatcher[2];
    let res = {} as DetectResult;
    res.result = (f);
    res.startLine = (ctx.code.startLine);
    res.code = (ctx.code.code);
    let match = RegExp("^(\\s*)\\w+").exec(ctx.code.code);
    if (match) {
        res.linePrefix = (match[1]);
    }

    return res;
}



const DEFAULTTYPETEMPLATE = "// ${type_name} \n";

const TYPE_NAME = "${type_name}";
const TYPE_TYPE = "${type_type}";

const KEYS = [
    TYPE_NAME,
    TYPE_TYPE,
    DATE,
    GIT_NAME,
];


// default template code

// const PACKAGE_NAME = "${package_name}";

// function lineType(line: string): number {
//     if (line.includes(UPDATE)) {
//         return LINEUPDATE;
//     }
//     return LINEUNKOWN;
// }

export function generateComment(ctx: Ctx, result: DetectResult): string | null {

    let type: GoType = result.result;

    let originAnnotation = null;
    if (ctx.code.annotation.find) {
        originAnnotation = parseOriginAnnotation(ctx);
    }

    const config = vscode.workspace.getConfiguration();
    let templateStr:string|undefined = config.get("typeTemplate");

    if (!templateStr || templateStr === undefined || RegExp("^\\s*$").test(templateStr)) {
        templateStr = DEFAULTTYPETEMPLATE;
    }

    let template = parseTemplate(ctx, KEYS, templateStr);
    if (null === template) {
        return "";
    }

    let annotation = "";

    for (let i = 0; i < template.lines.length; i++) {
        let lineTemplate = template.lines[i];
        let line = lineTemplate.lineTemplate;
        switch (lineTemplate.type) {
            case LINEUNKOWN:
            case LINEUPDATE:
            default:
                line = replaceKey(ctx, type, lineTemplate);
                line = formatLine(ctx, i === 0, type, lineTemplate, originAnnotation, annotation, result.linePrefix, line);
                annotation = line + "\n";
        }
    }
    if (RegExp("^\\s*$").test(annotation)) {
        return null;
    }
    annotation = annotation.substring(0, annotation.length - "\n".length);

    if (template.annotateType === 1 || template.annotateType === 2) {
        annotation = "/*" + annotation;
        switch (template.annotateType) {
            case 1:
                annotation = annotation + "*/";
                break;
            case 2:
                annotation = annotation + "\n" + "*/";
                break;
            default:
        }
    }
    return annotation;
}

function formatLine(ctx: Ctx, firstLine: boolean, type: GoType, lineTemplate: LineTemplate, originAnnotation: string[] | null, annotation: string, linePrefix: string, line: string): string {

    let content = "";
    if (firstLine && originAnnotation !== null && originAnnotation.length === 1 &&
        RegExp("^\\s*(?://|/\\*)\\s*\\$\\{type_name\\}").test(lineTemplate.lineTemplate)) {
        let origin = originAnnotation[0];
        if (RegExp("^\\s*(?://|/\\*)\\s*" + type.name).test(origin)) {
            let m = RegExp("^\\s*(?://|/\\*)\\s*" + type.name + "\\s*(.*)").exec(origin);
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


function replaceKey(ctx: Ctx, type: GoType, lineTemplate: LineTemplate): string {
    let line = lineTemplate.lineTemplate;
    for (let j = 0; j < lineTemplate.keys.length; j++) {
        switch (lineTemplate.keys[j]) {
            case TYPE_NAME:
                line = line.replace(TYPE_NAME, type.name);
                break;
            case TYPE_TYPE:
                line = line.replace(TYPE_TYPE, type.type);
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

