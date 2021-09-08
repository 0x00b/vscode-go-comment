import { DetectResult, DATE, GIT_NAME, LINEUPDATE, LINETYPE, UPDATE, parseOriginAnnotation, parseTemplate, LineTemplate, originContent } from "./func";
import { Ctx } from "./generate";
import * as vscode from 'vscode';

export type GoVar = {
    name: string;
    type: string;

};

// match "type XXX ..."
const varRegexPattern = RegExp("^\\s*(?:var)?\\s*(\\w+)(?:\\s+(\\w+))?\\s*");

export function detect(ctx: Ctx): DetectResult | null {
    let f = {} as GoVar;
    let funcRegexMatcher = varRegexPattern.exec(ctx.code.code);

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



const DEFAULTTYPETEMPLATE = "// ${var_name} \n";

const VAR_NAME = "${var_name}";
const VAR_TYPE = "${var_type}";

const KEYS = [
    VAR_NAME,
    VAR_TYPE,
    DATE,
    GIT_NAME,
];


// default template code

// const PACKAGE_NAME = "${package_name}";

// function lineType(line: string): number {
//     if (line.includes(UPDATE)) {
//         return LINEUPDATE;
//     }
//     return LINETYPE;
// }

export function generateComment(ctx: Ctx, result: DetectResult): string | null {

    let type: GoVar = result.result;

    let originAnnotation = null;
    if (ctx.code.annotation.find) {
        originAnnotation = parseOriginAnnotation(ctx);
    }

    const config = vscode.workspace.getConfiguration();
    let templateStr:string|undefined = config.get("varTemplate");

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
            case LINETYPE:
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

function formatLine(ctx: Ctx, firstLine: boolean, type: GoVar, lineTemplate: LineTemplate, originAnnotation: string[] | null, annotation: string, linePrefix: string, line: string): string {

    let content = "";
    if (firstLine && originAnnotation !== null && originAnnotation.length === 1 &&
        RegExp("^\\s*(?://|/\\*)\\s*\\$\\{var_name\\}").test(lineTemplate.lineTemplate)) {
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
        content = originContent(ctx, originAnnotation, line);
    }

    //      content.split("\n");

    annotation += linePrefix + line + content;

    return annotation;

}


function replaceKey(ctx: Ctx, type: GoVar, lineTemplate: LineTemplate): string {
    let line = lineTemplate.lineTemplate;
    for (let j = 0; j < lineTemplate.keys.length; j++) {
        switch (lineTemplate.keys[j]) {
            case VAR_NAME:
                line = line.replace(VAR_NAME, type.name);
                break;
            case VAR_TYPE:
                line = line.replace(VAR_TYPE, type.type);
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

