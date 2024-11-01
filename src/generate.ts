import * as vscode from 'vscode';
import * as fc from "./findcode";
import * as func from "./func";
import * as gotype from "./gotype";
import * as govar from "./govar";
import * as moment from "moment";

export type Ctx = {
    content: string
    editor: vscode.TextEditor
    code: fc.FindCodeResult

    date: string;
    gitName: string;
};


export function generate(ctx: Ctx) {

    ctx.code = fc.findCodeStart(ctx);
    if (!ctx.code.find) {
        return;
    }
  
    ctx.date = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
  
    var exec = require('child_process').execSync;
    ctx.gitName = exec('git config user.name').toString().trim();

    let res = func.detect(ctx);
    if (res !== null) {
        let comment = func.generateComment(ctx, res);
        if (null !== comment) {
            // vscode.window.showInformationMessage(comment);
            replaceAnnotation(ctx, res, comment);
        }
        return;
    }

    res = gotype.detect(ctx);
    if (res !== null) {
        let comment = gotype.generateComment(ctx, res);
        if (null !== comment) {
            // vscode.window.showInformationMessage(comment);
            replaceAnnotation(ctx, res, comment);
        }
        return;
    }
    res = govar.detect(ctx);
    if (res !== null) {
        let comment = govar.generateComment(ctx, res);
        if (null !== comment) {
            // vscode.window.showInformationMessage(comment);
            replaceAnnotation(ctx, res, comment);
        }
        return;
    }
}


function replaceAnnotation(ctx: Ctx, result: func.DetectResult, annotation: string) {
    let lines = ctx.content.split("\n");
    if (ctx.code.annotation.find) {
        if (ctx.code.annotation.startLine >= 1) {
            let upLineStart = fc.getLineStartOffset(lines, ctx.code.annotation.startLine - 1);
            let upLineEnd = fc.getLineEndOffset(lines, ctx.code.annotation.startLine - 1);
            let upCode = ctx.content.substring(upLineStart, upLineEnd);
            if (!RegExp("^\\s*$").test(upCode)) {
                annotation = "\n" + annotation;
            }
        }

        // let start = fc.getLineStartOffset(lines, ctx.code.annotation.startLine);
        // let end = fc.getLineEndOffset(lines, ctx.code.annotation.endLine);
        // replaceString(start, end, annotation);
        
        annotation = annotation.replace(/\r$/, '');

        ctx.editor.edit(editBuilder => {
            editBuilder.replace(new vscode.Range(
                new vscode.Position(ctx.code.annotation.startLine, 0),
                new vscode.Position(ctx.code.annotation.endLine, lines[ctx.code.annotation.endLine].length)), annotation);
        });
        return;
    }

    if (result.startLine >= 1) {
        let upLineStart = fc.getLineStartOffset(lines, result.startLine - 1);
        let upLineEnd = fc.getLineEndOffset(lines, result.startLine - 1);
        let upCode = ctx.content.substring(upLineStart, upLineEnd);
        if (!RegExp("^\\s*$").test(upCode)) {
            annotation = "\n\n" + annotation;
        } else if (result.startLine >= 2) {
            let upTwoLineStart = fc.getLineStartOffset(lines, result.startLine - 2);
            let upTwoLineEnd = fc.getLineEndOffset(lines, result.startLine - 2);
            upCode = ctx.content.substring(upTwoLineStart, upTwoLineEnd);
            if (!RegExp("^\\s*$").test(upCode)) {
                annotation = "\n" + annotation;
            } else {
                // document.replaceString(upLineStart, upLineEnd, "");
                ctx.editor.edit(editBuilder => {
                    editBuilder.replace(
                        new vscode.Range(new vscode.Position(result.startLine-1, 0),
                        new vscode.Position(result.startLine-1, lines[result.startLine-1].length)), annotation);
                });
            }
        }

        // let offset = fc.getLineEndOffset(lines, result.startLine - 1);
        // insertString(offset, finalAnnotation);
        ctx.editor.edit(editBuilder => {
            editBuilder.insert(
                new vscode.Position(result.startLine - 1, lines[result.startLine-1].length), annotation);
        });
    } else {
        let finalAnnotation = annotation + "\n";
        // document.insertString(0, finalAnnotation);
        ctx.editor.edit(editBuilder => {
            editBuilder.insert(
                new vscode.Position(0, 0), finalAnnotation);
        });
    }
}
