
function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    // Initialize the matrix
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1]; // No operation needed
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // Substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // Insertion
                        matrix[i - 1][j] + 1  // Deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

export function isSpellingError(word1: string, word2: string, threshold: number): boolean {
    const distance = levenshteinDistance(word1, word2);
    
    console.log(`distance ${distance} threshold ${threshold} word1:${word1} word2:${word2}`);
    return distance <= threshold;
}

export function isAutoSpellingError(word1: string, word2: string): boolean {

    let threshold = Math.min(word1.length, word2.length)

    if (threshold > 1) {
        // 先设定短字符的一半长度为编辑距离阈值
        threshold = threshold/ 2
    }

    // console.log(`auto threshold ${threshold}`);

    // 转换成小写
    return isSpellingError(word1.toLowerCase(), word2.toLowerCase(), threshold);
}


export function getFirstWord(str: string): string{

    // 注释开头
    const reg = /^\s*(\/\/|\/\*+)\s*/ 
    if (!RegExp(reg).test(str)) {
        return ""
    }

    str = str.replace(reg, '');

    let matcher = RegExp(/^\s*(\w+)\s*/).exec(str);

    if (matcher !== null) {

        let t = matcher[1];

        return t
    }

    return ""
}


// 示例用法
// const word1 = "example";
// const word2 = "exampel"; // 拼写错误
// const threshold = 1;

// if (isSpellingError(word1, word2, threshold)) {
//     console.log(`${word2} is a spelling error compared to ${word1}`);
// } else {
//     console.log(`${word2} is not a spelling error compared to ${word1}`);
// }

// test

// const word1 = "updateUserData";
// const word2 : string[] = ["updateUserD",
//                           "updateUserInfo",
//                            "updateData",
//                            "modifyUserData",
//                            "UsermodifyData",
//                            "UserupdateData",
//                            "UPDATEUSERDATA",
//                         ]; // 拼写错误

// word2.forEach(element => {
    
//     if (tool.isAutoSpellingError(word1, element)) {
//         console.log(`${element} is a spelling error compared to ${word1}`);
//     } else {
//         console.log(`-- ${element} is not a spelling error compared to ${word1}`);
//     }

// });

